import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { validatePayment } from '@/lib/sslcommerz';

/**
 * Payment Success Callback Handler
 * This route is called by SSLCommerz after a successful payment transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    const type = searchParams.get('type') || 'order';
    const redirectParam = searchParams.get('redirect') || 'checkout';
    const body = await req.formData();
    const data = Object.fromEntries(body.entries());

    if (!orderId) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    // Verify Payment with SSLCommerz using native fetch
    const response = await validatePayment(data);

    const origin = req.nextUrl.origin;

    if (response?.status === 'VALID' || response?.status === 'VALIDATED') {
      await connectToDatabase();
      
      if (type === 'bill') {
        const Bill = (await import('@/models/Bill')).default;

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        let invoiceNo = '';
        try {
          const bill = await Bill.findById(orderId).populate('showroom').session(dbSession);
          if (!bill) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
          }

          invoiceNo = bill.invoiceNo;

          // Validate transaction ID against persisted value on the bill
          const tranId = data.tran_id?.toString();
          if (!bill.transactionId || bill.transactionId !== tranId) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return NextResponse.json({ message: 'Transaction ID mismatch' }, { status: 400 });
          }

          // Idempotency: if already paid, short-circuit with success
          if (bill.status === 'Paid') {
            await dbSession.commitTransaction();
            dbSession.endSession();
            // Note: Since this is a webhook/callback, return redirect or success response
            const origin = req.nextUrl.origin;
            return NextResponse.redirect(`${origin}/bills/${bill.invoiceNo}?payment=success`, 303);
          }

          // Validate gateway amount and currency
          const gatewayAmount = parseFloat(response.amount);
          const gatewayCurrency = response.currency;
          
          // Use an appropriate monetary tolerance instead of strict floating-point equality
          const isAmountValid = !isNaN(gatewayAmount) && Math.abs(gatewayAmount - bill.currentBillDue) < 0.1;

          if (!isAmountValid || gatewayCurrency !== 'BDT') {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return NextResponse.json({ message: 'Payment validation failed: amount or currency mismatch' }, { status: 400 });
          }

          const prevCashInValue = bill.cashIn || 0;
          const paymentReceived = gatewayAmount;

          bill.status = 'Paid';
          bill.currentBillDue = 0;
          bill.cashIn = prevCashInValue + paymentReceived;
          bill.expectedReceivableDate = undefined;
          await bill.save({ session: dbSession });

          if (paymentReceived > 0 && bill.documentType === 'bill') {
            const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
            const showroom = bill.showroom as any;
            
            // Debit Cash by the payment amount
            await logLedgerTransaction(
              'CASH',
              'debit',
              paymentReceived,
              `Online Payment Received for Bill ${bill.invoiceNo} ${showroom ? `(${showroom.name})` : ''}`,
              bill.invoiceNo,
              new Date(),
              undefined,
              showroom ? showroom._id.toString() : undefined,
              dbSession
            );
            
            // Credit Accounts Receivable by the payment amount
            await logLedgerTransaction(
              'AR',
              'credit',
              paymentReceived,
              `Online Payment credit for Bill ${bill.invoiceNo} ${showroom ? `(${showroom.name})` : ''}`,
              bill.invoiceNo,
              new Date(),
              undefined,
              showroom ? showroom._id.toString() : undefined,
              dbSession
            );
          }

          await dbSession.commitTransaction();
          dbSession.endSession();
        } catch (err) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          throw err; // Propagate the error so the operation can be retried
        }

        return NextResponse.redirect(`${origin}/bills/${invoiceNo}?payment=success`, 303);
      } else {
        // Atomic update to mark as paid and sales-counted in one go
        // This prevents multiple SSLCommerz callbacks from double-counting sales
        const order = await Order.findOneAndUpdate(
          { _id: orderId, isSalesCounted: { $ne: true } },
          { 
            $set: { 
              paymentStatus: 'Paid', 
              status: 'Confirmed', 
              transactionId: data.tran_id?.toString(),
              isSalesCounted: true 
            } 
          },
          { new: true }
        );

        if (order) {
          // Success: This is the first time we're processing this payment
          try {
            const Product = (await import('@/models/Product')).default;
            for (const item of order.items) {
              await Product.updateOne(
                { _id: item.product },
                { $inc: { totalSales: item.quantity } }
              );
            }
          } catch (salesError) {
            console.error('Error updating totalSales on payment success:', salesError);
          }

          try {
            const { logOrderPaymentToLedger } = await import('@/lib/ledgerHelper');
            await logOrderPaymentToLedger(order);
          } catch (ledgerErr) {
            console.error('Error logging payment to ledger on success:', ledgerErr);
          }
        } else {
          // If findOneAndUpdate returns null, it means isSalesCounted was already true 
          // OR the order ID is invalid. Check if order exists for redirection.
          const existingOrder = await Order.findOne({ _id: orderId });
          if (!existingOrder) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
          }
        }

        if (redirectParam === 'public') {
          return NextResponse.redirect(`${origin}/orders/${orderId}?payment=success`, 303);
        } else {
          return NextResponse.redirect(`${origin}/checkout?order=success&id=${orderId}`, 303);
        }
      }
    } else {
      console.error('SSLCommerz Validation Failed:', response);
      if (type === 'bill') {
        const Bill = (await import('@/models/Bill')).default;
        const bill = await Bill.findById(orderId);
        if (bill) {
          return NextResponse.redirect(`${origin}/bills/${bill.invoiceNo}?payment=failed`, 303);
        }
      }
      if (redirectParam === 'public') {
        return NextResponse.redirect(`${origin}/orders/${orderId}?payment=failed`, 303);
      }
      return NextResponse.redirect(`${origin}/checkout?order=failed&id=${orderId}`, 303);
    }
  } catch (error) {
    console.error('Payment Success Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

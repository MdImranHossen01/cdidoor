import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import Bill from '@/models/Bill';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    if (bill.showroom?.toString() !== showroom._id.toString()) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(bill);
  } catch (error: any) {
    console.error('Error fetching showroom bill details:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    await connectToDatabase();

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (!showroom) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
      }

      const bill = await Bill.findById(id).session(dbSession);
      if (!bill) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
      }

      if (bill.showroom?.toString() !== showroom._id.toString()) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const prevCashInValue = bill.cashIn || 0;
      const prevGTotalValue = bill.gTotal || 0;

      // Update fields
      const {
        clientName,
        clientPhone,
        clientAddress,
        items,
        subtotal,
        deliveryCharge,
        serviceFee,
        discountType,
        discountValue,
        discount,
        total,
        prevDue,
        gTotal,
        cashIn,
        expectedReceivableDate,
        documentType,
        convertedFrom,
      } = body;

      const finalItems = items !== undefined ? items : bill.items;
      const validatedDeliveryCharge = Math.max(0, Number(deliveryCharge !== undefined ? deliveryCharge : bill.deliveryCharge) || 0);
      const validatedServiceFee = Math.max(0, Number(serviceFee !== undefined ? serviceFee : bill.serviceFee) || 0);
      const validatedDiscountValue = Math.max(0, Number(discountValue !== undefined ? discountValue : bill.discountValue) || 0);
      const validatedPrevDue = Math.max(0, Number(prevDue !== undefined ? prevDue : bill.prevDue) || 0);
      const validatedCashIn = Math.max(0, Number(cashIn !== undefined ? cashIn : bill.cashIn) || 0);
      const finalDiscountType = discountType !== undefined ? discountType : bill.discountType;

      let calculatedSubtotal = 0;
      const sanitizedItems = finalItems.map((item: any) => {
        const q = Math.max(1, parseInt(item.quantity) || 1);
        const p = Math.max(0, parseFloat(item.price) || 0);
        calculatedSubtotal += q * p;
        return {
          name: String(item.name),
          quantity: q,
          price: p,
          size: item.size ? String(item.size) : undefined,
          color: item.color ? String(item.color) : undefined,
        };
      });

      let calculatedDiscount = 0;
      if (finalDiscountType === 'percentage') {
        calculatedDiscount = Math.round((calculatedSubtotal * validatedDiscountValue) / 100);
      } else {
        calculatedDiscount = validatedDiscountValue;
      }
      calculatedDiscount = Math.max(0, calculatedDiscount);

      const calculatedTotal = Math.max(0, calculatedSubtotal + validatedDeliveryCharge + validatedServiceFee - calculatedDiscount);
      const calculatedGTotal = calculatedTotal + validatedPrevDue;
      const calculatedCurrentBillDue = Math.max(0, calculatedGTotal - validatedCashIn);
      const derivedStatus = Number(validatedCashIn) >= Number(calculatedGTotal) ? 'Paid' : 'Due';

      if (clientName !== undefined) bill.clientName = clientName;
      if (clientPhone !== undefined) bill.clientPhone = normalizePhoneNumber(clientPhone);
      if (clientAddress !== undefined) bill.clientAddress = clientAddress;
      bill.items = sanitizedItems;
      bill.subtotal = calculatedSubtotal;
      bill.deliveryCharge = validatedDeliveryCharge;
      bill.serviceFee = validatedServiceFee;
      bill.discountType = finalDiscountType;
      bill.discountValue = validatedDiscountValue;
      bill.discount = calculatedDiscount;
      bill.total = calculatedTotal;
      bill.prevDue = validatedPrevDue;
      
      bill.gTotal = calculatedGTotal;
      bill.cashIn = validatedCashIn;
      bill.status = derivedStatus;
      bill.currentBillDue = calculatedCurrentBillDue;

      if (derivedStatus === 'Paid') {
        bill.expectedReceivableDate = undefined;
      } else {
        if (expectedReceivableDate !== undefined) {
          bill.expectedReceivableDate = expectedReceivableDate ? new Date(expectedReceivableDate) : undefined;
        }
      }

      if (documentType !== undefined) bill.documentType = documentType;
      if (convertedFrom !== undefined) bill.convertedFrom = convertedFrom;

      await bill.save({ session: dbSession });

      // Log payment/AR updates to ledger if docType === 'bill'
      if (bill.documentType === 'bill') {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');

        // 1. Adjust Accounts Receivable if gTotal changed
        const gTotalDiff = calculatedGTotal - prevGTotalValue;
        if (gTotalDiff > 0) {
          await logLedgerTransaction(
            'AR',
            'debit',
            gTotalDiff,
            `Bill gTotal Increase Adjustment for ${bill.clientName} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
        } else if (gTotalDiff < 0) {
          await logLedgerTransaction(
            'AR',
            'credit',
            Math.abs(gTotalDiff),
            `Bill gTotal Decrease Adjustment for ${bill.clientName} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
        }

        // 2. Adjust CASH and AR if cashIn changed
        const paymentReceived = validatedCashIn - prevCashInValue;
        if (paymentReceived > 0) {
          await logLedgerTransaction(
            'CASH',
            'debit',
            paymentReceived,
            `Payment Received for Bill ${bill.invoiceNo} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
          await logLedgerTransaction(
            'AR',
            'credit',
            paymentReceived,
            `Payment credit for Bill ${bill.invoiceNo} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
        } else if (paymentReceived < 0) {
          const refundAmount = Math.abs(paymentReceived);
          await logLedgerTransaction(
            'CASH',
            'credit',
            refundAmount,
            `Payment Refund/Correction for Bill ${bill.invoiceNo} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
          await logLedgerTransaction(
            'AR',
            'debit',
            refundAmount,
            `Payment debit adjustment for Bill ${bill.invoiceNo} (${showroom.name})`,
            bill.invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
        }
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json(bill);
    } catch (err) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw err;
    }
  } catch (error: any) {
    console.error('Error updating showroom bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const bill = await Bill.findById(id).session(dbSession);
      if (!bill) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
      }

      if (bill.showroom?.toString() !== showroom._id.toString()) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      // Reversing every ledger transaction created for this bill
      if (bill.documentType === 'bill') {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
        const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;

        const originalTransactions = await LedgerTransaction.find({ reference: bill.invoiceNo })
          .populate('account')
          .session(dbSession);

        for (const tx of originalTransactions) {
          if (!tx.account || !(tx.account as any).code) continue;
          const accountCode = (tx.account as any).code;
          const reverseType = tx.type === 'debit' ? 'credit' : 'debit';
          await logLedgerTransaction(
            accountCode,
            reverseType,
            tx.amount,
            `Reversal of: ${tx.description} (Bill Deleted)`,
            `REV-${bill.invoiceNo}`,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
          
          tx.reference = `VOID-${bill.invoiceNo}`;
          await tx.save({ session: dbSession });
        }
      }

      await Bill.findByIdAndDelete(id).session(dbSession);

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({ message: 'Bill deleted successfully' });
    } catch (err) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw err;
    }
  } catch (error: any) {
    console.error('Error deleting showroom bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

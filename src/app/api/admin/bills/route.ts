import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'paid', 'due'
    const type = searchParams.get('type') || 'bill'; // 'offer', 'chalan', 'bill'
    const invoiceNo = searchParams.get('invoiceNo');
    const search = searchParams.get('search');
    
    await connectToDatabase();

    let query: any = {};
    if (type === 'bill') {
      query.$or = [{ documentType: 'bill' }, { documentType: { $exists: false } }];
    } else {
      query.documentType = type;
    }

    if (invoiceNo) {
      query.invoiceNo = invoiceNo;
    } else if (search) {
      query.invoiceNo = { $regex: search, $options: 'i' };
    }

    if (filter === 'paid') {
      query.status = 'Paid';
    } else if (filter === 'due') {
      query.status = 'Due';
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      clientDivision,
      clientDistrict,
      clientThana,
      clientArea,
      items,
      subtotal,
      deliveryCharge,
      serviceFee,
      discountType,
      discountValue,
      discount,
      couponCode,
      couponDiscount,
      walletAmountUsed,
      total,
      prevDue,
      gTotal,
      cashIn,
      changeReturn,
      currentBillDue,
      status,
      expectedReceivableDate,
      documentType,
      convertedFrom
    } = body;

    if (!clientName || !clientPhone || !items || items.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate unique sequential document number
    const docType = documentType || 'bill';
    const lastDoc = await Bill.findOne({ documentType: docType }).sort({ createdAt: -1 });
    
    let lastBillForFallback = null;
    if (!lastDoc && docType === 'bill') {
      lastBillForFallback = await Bill.findOne({ documentType: { $exists: false } }).sort({ createdAt: -1 });
    }
    const matchedDoc = lastDoc || lastBillForFallback;

    let nextNum = 101;
    if (matchedDoc && matchedDoc.invoiceNo) {
      const match = matchedDoc.invoiceNo.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }

    let prefix = 'INV-';
    if (docType === 'offer') prefix = 'OFF-';
    else if (docType === 'chalan') prefix = 'CH-';

    const invoiceNo = `${prefix}${String(nextNum).padStart(7, '0')}`;

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const newBill = new Bill({
        clientName,
        clientPhone: normalizePhoneNumber(clientPhone),
        clientAddress,
        clientEmail,
        clientDivision,
        clientDistrict,
        clientThana,
        clientArea,
        invoiceNo,
        items,
        subtotal,
        deliveryCharge,
        serviceFee: serviceFee || 0,
        discountType,
        discountValue,
        discount,
        couponCode: couponCode ? couponCode.toUpperCase() : undefined,
        couponDiscount: couponDiscount || 0,
        walletAmountUsed: walletAmountUsed || 0,
        total,
        prevDue,
        gTotal,
        cashIn,
        changeReturn: changeReturn || (cashIn > gTotal ? cashIn - gTotal : 0),
        currentBillDue,
        status,
        expectedReceivableDate: status === 'Due' && expectedReceivableDate ? new Date(expectedReceivableDate) : undefined,
        documentType: docType,
        convertedFrom: convertedFrom || undefined
      });

      // Deduct Stock if it's a bill
      if (docType === 'bill') {
        const Product = (await import('@/models/Product')).default;
        for (const item of items) {
          if (!item.productId) continue;
          const product = await Product.findById(item.productId).session(dbSession);
          if (!product) throw new Error(`Product not found: ${item.name}`);

          let remainingQty = item.quantity;
          const batchesUsed: { batchNumber: string; quantity: number }[] = [];

          const hasVariant = !!item.variantId;
          if (hasVariant) {
            const variant = product.variants?.find((v: any) => v._id.toString() === item.variantId);
            if (!variant) throw new Error(`Variant not found for: ${item.name}`);
            
            // Deduct variant batch stock
            let availableBatches = (variant.batches || []) || [];
            if (item.batchNumber && item.batchNumber !== 'auto') {
              const b = availableBatches.find((b: any) => b.batchNumber === item.batchNumber);
              if (b) {
                const qtyToTake = Math.min(b.stock, remainingQty);
                batchesUsed.push({ batchNumber: b.batchNumber, quantity: qtyToTake });
                remainingQty -= qtyToTake;
                b.stock -= qtyToTake;
              }
            } else {
              // FIFO
              const sortedBatches = [...availableBatches].sort((a, b) => {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
              });
              for (const batch of sortedBatches) {
                if (remainingQty <= 0) break;
                if (batch.stock > 0) {
                  const qtyToTake = Math.min(batch.stock, remainingQty);
                  batchesUsed.push({ batchNumber: batch.batchNumber, quantity: qtyToTake });
                  remainingQty -= qtyToTake;
                  const originalBatch = (variant.batches || []).find((b: any) => b.batchNumber === batch.batchNumber);
                  if (originalBatch) originalBatch.stock -= qtyToTake;
                }
              }
            }
            variant.stock -= item.quantity;
          } else {
            // Deduct base product batch stock
            let availableBatches = (product.batches || []) || [];
            if (item.batchNumber && item.batchNumber !== 'auto') {
              const b = availableBatches.find((b: any) => b.batchNumber === item.batchNumber);
              if (b) {
                const qtyToTake = Math.min(b.stock, remainingQty);
                batchesUsed.push({ batchNumber: b.batchNumber, quantity: qtyToTake });
                remainingQty -= qtyToTake;
                b.stock -= qtyToTake;
              }
            } else {
              // FIFO
              const sortedBatches = [...availableBatches].sort((a, b) => {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
              });
              for (const batch of sortedBatches) {
                if (remainingQty <= 0) break;
                if (batch.stock > 0) {
                  const qtyToTake = Math.min(batch.stock, remainingQty);
                  batchesUsed.push({ batchNumber: batch.batchNumber, quantity: qtyToTake });
                  remainingQty -= qtyToTake;
                  const originalBatch = (product.batches || []).find((b: any) => b.batchNumber === batch.batchNumber);
                  if (originalBatch) originalBatch.stock -= qtyToTake;
                }
              }
            }
            product.stock -= item.quantity;
          }
          item.batchesUsed = batchesUsed;

          await product.save({ session: dbSession });
        }
      }

      await newBill.save({ session: dbSession });

      // Deduct User Wallet Tokens if used
      if (docType === 'bill' && walletAmountUsed > 0) {
        try {
          const User = (await import('@/models/User')).default;
          const normalizedPhone = normalizePhoneNumber(clientPhone);
          const userDoc = await User.findOne({
            $or: [
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
              ...(clientEmail ? [{ email: clientEmail }] : [])
            ]
          }).session(dbSession);

          if (userDoc && (userDoc.walletBalance || 0) > 0) {
            const deductAmount = Math.min(userDoc.walletBalance, walletAmountUsed);
            userDoc.walletBalance = Math.max(0, userDoc.walletBalance - deductAmount);
            await userDoc.save({ session: dbSession });
          }
        } catch (walletErr) {
          console.error('Error deducting wallet balance in bill creation:', walletErr);
        }
      }

      // Increment Coupon usedCount if coupon code provided
      if (docType === 'bill' && couponCode) {
        try {
          const Coupon = (await import('@/models/Coupon')).default;
          await Coupon.findOneAndUpdate(
            { code: couponCode.toUpperCase() },
            { $inc: { usedCount: 1 } },
            { session: dbSession }
          );
        } catch (couponErr) {
          console.error('Error incrementing coupon usedCount:', couponErr);
        }
      }

    // Log to ledger if it is a final Bill (not offers/chalans)
    if (docType === 'bill') {
      try {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
        
        // Debit Accounts Receivable by the grand total of the bill
        await logLedgerTransaction(
          'AR',
          'debit',
          gTotal,
          `Bill Generated for ${clientName}`,
          invoiceNo,
          new Date(),
          undefined,
          undefined,
          dbSession
        );

        // If client paid any cash upfront
        if (cashIn > 0) {
          // Debit Cash (increases cash asset)
          await logLedgerTransaction(
            'CASH',
            'debit',
            cashIn,
            `Cash Paid Upfront for Bill ${invoiceNo}`,
            invoiceNo,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
          // Credit Accounts Receivable (decreases receivable asset)
          await logLedgerTransaction(
            'AR',
            'credit',
            cashIn,
            `Upfront payment credit for Bill ${invoiceNo}`,
            invoiceNo,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
        }
      } catch (err) {
        console.error('Error logging to ledger:', err);
      }
    }

      await dbSession.commitTransaction();
      dbSession.endSession();

      // Upsert customer info to User database
      try {
        const { upsertCustomer } = await import('@/lib/customerHelper');
        await upsertCustomer(
          clientName,
          clientPhone,
          clientAddress,
          clientEmail,
          clientDivision,
          clientDistrict,
          clientThana,
          clientArea
        );
      } catch (custErr) {
        console.error('Error upserting customer:', custErr);
      }

      return NextResponse.json(newBill, { status: 201 });
    } catch (transactionError: any) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import ProductReturn from '@/models/ProductReturn';
import Bill from '@/models/Bill';
import Product from '@/models/Product';
import { auth } from '@/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();
    const returns = await ProductReturn.find()
      .populate('bill', 'invoiceNo')
      .populate('processedBy', 'name')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(returns, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { billId, items, reason, refundAmount } = body;

    if (!billId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // 1. Verify Bill
      const bill = await Bill.findById(billId).session(dbSession);
      if (!bill) {
        throw new Error('Bill not found');
      }

      const returnId = `RET-${Date.now()}`;

      // 2. Process Items and Restock
      for (const returnItem of items) {
        const { productId, variantId, quantity, price, batchNumber } = returnItem;
        
        const product = await Product.findById(productId).session(dbSession);
        if (!product) throw new Error(`Product ${productId} not found`);

        if (variantId) {
          const variant = product.variants?.find((v: any) => v._id.toString() === variantId);
          if (variant) {
            variant.stock += quantity; // Restock central
            // Restock specific batch
            if (batchNumber && variant.batches) {
              const targetBatch = variant.batches.find((b: any) => b.batchNumber === batchNumber);
              if (targetBatch) {
                targetBatch.stock += quantity;
              }
            }
          }
        } else {
          product.stock += quantity; // Restock central
          if (batchNumber && product.batches) {
            const targetBatch = product.batches.find((b: any) => b.batchNumber === batchNumber);
            if (targetBatch) {
              targetBatch.stock += quantity;
            }
          }
        }
        await product.save({ session: dbSession });
      }

      // 3. Create ProductReturn record
      const newReturn = new ProductReturn({
        returnId,
        bill: bill._id,
        customerName: bill.clientName,
        phone: bill.clientPhone,
        showroom: bill.showroom,
        items: items.map((i: any) => ({
          product: i.productId,
          variantId: i.variantId,
          batchNumber: i.batchNumber,
          quantity: i.quantity,
          price: i.price
        })),
        reason,
        refundAmount: Number(refundAmount) || 0,
        processedBy: (session.user as any).id,
      });

      await newReturn.save({ session: dbSession });

      // 4. Accounting Entry (if refund is greater than 0)
      if (Number(refundAmount) > 0) {
        try {
          const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
          // Credit CASH (reducing cash)
          await logLedgerTransaction(
            'CASH',
            'credit',
            Number(refundAmount),
            `Refund for Return ${returnId} (Bill: ${bill.invoiceNo})`,
            returnId,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
        } catch (accError) {
          console.error("Accounting log error for return:", accError);
          // Non-fatal if accounting fails, though in strict ERP it should fail. We proceed.
        }
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json(newReturn, { status: 201 });
    } catch (transactionError: any) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error creating return:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

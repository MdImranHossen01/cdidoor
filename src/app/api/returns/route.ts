import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import ProductReturn from '@/models/ProductReturn';
import Bill from '@/models/Bill';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { auth } from '@/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || !session.user || !(['admin', 'super_admin', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();

    let query: any = {};
    if (userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (!showroom) {
        return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
      }
      query.showroom = showroom._id;
    }

    const returns = await ProductReturn.find(query)
      .populate('bill', 'invoiceNo')
      .populate('order', 'shortId')
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
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || !session.user || !(['admin', 'super_admin', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { billId, orderId, items, reason, refundAmount, refundAccount } = body;

    if ((!billId && !orderId) || !items || items.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      let bill = null;
      let order = null;
      let customerName = '';
      let phone = '';
      let showroom = null;
      let sourceNameForLedger = '';

      if (billId) {
        bill = await Bill.findById(billId).session(dbSession);
        if (!bill) {
          throw new Error('Bill not found');
        }
        customerName = bill.clientName;
        phone = bill.clientPhone;
        showroom = bill.showroom;
        sourceNameForLedger = `Bill: ${bill.invoiceNo}`;
      } else {
        order = await Order.findById(orderId).session(dbSession);
        if (!order) {
          throw new Error('Order not found');
        }
        if (order.status !== 'Delivered') {
          throw new Error(`Cannot return order with status "${order.status}". Only "Delivered" orders can be processed for product return. For undelivered orders, please cancel the order instead.`);
        }
        customerName = order.shippingAddress?.fullName;
        phone = order.shippingAddress?.phone;
        showroom = order.showroom;
        sourceNameForLedger = `Order: ${order.shortId}`;
      }

      if (userRole === 'showroom_manager') {
        const Showroom = (await import('@/models/Showroom')).default;
        const managerShowroom = await Showroom.findOne({ manager: userId }).lean();
        if (!managerShowroom) {
          throw new Error('No showroom assigned to this manager');
        }
        if (!showroom || showroom.toString() !== managerShowroom._id.toString()) {
          throw new Error('Unauthorized: Cannot process returns for other showrooms');
        }
      }

      const returnId = `RET-${Date.now()}`;

      // 2. Process Items and Restock
      for (const returnItem of items) {
        const { productId, variantId, color, size, quantity, price, batchNumber } = returnItem;
        
        const product = await Product.findById(productId).session(dbSession);
        if (!product) throw new Error(`Product ${productId} not found`);

        let resolvedVariantId = variantId;
        if (!resolvedVariantId && (color || size)) {
          const matchedVariant = product.variants?.find((v: any) => 
            String(v.color || '').trim().toLowerCase() === String(color || '').trim().toLowerCase() &&
            String(v.size || '').trim().toLowerCase() === String(size || '').trim().toLowerCase()
          );
          if (matchedVariant) {
            resolvedVariantId = matchedVariant._id.toString();
          }
        }

        if (resolvedVariantId) {
          const variant = product.variants?.find((v: any) => v._id.toString() === resolvedVariantId);
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
        bill: bill ? bill._id : undefined,
        order: order ? order._id : undefined,
        customerName,
        phone,
        showroom,
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
          const targetAccountCode = refundAccount || 'CASH';

          // Credit the selected account (reducing Cash or Bank)
          await logLedgerTransaction(
            targetAccountCode,
            'credit',
            Number(refundAmount),
            `Refund for Return ${returnId} (${sourceNameForLedger})`,
            returnId,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
        } catch (accError) {
          console.error("Accounting log error for return:", accError);
          // Non-fatal, proceed
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

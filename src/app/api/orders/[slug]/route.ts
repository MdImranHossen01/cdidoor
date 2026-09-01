/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import GlobalSettings from '@/models/GlobalSettings';
import WalletTransaction from '@/models/WalletTransaction';
import { auth } from '@/auth';
// GET single order details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    let query: any = {};
    if (mongoose.isValidObjectId(slug)) {
      query = { _id: slug };
    } else {
      query = { orderId: slug.startsWith('#') ? slug : `#${slug}` };
    }

    await connectToDatabase();
    const order = await Order.findOne(query)
      .populate('user', 'name email image')
      .populate('items.product', 'name price images slug');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Authorization: Must be an admin OR the owner of the order OR it is a guest order OR a showroom manager for this showroom
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const isAdmin = session?.user && ['admin', 'super_admin', 'manager'].includes(userRole);
    const isOwner = session?.user && order.user?._id?.toString() === userId;
    const isGuestOrder = !order.user;

    let isShowroomManagerForOrder = false;
    if (userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (showroom && order.showroom?.toString() === showroom._id.toString()) {
        isShowroomManagerForOrder = true;
      }
    }

    if (!isAdmin && !isOwner && !isGuestOrder && !isShowroomManagerForOrder) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH update order status (Admin & Showroom Manager)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    let {
      status,
      paymentStatus,
      shippingAddress,
      paymentMethod,
      transactionId,
      deliveryCharge,
      couponDiscountAmount,
      walletAmountUsed,
      items,
      internalNote
    } = body;

    const conn = await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(slug)) {
      return NextResponse.json({ message: 'Invalid order id' }, { status: 400 });
    }

    const dbSession = await conn.startSession();
    dbSession.startTransaction();

    try {
      // Fetch the order within the session
      const order = await Order.findOne({ _id: slug }).session(dbSession);

      if (!order) {
        await dbSession.abortTransaction();
        return NextResponse.json({ message: 'Order not found' }, { status: 404 });
      }

      if (userRole === 'showroom_manager') {
        const Showroom = (await import('@/models/Showroom')).default;
        const showroom = await Showroom.findOne({ manager: userId }).session(dbSession).lean();
        if (!showroom || order.showroom?.toString() !== showroom._id.toString()) {
          await dbSession.abortTransaction();
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        // Restrict showroom_manager: allow only status and internalNote
        paymentStatus = undefined;
        shippingAddress = undefined;
        paymentMethod = undefined;
        transactionId = undefined;
        deliveryCharge = undefined;
        couponDiscountAmount = undefined;
        walletAmountUsed = undefined;
        items = undefined;
      }

      const allowedStatuses = ['Order Placed', 'Confirmed', 'Paid', 'Ready for Delivery', 'Released for Delivery', 'Cancelled', 'Delivered'];
      const allowedPaymentStatuses = ['Pending', 'Paid', 'Failed'];

      const updateData: any = {};
      if (internalNote !== undefined) updateData.internalNote = internalNote;
      if (status) {
        if (!allowedStatuses.includes(status)) {
          await dbSession.abortTransaction();
          return NextResponse.json({
            message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
          }, { status: 400 });
        }
        updateData.status = status;
      }

      if (paymentStatus) {
        if (!allowedPaymentStatuses.includes(paymentStatus)) {
          await dbSession.abortTransaction();
          return NextResponse.json({
            message: `Invalid payment status. Allowed values: ${allowedPaymentStatuses.join(', ')}`
          }, { status: 400 });
        }
        updateData.paymentStatus = paymentStatus;
      }

      if (shippingAddress) {
        const currentAddr = order.shippingAddress && typeof (order.shippingAddress as any).toObject === 'function'
          ? (order.shippingAddress as any).toObject()
          : (order.shippingAddress || {});
        updateData.shippingAddress = {
          fullName: shippingAddress.fullName !== undefined ? shippingAddress.fullName : currentAddr.fullName,
          phone: shippingAddress.phone !== undefined ? shippingAddress.phone : currentAddr.phone,
          street: shippingAddress.street !== undefined ? shippingAddress.street : currentAddr.street,
          city: shippingAddress.city !== undefined ? shippingAddress.city : currentAddr.city,
          state: shippingAddress.state !== undefined ? shippingAddress.state : currentAddr.state,
          division: shippingAddress.division !== undefined ? shippingAddress.division : currentAddr.division,
          zipCode: shippingAddress.zipCode !== undefined ? shippingAddress.zipCode : currentAddr.zipCode,
          country: shippingAddress.country !== undefined ? shippingAddress.country : currentAddr.country,
        };
      }

      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (transactionId !== undefined) updateData.transactionId = transactionId;
      if (couponDiscountAmount !== undefined) updateData.couponDiscountAmount = Number(couponDiscountAmount) || 0;
      if (walletAmountUsed !== undefined) updateData.walletAmountUsed = Number(walletAmountUsed) || 0;

      if (deliveryCharge !== undefined) {
        updateData.deliveryCharge = Number(deliveryCharge) || 0;
      }

      if (items !== undefined && Array.isArray(items)) {
        updateData.items = items.map((item: any) => ({
          product: item.product?._id || item.product,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          color: item.color,
          size: item.size,
          image: item.image,
          purchasePrice: Number(item.purchasePrice) || 0
        }));
      }

      // Recalculate totalAmount if items or deliveryCharge are updated
      if (updateData.items !== undefined || updateData.deliveryCharge !== undefined) {
        const finalItems = updateData.items !== undefined ? updateData.items : order.items;
        const finalDeliveryCharge = updateData.deliveryCharge !== undefined ? updateData.deliveryCharge : (order.deliveryCharge || 0);
        
        const itemsTotal = finalItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        updateData.totalAmount = itemsTotal + finalDeliveryCharge;
      }

      // 1. Handle Automatic Stock Restocking / Deduction on Status Change
      if (status === 'Cancelled' && order.status !== 'Cancelled') {
        const { restockOrderItems } = await import('@/lib/orderStockHelper');
        await restockOrderItems(order, dbSession);
        updateData.isSalesCounted = false;
      } else if (order.status === 'Cancelled' && status && status !== 'Cancelled') {
        const { deductOrderItems } = await import('@/lib/orderStockHelper');
        await deductOrderItems(order, dbSession);
      }

      // 2. Handle Sales Counting logic (Atomic-like within transaction)
      const saleBecomingValid = ['Confirmed', 'Paid', 'Delivered'].includes(status || order.status);
      if (saleBecomingValid && !order.isSalesCounted && (status !== 'Cancelled')) {
        const Product = (await import('@/models/Product')).default;
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { totalSales: item.quantity } },
            { session: dbSession }
          );
        }
        updateData.isSalesCounted = true;
      }

      // 2. Loyalty System: Award Tokens on Success
      const isOrderSuccessful = (status || order.status) === 'Delivered';
      if (isOrderSuccessful && !order.isRewarded && order.user) {
        const user = await User.findOne({ _id: order.user }).session(dbSession);
        const settings = await GlobalSettings.findOne().session(dbSession);
        const subConfig = {
          activationThreshold: settings?.subscriptionConfig?.activationThreshold ?? 5000,
          rewardPercentage: settings?.subscriptionConfig?.rewardPercentage ?? 5
        };

        if (user) {
          if (!user.isSubscriptionActive && order.totalAmount >= subConfig.activationThreshold) {
            user.isSubscriptionActive = true;
            await user.save({ session: dbSession });
          }

          const rewardAmount = order.earnedRewardAmount || 0;
          if ((user.isSubscriptionActive || order.totalAmount >= subConfig.activationThreshold) && rewardAmount > 0) {
            user.walletBalance = (user.walletBalance || 0) + rewardAmount;
            await user.save({ session: dbSession });

            await WalletTransaction.create([{
              userId: user._id,
              amount: rewardAmount,
              type: 'earned',
              status: 'completed',
              orderId: order._id,
              description: `Tokens earned from order #${order._id.toString().slice(-6).toUpperCase()}`
            }], { session: dbSession });
          }
          updateData.isRewarded = true;
        }
      }

      // Ensure required fields exist for old data
      if (order.deliveryCharge === undefined || order.deliveryCharge === null) {
        updateData.deliveryCharge = 0;
      }

      // Final update
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: slug },
        { $set: updateData },
        { session: dbSession, new: true }
      );

      await dbSession.commitTransaction();

      // Log Accounts Receivable for Credit orders when they are confirmed
      const becameValidForAR = ['Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'].includes(updatedOrder?.status || '') && 
                               !['Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'].includes(order.status || '');
      
      if (becameValidForAR && (updatedOrder?.paymentMethod === 'Credit' || updatedOrder?.isCreditOrder)) {
        try {
          const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
          const amount = (updatedOrder.totalAmount || 0) - (updatedOrder.couponDiscountAmount || 0) - (updatedOrder.walletAmountUsed || 0);
          const shortId = updatedOrder._id.toString().slice(-8).toUpperCase();
          const arReference = `AR-ORDER-${shortId}`;
          
          const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
          const arExists = await LedgerTransaction.findOne({ reference: arReference });
          
          if (!arExists) {
            await logLedgerTransaction(
              'AR',
              'debit',
              amount,
              `Credit Order Confirmed #${shortId}`,
              arReference,
              new Date(),
              undefined,
              updatedOrder.showroom ? updatedOrder.showroom.toString() : undefined
            );
            console.log(`[Ledger] Logged AR debit for Order #${shortId} successfully.`);
          }
        } catch (err) {
          console.error('[Ledger] Error logging credit order to AR:', err);
        }
      }

      if (order.paymentStatus !== 'Paid' && updatedOrder?.paymentStatus === 'Paid') {
        try {
          const { logOrderPaymentToLedger } = await import('@/lib/ledgerHelper');
          await logOrderPaymentToLedger(updatedOrder);
        } catch (ledgerErr) {
          console.error('[Ledger] Error logging payment in single update:', ledgerErr);
        }
      }

      return NextResponse.json(updatedOrder);

    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE order (Admin Only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(slug)) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }

    await connectToDatabase();
    const orderToDelete = await Order.findById(slug);

    if (!orderToDelete) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (orderToDelete.status !== 'Cancelled') {
      const { restockOrderItems } = await import('@/lib/orderStockHelper');
      await restockOrderItems(orderToDelete);
    }

    await Order.findByIdAndDelete(slug);

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

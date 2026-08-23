import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import { logLedgerTransaction } from '@/lib/ledgerHelper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mongoose = (await import('mongoose')).default;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 });
    }

    await connectToDatabase();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const user = await User.findById(id).session(dbSession);
      if (!user || user.role !== 'wholesaler') {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Wholesaler not found' }, { status: 404 });
      }

      // Find all unpaid credit orders for this user, oldest first, excluding Cancelled status
      const orders = await Order.find({
        user: id,
        paymentMethod: 'Credit',
        paymentStatus: { $ne: 'Paid' },
        status: { $ne: 'Cancelled' },
        deletedAt: null
      }).sort({ createdAt: 1 }).session(dbSession);

      let remainingCash = paymentAmount;
      const updatedOrders = [];

      for (const order of orders) {
        if (remainingCash <= 0) break;

        const totalAmount = order.totalAmount || 0;
        const currentPaid = order.paidAmount || 0;
        const remainingDue = Math.max(0, totalAmount - currentPaid);

        if (remainingDue === 0) continue;

        if (remainingCash >= remainingDue) {
          order.paidAmount = totalAmount;
          order.paymentStatus = 'Paid';
          if (['Order Placed', 'Confirmed'].includes(order.status)) {
            order.status = 'Paid';
          }
          remainingCash -= remainingDue;
          await order.save({ session: dbSession });
          updatedOrders.push({ orderId: order._id, paidThisTime: remainingDue, fullyPaid: true });

          // Log to ledger
          const shortId = order._id.toString().slice(-8).toUpperCase();
          await logLedgerTransaction(
            'CASH',
            'debit',
            remainingDue,
            `Credit Payment Received for Order #${shortId}`,
            `ORDER-${shortId}`,
            undefined,
            undefined,
            undefined,
            dbSession
          );
          await logLedgerTransaction(
            'AR',
            'credit',
            remainingDue,
            `Credit Payment Applied for Order #${shortId}`,
            `ORDER-${shortId}`,
            undefined,
            undefined,
            undefined,
            dbSession
          );
        } else {
          order.paidAmount = currentPaid + remainingCash;
          await order.save({ session: dbSession });
          updatedOrders.push({ orderId: order._id, paidThisTime: remainingCash, fullyPaid: false });

          // Log to ledger
          const shortId = order._id.toString().slice(-8).toUpperCase();
          await logLedgerTransaction(
            'CASH',
            'debit',
            remainingCash,
            `Partial Credit Payment Received for Order #${shortId}`,
            `ORDER-${shortId}`,
            undefined,
            undefined,
            undefined,
            dbSession
          );
          await logLedgerTransaction(
            'AR',
            'credit',
            remainingCash,
            `Partial Credit Payment Applied for Order #${shortId}`,
            `ORDER-${shortId}`,
            undefined,
            undefined,
            undefined,
            dbSession
          );
          remainingCash = 0;
        }
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({
        message: 'Cash collected and applied successfully',
        paymentAmount,
        changeReturned: remainingCash,
        updatedOrders
      });
    } catch (transactionError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Collect Cash Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

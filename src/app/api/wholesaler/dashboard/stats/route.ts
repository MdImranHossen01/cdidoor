/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'wholesaler') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total orders
    const totalOrders = await Order.countDocuments({ user: userId, deletedAt: null });

    // Pending orders - using correct enum values from Order model
    const pendingOrders = await Order.countDocuments({
      user: userId,
      status: { $in: ['Order Placed', 'Confirmed', 'Ready for Delivery', 'Released for Delivery'] as const },
      deletedAt: null,
    });

    // All orders for spend calculation
    const allOrders = await Order.find({ user: userId, deletedAt: null })
      .select('totalAmount status createdAt shortId')
      .lean() as any[];
    const totalSpent = allOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    // This month's spend
    const monthOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= startOfMonth);
    const monthSpent = monthOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    // Recent orders
    const recentOrders = await Order.find({ user: userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('shortId totalAmount status createdAt items')
      .lean();

    // Calculate total credit due (Account Payable)
    const creditOrders = await Order.find({
      user: userId,
      paymentMethod: 'Credit',
      paymentStatus: { $ne: 'Paid' },
      status: { $nin: ['Cancelled', 'Order Placed'] },
      deletedAt: null
    }).select('totalAmount couponDiscountAmount walletAmountUsed');
    const totalDue = creditOrders.reduce((sum: number, o: any) => {
      const netPayable = (o.totalAmount || 0) - (o.couponDiscountAmount || 0) - (o.walletAmountUsed || 0);
      return sum + netPayable;
    }, 0);

    return NextResponse.json({
      stats: {
        totalOrders,
        pendingOrders,
        totalSpent,
        monthSpent,
        totalDue,
      },
      recentOrders,
    });
  } catch (error: any) {
    console.error('Wholesaler Dashboard Stats Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

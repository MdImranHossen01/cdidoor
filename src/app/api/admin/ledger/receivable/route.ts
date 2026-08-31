import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const todayDate = new Date();

    // 1. Fetch Bills where currentBillDue > 0
    const bills = await Bill.find({ currentBillDue: { $gt: 0 } }).lean() as any[];

    // 2. Fetch Orders where isCreditOrder is true, paymentStatus is not 'Paid', status is not 'Cancelled'
    const orders = await Order.find({
      isCreditOrder: true,
      paymentStatus: { $ne: 'Paid' },
      status: { $ne: 'Cancelled' }
    }).populate('user', 'name email phone').lean() as any[];

    // Group General Customers by clientPhone
    const generalMap = new Map<string, any>();
    for (const b of bills) {
      if (!b.clientPhone) continue;
      const phone = b.clientPhone.trim();
      const isMatured = b.expectedReceivableDate && new Date(b.expectedReceivableDate) < todayDate;
      const due = b.currentBillDue || 0;
      
      const existing = generalMap.get(phone);
      if (existing) {
        existing.totalDue += due;
        if (isMatured) existing.maturedDue += due;
        existing.billsCount += 1;
      } else {
        generalMap.set(phone, {
          name: b.clientName || 'General Customer',
          phone: phone,
          totalDue: due,
          maturedDue: isMatured ? due : 0,
          billsCount: 1
        });
      }
    }

    // Group Wholesale Customers by user (wholesaler) ID or phone
    const wholesaleMap = new Map<string, any>();
    for (const o of orders) {
      const user = o.user;
      const phone = o.shippingAddress?.phone || o.clientPhone || user?.phone;
      const key = user?._id?.toString() || phone || 'unknown';
      
      const orderDue = o.totalAmount - (o.couponDiscountAmount || 0) - (o.walletAmountUsed || 0) - (o.paidAmount || 0);
      if (orderDue <= 0) continue;

      const isMatured = o.expectedPaymentDate && new Date(o.expectedPaymentDate) < todayDate;
      
      const existing = wholesaleMap.get(key);
      if (existing) {
        existing.totalDue += orderDue;
        if (isMatured) existing.maturedDue += orderDue;
        existing.ordersCount += 1;
      } else {
        wholesaleMap.set(key, {
          userId: user?._id?.toString() || null,
          name: user?.name || o.shippingAddress?.fullName || o.clientName || 'Wholesaler Customer',
          phone: phone || user?.phone || 'N/A',
          email: user?.email || 'N/A',
          totalDue: orderDue,
          maturedDue: isMatured ? orderDue : 0,
          ordersCount: 1
        });
      }
    }

    const wholesaleCustomers = Array.from(wholesaleMap.values()).sort((a, b) => b.totalDue - a.totalDue);
    const generalCustomers = Array.from(generalMap.values()).sort((a, b) => b.totalDue - a.totalDue);

    return NextResponse.json({ wholesaleCustomers, generalCustomers });
  } catch (error: any) {
    console.error('API GET Receivable Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

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

    // 1. Fetch Bills where currentBillDue > 0
    const bills = await Bill.find({ currentBillDue: { $gt: 0 } }).lean() as any[];

    // 2. Fetch Orders where paymentStatus is not 'Paid' and status is not 'Cancelled'
    const orders = await Order.find({ 
      paymentStatus: { $ne: 'Paid' },
      status: { $ne: 'Cancelled' }
    }).populate('user').lean() as any[];

    // Map to aggregate dues by customer phone/name
    const customerMap = new Map<string, { name: string; phone: string; due: number }>();

    // Process Bills
    for (const b of bills) {
      if (!b.clientPhone) continue;
      const phone = b.clientPhone.trim();
      const existing = customerMap.get(phone);
      if (existing) {
        existing.due += (b.currentBillDue || 0);
      } else {
        customerMap.set(phone, {
          name: b.clientName,
          phone: phone,
          due: b.currentBillDue || 0
        });
      }
    }

    // Process Orders
    for (const o of orders) {
      const name = o.shippingAddress?.fullName || o.clientName || o.user?.name || 'Unknown';
      const phone = o.shippingAddress?.phone || o.clientPhone || o.user?.phone;
      if (!phone) continue;
      const trimmedPhone = phone.trim();
      
      const orderDue = o.totalAmount - (o.paidAmount || 0);
      if (orderDue <= 0) continue;

      const existing = customerMap.get(trimmedPhone);
      if (existing) {
        existing.due += orderDue;
      } else {
        customerMap.set(trimmedPhone, {
          name: name,
          phone: trimmedPhone,
          due: orderDue
        });
      }
    }

    // Convert map to list and filter out any with 0 or negative due
    const customers = Array.from(customerMap.values())
      .filter(c => c.due > 0)
      .sort((a, b) => b.due - a.due); // sort by highest due

    return NextResponse.json({ customers }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Due Customers Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

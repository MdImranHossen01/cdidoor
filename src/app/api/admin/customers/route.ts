import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Bill from '@/models/Bill';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    if (!session || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    let showroomId = undefined;
    if (userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (showroom) {
        showroomId = showroom._id;
      }
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    await connectToDatabase();

    // 1. Search in User database (role: user or wholesaler)
    const userQuery: any = {
      role: { $in: ['user', 'wholesaler'] }
    };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(userQuery).limit(20).lean() as any[];

    const customers = users.map((u) => {
      const defAddress = u.addresses?.find((a: any) => a.isDefault) || u.addresses?.[0] || {};
      const item: any = {
        clientName: u.name,
        clientPhone: u.phone || '',
        clientAddress: defAddress.street || '',
        clientDivision: defAddress.division || '',
        clientDistrict: defAddress.district || '',
        clientThana: defAddress.thana || '',
        clientArea: defAddress.area || '',
        walletBalance: u.walletBalance || 0,
        role: u.role || 'user',
      };
      if (userRole !== 'showroom_manager') {
        item.clientEmail = u.email || '';
      }
      return item;
    });

    // 2. Search in Bill database for walk-in client invoices
    const billQuery: any = {};
    if (userRole === 'showroom_manager' && showroomId) {
      billQuery.showroom = showroomId;
    }
    if (search) {
      billQuery.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { clientPhone: { $regex: search, $options: 'i' } }
      ];
    }
    const bills = await Bill.find(billQuery).sort({ createdAt: -1 }).limit(30).lean() as any[];

    // 3. Merge results uniquely by phone number
    const seenPhones = new Set<string>();
    const merged: any[] = [];

    customers.forEach((c) => {
      if (c.clientPhone) {
        seenPhones.add(c.clientPhone);
      }
      merged.push(c);
    });

    bills.forEach((b) => {
      if (b.clientPhone && !seenPhones.has(b.clientPhone)) {
        seenPhones.add(b.clientPhone);
        const item: any = {
          clientName: b.clientName,
          clientPhone: b.clientPhone,
          clientAddress: b.clientAddress || '',
          clientDivision: b.clientDivision || '',
          clientDistrict: b.clientDistrict || '',
          clientThana: b.clientThana || '',
          clientArea: b.clientArea || '',
          walletBalance: 0,
        };
        if (userRole !== 'showroom_manager') {
          item.clientEmail = b.clientEmail || '';
        }
        merged.push(item);
      }
    });

    const topList = merged.slice(0, 15);
    const phoneList = topList.map(m => m.clientPhone).filter(Boolean);

    // Compute order and bill statistics
    const [orderAgg, billAgg] = await Promise.all([
      phoneList.length > 0 ? Order.aggregate([
        { $match: { 'shippingAddress.phone': { $in: phoneList } } },
        {
          $group: {
            _id: '$shippingAddress.phone',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' }
          }
        }
      ]) : [],
      phoneList.length > 0 ? Bill.aggregate([
        { $match: { clientPhone: { $in: phoneList } } },
        {
          $group: {
            _id: '$clientPhone',
            totalBills: { $sum: 1 },
            totalBilled: { $sum: '$gTotal' },
            totalDue: { $sum: '$currentBillDue' }
          }
        }
      ]) : []
    ]);

    const orderMap: Record<string, any> = {};
    orderAgg.forEach((o: any) => {
      orderMap[o._id] = o;
    });

    const billMap: Record<string, any> = {};
    billAgg.forEach((b: any) => {
      billMap[b._id] = b;
    });

    const enriched = topList.map(c => {
      const o = orderMap[c.clientPhone] || {};
      const b = billMap[c.clientPhone] || {};
      return {
        ...c,
        totalOrders: (o.totalOrders || 0) + (b.totalBills || 0),
        totalSpent: (o.totalSpent || 0) + (b.totalBilled || 0),
        totalDue: b.totalDue || 0,
      };
    });

    return NextResponse.json({ customers: enriched });
  } catch (error: any) {
    console.error('Search Customers Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

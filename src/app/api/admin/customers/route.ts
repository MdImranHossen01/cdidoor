import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Bill from '@/models/Bill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
      return {
        clientName: u.name,
        clientPhone: u.phone || '',
        clientAddress: defAddress.street || '',
        clientEmail: u.email || '',
        clientDivision: defAddress.division || '',
        clientDistrict: defAddress.district || '',
        clientThana: defAddress.thana || '',
        clientArea: defAddress.area || '',
        walletBalance: u.walletBalance || 0
      };
    });

    // 2. Search in Bill database for walk-in client invoices
    const billQuery: any = {};
    if (search) {
      billQuery.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { clientPhone: { $regex: search, $options: 'i' } }
      ];
    }
    const bills = await Bill.find(billQuery).sort({ createdAt: -1 }).limit(30).lean() as any[];

    // 3. Merge results uniquely by phone number
    const seenPhones = new Set<string>();
    const merged: {
      clientName: string;
      clientPhone: string;
      clientAddress: string;
      clientEmail?: string;
      clientDivision?: string;
      clientDistrict?: string;
      clientThana?: string;
      clientArea?: string;
      walletBalance?: number;
    }[] = [];

    customers.forEach((c) => {
      if (c.clientPhone) {
        seenPhones.add(c.clientPhone);
      }
      merged.push(c);
    });

    bills.forEach((b) => {
      if (b.clientPhone && !seenPhones.has(b.clientPhone)) {
        seenPhones.add(b.clientPhone);
        merged.push({
          clientName: b.clientName,
          clientPhone: b.clientPhone,
          clientAddress: b.clientAddress || '',
          clientEmail: b.clientEmail || '',
          clientDivision: b.clientDivision || '',
          clientDistrict: b.clientDistrict || '',
          clientThana: b.clientThana || '',
          clientArea: b.clientArea || '',
          walletBalance: 0
        });
      }
    });

    return NextResponse.json({ customers: merged.slice(0, 15) });
  } catch (error: any) {
    console.error('Search Customers Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

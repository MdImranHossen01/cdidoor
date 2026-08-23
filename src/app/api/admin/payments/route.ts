import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Payment from '@/models/Payment';
import User from '@/models/User'; // needed to populate

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1'));
      const limit = Math.max(1, parseInt(limitParam || '10'));
      const skip = (page - 1) * limit;

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .populate('user', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments(filter)
      ]);

      return NextResponse.json({
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Find and populate user details (name, email)
    const payments = await Payment.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

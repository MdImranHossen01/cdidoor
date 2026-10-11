import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import DeletedBill from '@/models/DeletedBill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || '';
    const search = url.searchParams.get('search') || '';

    let query: any = {};

    if (search) {
      query.invoiceNo = { $regex: search, $options: 'i' };
    }

    // Default sorting to newest first
    const logs = await DeletedBill.find(query).sort({ deletedAt: -1 }).lean();

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching deleted bills:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

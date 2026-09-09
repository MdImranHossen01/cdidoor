import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const invoiceNo  = searchParams.get('invoiceNo') || '';
    const supplierId = searchParams.get('supplier')  || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = {};
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    if (invoiceNo)  match.billNo    = { $regex: escapeRegex(invoiceNo), $options: 'i' };
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      match.supplier = new mongoose.Types.ObjectId(supplierId);
    }

    const [total, docs] = await Promise.all([
      SupplierBill.countDocuments(match),
      SupplierBill.find(match)
        .populate('supplier', 'name phone companyName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({ total, page, limit, data: docs });
  } catch (err: any) {
    console.error('[report/purchases]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

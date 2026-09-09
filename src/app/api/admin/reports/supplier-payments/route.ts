import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import { parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const search     = searchParams.get('search') || '';
    const supplierId = searchParams.get('supplier') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    // Use paidAmount > 0 bills as "supplier payments"
    const match: Record<string, any> = { paidAmount: { $gt: 0 } };
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      match.supplier = new mongoose.Types.ObjectId(supplierId);
    }
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;

    const [countResult, docs, sumResult] = await Promise.all([
      SupplierBill.countDocuments(match),
      SupplierBill.find(match)
        .populate('supplier', 'name phone companyName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupplierBill.aggregate([
        { $match: match },
        { $group: { _id: null, totalAmount: { $sum: '$paidAmount' } } },
      ]),
    ]);

    let filteredDocs = docs;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredDocs = docs.filter((d: any) => {
        const s = d.supplier;
        return (
          s?.name?.toLowerCase().includes(lowerSearch) ||
          s?.phone?.toLowerCase().includes(lowerSearch) ||
          s?.companyName?.toLowerCase().includes(lowerSearch)
        );
      });
    }

    const data = filteredDocs.map((d: any) => ({
      _id:     d._id,
      date:    d.date,
      supplier: {
        name:    d.supplier?.name    ?? '',
        phone:   d.supplier?.phone   ?? '',
        company: d.supplier?.companyName ?? '',
      },
      amount:  d.paidAmount ?? 0,
      account: d.paymentMethod ?? 'Cash',
      note:    'Due payment',
    }));

    return NextResponse.json({
      total: countResult,
      grandTotal: sumResult[0]?.totalAmount ?? 0,
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/supplier-payments]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

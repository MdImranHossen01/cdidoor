import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import LedgerTransaction from '@/models/LedgerTransaction';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const search     = searchParams.get('customer') || '';
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = {
      type: 'debit',
      description: { $regex: /sale|invoice|payment|received/i },
    };
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }
    if (search) match.reference = { $regex: escapeRegex(search), $options: 'i' };

    const [countResult, docs, sumResult] = await Promise.all([
      LedgerTransaction.countDocuments(match),
      LedgerTransaction.find(match)
        .populate('account', 'name code accountCategory')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LedgerTransaction.aggregate([
        { $match: match },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const data = docs.map((d: any) => ({
      _id:      d._id,
      date:     d.date,
      customer: d.reference ?? 'Walk-in-customer',
      amount:   d.amount,
      account:  (d.account as any)?.name ?? 'Cash',
      note:     d.description,
    }));

    return NextResponse.json({
      total: countResult,
      grandTotal: sumResult[0]?.totalAmount ?? 0,
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/customer-payments]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const search     = searchParams.get('search') || '';
    const category   = searchParams.get('category') || '';
    const staffId    = searchParams.get('staff')    || '';
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { type: 'expense' };
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    if (category) match.category = category;
    if (staffId)  match.employee = staffId;
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }
    if (search) {
      const escaped = escapeRegex(search);
      match.$or = [
        { category:    { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [total, docs, sumResult] = await Promise.all([
      Expense.countDocuments(match),
      Expense.find(match)
        .populate('employee', 'name phone')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const data = docs.map((d: any) => ({
      _id:       d._id,
      date:      d.date,
      category:  d.category,
      staff:     (d.employee as any)?.name ?? '',
      amount:    d.amount,
      note:      d.description ?? '',
      accountCode: d.accountCode,
    }));

    return NextResponse.json({
      total,
      grandTotal: sumResult[0]?.totalAmount ?? 0,
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/expenses]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const search     = searchParams.get('search') || searchParams.get('invoiceNo') || '';
    const customerId = searchParams.get('customer') || '';
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { documentType: 'bill' };
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }
    if (search) {
      const escaped = escapeRegex(search);
      match.$or = [
        { invoiceNo:   { $regex: escaped, $options: 'i' } },
        { clientName:  { $regex: escaped, $options: 'i' } },
        { clientPhone: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (customerId) match.clientPhone = { $regex: escapeRegex(customerId), $options: 'i' };

    const [total, docs, totalsResult] = await Promise.all([
      Bill.countDocuments(match),
      Bill.find(match, 'invoiceNo date clientName clientPhone total deliveryCharge cashIn currentBillDue status createdAt')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bill.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            totalPaid:  { $sum: '$cashIn' },
            totalDue:   { $sum: '$currentBillDue' },
            totalDelivery: { $sum: '$deliveryCharge' },
          },
        },
      ]),
    ]);

    const data = docs.map((d: any) => ({
      ...d,
      netSales: (d.total ?? 0) - (d.deliveryCharge ?? 0),
      paid:     d.cashIn ?? 0,
      due:      d.currentBillDue ?? 0,
    }));

    const summary = totalsResult[0] ?? { totalSales: 0, totalPaid: 0, totalDue: 0, totalDelivery: 0 };

    return NextResponse.json({
      total,
      page,
      limit,
      grandTotals: {
        sales: summary.totalSales,
        netSales: summary.totalSales - summary.totalDelivery,
        paid: summary.totalPaid,
        due: summary.totalDue,
        delivery: summary.totalDelivery,
      },
      data,
    });
  } catch (err: any) {
    console.error('[report/sales]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

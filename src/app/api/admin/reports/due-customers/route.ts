import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import { escapeRegex, parsePagination } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search     = searchParams.get('search') || '';
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { documentType: 'bill', currentBillDue: { $gt: 0 } };
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }
    if (search) {
      const escaped = escapeRegex(search);
      match.$or = [
        { clientName:  { $regex: escaped, $options: 'i' } },
        { clientPhone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: {
            $cond: [
              {
                $and: [
                  { $ne: ['$clientPhone', null] },
                  { $ne: ['$clientPhone', ''] },
                ],
              },
              '$clientPhone',
              '$_id',
            ],
          },
          name:      { $first: '$clientName' },
          phone:     { $first: '$clientPhone' },
          totalDue:  { $sum: '$currentBillDue' },
        },
      },
      { $match: { totalDue: { $gt: 0 } } },
      { $sort: { totalDue: -1 } },
    ];

    const [countResult, docs, grandTotalResult] = await Promise.all([
      Bill.aggregate([...pipeline, { $count: 'total' }]),
      Bill.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Bill.aggregate([
        { $match: match },
        { $group: { _id: null, grandTotal: { $sum: '$currentBillDue' } } },
      ]),
    ]);

    return NextResponse.json({
      total: countResult[0]?.total ?? 0,
      grandTotal: grandTotalResult[0]?.grandTotal ?? 0,
      page,
      limit,
      data: docs,
    });
  } catch (err: any) {
    console.error('[report/due-customers]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

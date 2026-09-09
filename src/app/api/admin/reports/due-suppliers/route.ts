import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import { escapeRegex, parsePagination } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const pipeline: any[] = [
      { $match: { dueAmount: { $gt: 0 } } },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierData',
        },
      },
      { $unwind: { path: '$supplierData', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const escaped = escapeRegex(search);
      pipeline.push({
        $match: {
          $or: [
            { 'supplierData.name':        { $regex: escaped, $options: 'i' } },
            { 'supplierData.phone':       { $regex: escaped, $options: 'i' } },
            { 'supplierData.companyName': { $regex: escaped, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id:     '$supplier',
          name:    { $first: { $ifNull: ['$supplierData.name', 'Unknown Supplier'] } },
          phone:   { $first: { $ifNull: ['$supplierData.phone', ''] } },
          company: { $first: { $ifNull: ['$supplierData.companyName', ''] } },
          totalDue:{ $sum: '$dueAmount' },
        },
      },
      { $match: { totalDue: { $gt: 0 } } },
      { $sort:  { totalDue: -1 } },
    );

    const grandTotalPipeline = [
      ...pipeline,
      {
        $group: {
          _id: null,
          grandTotal: { $sum: '$totalDue' },
        },
      },
    ];

    const [countResult, totalAggResult, docs] = await Promise.all([
      SupplierBill.aggregate([...pipeline, { $count: 'total' }]),
      SupplierBill.aggregate(grandTotalPipeline),
      SupplierBill.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    ]);

    const grandTotal = totalAggResult[0]?.grandTotal ?? 0;

    return NextResponse.json({
      total: countResult[0]?.total ?? 0,
      page, limit,
      grandTotal,
      data: docs,
    });
  } catch (err: any) {
    console.error('[report/due-suppliers]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

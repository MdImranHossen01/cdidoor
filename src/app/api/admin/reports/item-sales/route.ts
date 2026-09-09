import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { escapeRegex, parsePagination } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search     = searchParams.get('search')   || '';
    const sort       = searchParams.get('sort')     || 'desc'; // 'desc'=top, 'asc'=low
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const productMatch: Record<string, any> = {};
    if (search) {
      const escaped = escapeRegex(search);
      productMatch.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { sku:  { $regex: escaped, $options: 'i' } },
      ];
    }

    const billMatch: Record<string, any> = { documentType: 'bill' };
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      billMatch.showroom = new mongoose.Types.ObjectId(showroomId);
    }

    const pipeline: any[] = [
      ...(Object.keys(productMatch).length ? [{ $match: productMatch }] : []),
      {
        $lookup: {
          from: 'bills',
          let: { prodId: '$_id' },
          pipeline: [
            { $match: billMatch },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productId',
                soldQty: { $sum: '$items.quantity' },
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$prodId'],
                },
              },
            },
          ],
          as: 'salesData',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          barcode: { $ifNull: ['$sku', '-'] },
          soldQty: {
            $ifNull: [{ $arrayElemAt: ['$salesData.soldQty', 0] }, 0],
          },
        },
      },
      { $sort: { soldQty: sort === 'asc' ? 1 : -1, name: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [total, docs] = await Promise.all([
      Product.countDocuments(productMatch),
      Product.aggregate(pipeline),
    ]);

    return NextResponse.json({ total, page, limit, data: docs });
  } catch (err: any) {
    console.error('[report/item-sales]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

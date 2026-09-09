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
    const category   = searchParams.get('category') || '';
    const brand      = searchParams.get('brand')    || '';
    const showroomId = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { isPublished: true };
    if (search) {
      const escaped = escapeRegex(search);
      match.$or = [{ name: { $regex: escaped, $options: 'i' } }, { sku: { $regex: escaped, $options: 'i' } }];
    }
    if (category) match.categories = category;
    if (brand)    match.brand       = brand;

    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      const sId = new mongoose.Types.ObjectId(showroomId);
      // Aggregation for showroom-specific stock
      const pipeline: any[] = [
        { $match: match },
        {
          $addFields: {
            matchingShowroomStock: {
              $filter: {
                input: { $ifNull: ['$showroomStocks', []] },
                as: 'ss',
                cond: { $eq: ['$$ss.showroom', sId] },
              },
            },
          },
        },
        {
          $addFields: {
            effectiveStock: {
              $ifNull: [{ $arrayElemAt: ['$matchingShowroomStock.stock', 0] }, 0],
            },
          },
        },
        { $match: { effectiveStock: { $lte: 10 } } },
        {
          $lookup: {
            from: 'categories',
            localField: 'categories',
            foreignField: '_id',
            as: 'categoryDocs',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            barcode: { $ifNull: ['$sku', '-'] },
            category: { $ifNull: [{ $arrayElemAt: ['$categoryDocs.name', 0] }, ''] },
            stock: '$effectiveStock',
            unit: { $literal: 'pcs' },
          },
        },
        { $sort: { stock: 1, name: 1 } },
      ];

      const [countResult, docs] = await Promise.all([
        Product.aggregate([...pipeline, { $count: 'total' }]),
        Product.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      ]);

      return NextResponse.json({ total: countResult[0]?.total ?? 0, page, limit, data: docs });
    }

    match.stock = { $lte: 10 };
    const [total, docs] = await Promise.all([
      Product.countDocuments(match),
      Product.find(match, 'name sku stock categories brand')
        .populate('categories', 'name')
        .populate('brand', 'name')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = docs.map((p: any) => ({
      _id:      p._id,
      name:     p.name,
      barcode:  p.sku,
      category: p.categories?.[0]?.name ?? '',
      stock:    p.stock,
      unit:     'pcs',
    }));

    return NextResponse.json({ total, page, limit, data });
  } catch (err: any) {
    console.error('[report/stock-alert]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
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

    const billMatch: Record<string, any> = { documentType: 'bill' };
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      billMatch.showroom = new mongoose.Types.ObjectId(showroomId);
    }

    const pipeline: any[] = [
      { $match: billMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ];

    // Search / category / brand filters via product
    const productMatch: Record<string, any> = {};
    if (search) productMatch['product.name'] = { $regex: escapeRegex(search), $options: 'i' };
    if (category) productMatch['product.categories'] = category;
    if (brand)    productMatch['product.brand']       = brand;
    if (Object.keys(productMatch).length) pipeline.push({ $match: productMatch });

    pipeline.push(
      {
        $group: {
          _id: '$items.productId',
          name:          { $first: { $ifNull: ['$product.name', '$items.name'] } },
          barcode:       { $first: '$product.sku' },
          category:      { $first: { $arrayElemAt: ['$product.categories', 0] } },
          soldQty:       { $sum: '$items.quantity' },
          saleRevenue:   { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          purchaseCost:  { $sum: { $multiply: [{ $ifNull: ['$items.purchasePrice', { $ifNull: ['$product.purchasePrice', 0] }] }, '$items.quantity'] } },
        },
      },
      { $sort: { soldQty: -1, _id: 1 } },
    );

    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult, docs, totalsResult] = await Promise.all([
      Bill.aggregate(countPipeline),
      Bill.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Bill.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            totalQty: { $sum: '$soldQty' },
            totalSaleRevenue: { $sum: '$saleRevenue' },
            totalPurchaseCost: { $sum: '$purchaseCost' },
          },
        },
      ]),
    ]);

    const data = docs.map((d: any) => ({
      ...d,
      profitLoss: d.saleRevenue - d.purchaseCost,
    }));

    const summary = totalsResult[0] ?? { totalQty: 0, totalSaleRevenue: 0, totalPurchaseCost: 0 };

    return NextResponse.json({
      total: countResult[0]?.total ?? 0,
      grandTotals: {
        soldQty: summary.totalQty,
        saleRevenue: summary.totalSaleRevenue,
        purchaseCost: summary.totalPurchaseCost,
        profitLoss: summary.totalSaleRevenue - summary.totalPurchaseCost,
      },
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/item-wise-profit]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

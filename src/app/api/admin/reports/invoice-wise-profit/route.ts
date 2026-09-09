import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from          = searchParams.get('from');
    const to            = searchParams.get('to');
    const invoiceNo     = searchParams.get('invoiceNo') || '';
    const customerPhone = searchParams.get('customerPhone') || '';
    const showroomId    = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { documentType: 'bill' };
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }
    if (invoiceNo) match.invoiceNo = { $regex: escapeRegex(invoiceNo), $options: 'i' };
    if (customerPhone) match.clientPhone = customerPhone;

    const pipeline: any[] = [
      { $match: match },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          invoiceNo:      { $first: '$invoiceNo' },
          date:           { $first: '$date' },
          clientName:     { $first: '$clientName' },
          clientPhone:    { $first: '$clientPhone' },
          total:          { $first: { $ifNull: ['$total', 0] } },
          deliveryCharge: { $first: { $ifNull: ['$deliveryCharge', 0] } },
          cashIn:         { $first: { $ifNull: ['$cashIn', 0] } },
          currentBillDue: { $first: { $ifNull: ['$currentBillDue', 0] } },
          saleRevenue:    { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          purchaseCost:   { $sum: { $multiply: [{ $ifNull: ['$items.purchasePrice', { $ifNull: ['$product.purchasePrice', 0] }] }, '$items.quantity'] } },
        },
      },
      { $sort: { date: -1, _id: 1 } },
    ];

    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult, docs, totalsResult] = await Promise.all([
      Bill.aggregate(countPipeline),
      Bill.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Bill.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$saleRevenue' },
            totalPurchase: { $sum: '$purchaseCost' },
            totalNetSales: { $sum: { $subtract: ['$total', '$deliveryCharge'] } },
            totalDelivery: { $sum: '$deliveryCharge' },
            totalBillAmount: { $sum: '$total' },
          },
        },
      ]),
    ]);

    const data = docs.map((d: any) => {
      const total = d.total ?? 0;
      const deliveryCharge = d.deliveryCharge ?? 0;
      return {
        ...d,
        deliveryCharge,
        netSales: total - deliveryCharge,
        profit: (d.saleRevenue ?? 0) - (d.purchaseCost ?? 0),
      };
    });

    const summary = totalsResult[0] ?? { totalSales: 0, totalPurchase: 0, totalNetSales: 0, totalDelivery: 0, totalBillAmount: 0 };

    return NextResponse.json({
      total: countResult[0]?.total ?? 0,
      grandTotals: {
        total: summary.totalBillAmount,
        netSales: summary.totalNetSales,
        delivery: summary.totalDelivery,
        purchaseCost: summary.totalPurchase,
        profit: summary.totalSales - summary.totalPurchase,
      },
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/invoice-wise-profit]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

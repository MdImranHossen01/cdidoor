import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Expense from '@/models/Expense';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const currentYear = new Date().getUTCFullYear();
    const rawYear = parseInt(searchParams.get('year') ?? '', 10);
    const year = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;

    const showroomId  = searchParams.get('showroom') || '';
    const hasShowroom = showroomId && mongoose.Types.ObjectId.isValid(showroomId);
    const showroomObjId = hasShowroom ? new mongoose.Types.ObjectId(showroomId) : null;

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endDate   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const billMatch: Record<string, any> = {
      documentType: 'bill',
      date: { $gte: startDate, $lte: endDate },
    };
    if (showroomObjId) billMatch.showroom = showroomObjId;

    const expenseMatch: Record<string, any> = {
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    };
    if (showroomObjId) expenseMatch.showroom = showroomObjId;

    const salesAgg = await Bill.aggregate([
      { $match: billMatch },
      {
        $group: {
          _id: { month: { $month: { date: '$date', timezone: 'UTC' } } },
          totalSale:    { $sum: '$total' },
          deliveryCost: { $sum: '$deliveryCharge' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const profitAgg = await Bill.aggregate([
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
      {
        $group: {
          _id: { month: { $month: { date: '$date', timezone: 'UTC' } } },
          saleRevenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          purchaseCost: { $sum: { $multiply: [{ $ifNull: ['$items.purchasePrice', { $ifNull: ['$product.purchasePrice', 0] }] }, '$items.quantity'] } },
        },
      },
    ]);

    const expenseAgg = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: { month: { $month: { date: '$date', timezone: 'UTC' } } }, total: { $sum: '$amount' } } },
    ]);

    const data = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const s = salesAgg.find((x: any)  => x._id?.month === m);
      const p = profitAgg.find((x: any) => x._id?.month === m);
      const e = expenseAgg.find((x: any)=> x._id?.month === m);
      const totalSale    = s?.totalSale    ?? 0;
      const deliveryCost = s?.deliveryCost ?? 0;
      const netSales     = Math.max(0, totalSale - deliveryCost);
      const salesProfit  = p ? (p.saleRevenue ?? 0) - (p.purchaseCost ?? 0) : 0;
      const expense      = e?.total ?? 0;
      return {
        month: MONTHS[i],
        netSales,
        totalSale,
        deliveryCost,
        total: totalSale,
        salesProfit,
        expense,
        netProfit: salesProfit - expense,
      };
    });

    return NextResponse.json({ year, data });
  } catch (err: any) {
    console.error('[report/monthly]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

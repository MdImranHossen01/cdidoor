import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    const rawMonth = parseInt(searchParams.get('month') ?? '', 10);
    const rawYear  = parseInt(searchParams.get('year') ?? '', 10);

    const month = Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : currentMonth;
    const year  = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate   = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate     = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const showroomId  = searchParams.get('showroom') || '';
    const hasShowroom = showroomId && mongoose.Types.ObjectId.isValid(showroomId);
    const showroomObjId = hasShowroom ? new mongoose.Types.ObjectId(showroomId) : null;

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

    // Daily sales aggregation
    const salesAgg = await Bill.aggregate([
      { $match: billMatch },
      {
        $group: {
          _id: { day: { $dayOfMonth: { date: '$date', timezone: 'UTC' } } },
          totalSale:    { $sum: '$total' },
          deliveryCost: { $sum: '$deliveryCharge' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    // Daily purchase cost for profit calculation
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
          _id: { day: { $dayOfMonth: { date: '$date', timezone: 'UTC' } } },
          saleRevenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          purchaseCost: { $sum: { $multiply: [{ $ifNull: ['$items.purchasePrice', { $ifNull: ['$product.purchasePrice', 0] }] }, '$items.quantity'] } },
        },
      },
    ]);

    // Daily expense
    const expenseAgg = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: { day: { $dayOfMonth: { date: '$date', timezone: 'UTC' } } }, total: { $sum: '$amount' } } },
    ]);

    const monthShortNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const result = Array.from({ length: daysInMonth }, (_, i) => {
      const day          = i + 1;
      const s            = salesAgg.find((x: any)   => x._id?.day === day);
      const p            = profitAgg.find((x: any)  => x._id?.day === day);
      const e            = expenseAgg.find((x: any) => x._id?.day === day);
      const totalSale    = s?.totalSale    ?? 0;
      const deliveryCost = s?.deliveryCost ?? 0;
      const netSales     = Math.max(0, totalSale - deliveryCost);
      const total        = totalSale;
      const salesProfit  = p ? (p.saleRevenue ?? 0) - (p.purchaseCost ?? 0) : 0;
      const expense      = e?.total ?? 0;
      const netProfit    = salesProfit - expense;

      const dayStr = String(day).padStart(2, '0');
      const dateLabel = `${dayStr}-${monthShortNames[month - 1]}-${year}`;

      return { day, dateLabel, netSales, totalSale, deliveryCost, total, salesProfit, expense, netProfit };
    });

    return NextResponse.json({ month, year, data: result });
  } catch (err: any) {
    console.error('[report/daily]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

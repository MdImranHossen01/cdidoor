import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Expense from '@/models/Expense';
import Showroom from '@/models/Showroom';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const currentYear = new Date().getUTCFullYear();
    const rawYear = parseInt(searchParams.get('year') ?? '', 10);
    const year = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;
    const showroomId = searchParams.get('showroom') || '';

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endDate   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const billMatch: Record<string, any> = {
      documentType: 'bill',
      date: { $gte: startDate, $lte: endDate },
    };

    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      billMatch.showroom = new mongoose.Types.ObjectId(showroomId);
    }

    const expenseMatch: Record<string, any> = {
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    };

    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      expenseMatch.showroom = new mongoose.Types.ObjectId(showroomId);
    }

    const [salesAgg, profitAgg, expenseAgg, showroomList, selectedShowroom] = await Promise.all([
      Bill.aggregate([
        { $match: billMatch },
        {
          $group: {
            _id: { month: { $month: { date: '$date', timezone: 'UTC' } } },
            totalSale:    { $sum: '$total' },
            deliveryCost: { $sum: '$deliveryCharge' },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]),
      Bill.aggregate([
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
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: { month: { $month: { date: '$date', timezone: 'UTC' } } }, total: { $sum: '$amount' } } },
      ]),
      Showroom.find({ isActive: true }, '_id name address').populate('manager', 'name phone').lean(),
      showroomId && mongoose.Types.ObjectId.isValid(showroomId)
        ? Showroom.findById(showroomId).populate('manager', 'name phone').lean()
        : null,
    ]);

    let showroomDisplayName = 'All Showrooms';
    let showroomDisplayPhone = '';
    if (selectedShowroom) {
      showroomDisplayName = (selectedShowroom as any).name || 'Showroom';
      showroomDisplayPhone = (selectedShowroom as any).manager?.phone || '';
    }

    let grandTotalNetSales = 0;
    let grandTotalDelivery = 0;
    let grandTotalSales = 0;
    let grandTotalCommission = 0;

    const data = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const s = salesAgg.find((x: any) => x._id?.month === m);
      const p = profitAgg.find((x: any) => x._id?.month === m);
      const e = expenseAgg.find((x: any) => x._id?.month === m);

      const totalSale    = s?.totalSale    ?? 0;
      const deliveryCost = s?.deliveryCost ?? 0;
      const netSales     = Math.max(0, totalSale - deliveryCost);
      const salesProfit  = p ? (p.saleRevenue ?? 0) - (p.purchaseCost ?? 0) : 0;
      const expense      = e?.total ?? 0;
      const commission   = salesProfit - expense;

      grandTotalNetSales    += netSales;
      grandTotalDelivery    += deliveryCost;
      grandTotalSales       += totalSale;
      grandTotalCommission  += commission;

      return {
        month: MONTHS[i],
        showroom: {
          name: showroomDisplayName,
          phone: showroomDisplayPhone,
        },
        netSales,
        deliveryCost,
        total: totalSale,
        salesProfit,
        expense,
        netProfit: commission,
        commission,
      };
    });

    return NextResponse.json({
      year,
      grandTotals: {
        netSales: grandTotalNetSales,
        delivery: grandTotalDelivery,
        total: grandTotalSales,
        netProfit: grandTotalCommission,
        commission: grandTotalCommission,
      },
      showrooms: showroomList.map((s: any) => {
        const mgrPhone = s.manager?.phone ? ` (${s.manager.phone})` : '';
        return {
          value: String(s._id),
          label: `${s.name}${mgrPhone}`,
        };
      }),
      data,
    });
  } catch (err: any) {
    console.error('[report/showroom-monthly-sales]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

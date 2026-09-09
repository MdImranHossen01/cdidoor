import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Showroom from '@/models/Showroom';
import { escapeRegex, parsePagination, parseUtcDateRange } from '@/lib/report-utils';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from         = searchParams.get('from');
    const to           = searchParams.get('to');
    const searchParam  = searchParams.get('search') || '';
    const invoiceNo    = searchParams.get('invoiceNo') || '';
    const customer     = searchParams.get('customer') || '';
    const showroomId   = searchParams.get('showroom') || '';
    const { page, limit, skip } = parsePagination(searchParams, 25, 100);

    const match: Record<string, any> = { documentType: 'bill' };
    const dateFilter = parseUtcDateRange(from, to);
    if (Object.keys(dateFilter).length) match.date = dateFilter;

    if (showroomId && mongoose.Types.ObjectId.isValid(showroomId)) {
      match.showroom = new mongoose.Types.ObjectId(showroomId);
    }

    const searchTerms = Array.from(new Set([searchParam, invoiceNo, customer].filter(Boolean)));
    if (searchTerms.length > 0) {
      const orConditions: any[] = [];
      for (const term of searchTerms) {
        const escaped = escapeRegex(term);
        orConditions.push(
          { invoiceNo:   { $regex: escaped, $options: 'i' } },
          { clientName:  { $regex: escaped, $options: 'i' } },
          { clientPhone: { $regex: escaped, $options: 'i' } }
        );
      }
      match.$or = orConditions;
    }

    const pagePipeline: any[] = [
      { $match: match },
      { $sort: { date: -1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'showrooms',
          localField: 'showroom',
          foreignField: '_id',
          as: 'showroomData',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'showroomData.manager',
          foreignField: '_id',
          as: 'managerData',
        },
      },
      {
        $project: {
          _id: 1,
          date: 1,
          invoiceNo: 1,
          documentType: 1,
          clientName: 1,
          clientPhone: 1,
          total: { $ifNull: ['$total', 0] },
          deliveryCharge: { $ifNull: ['$deliveryCharge', 0] },
          cashIn: { $ifNull: ['$cashIn', 0] },
          currentBillDue: { $ifNull: ['$currentBillDue', 0] },
          showroomName: { $ifNull: [{ $arrayElemAt: ['$showroomData.name', 0] }, 'Main Branch'] },
          showroomAddress: { $ifNull: [{ $arrayElemAt: ['$showroomData.address', 0] }, ''] },
          managerName: { $ifNull: [{ $arrayElemAt: ['$managerData.name', 0] }, ''] },
          managerPhone: { $ifNull: [{ $arrayElemAt: ['$managerData.phone', 0] }, ''] },
        },
      },
    ];

    const [total, docs, totalsResult, showroomList] = await Promise.all([
      Bill.countDocuments(match),
      Bill.aggregate(pagePipeline),
      Bill.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            totalDelivery: { $sum: '$deliveryCharge' },
            totalPaid: { $sum: '$cashIn' },
            totalDue: { $sum: '$currentBillDue' },
          },
        },
      ]),
      Showroom.find({ isActive: true }, '_id name address').lean(),
    ]);

    const data = docs.map((d: any) => ({
      _id: d._id,
      date: d.date,
      invoiceNo: d.invoiceNo,
      documentType: d.documentType,
      showroom: {
        name: d.showroomName,
        address: d.showroomAddress,
        manager: d.managerName,
        phone: d.managerPhone,
      },
      customer: {
        name: d.clientName || 'Walk-in-customer',
        phone: d.clientPhone || '',
      },
      netSales: (d.total ?? 0) - (d.deliveryCharge ?? 0),
      deliveryCost: d.deliveryCharge ?? 0,
      total: d.total ?? 0,
      commissionPercent: 0,
      commissionAmount: 0,
    }));

    const summary = totalsResult[0] ?? { totalSales: 0, totalDelivery: 0, totalPaid: 0, totalDue: 0 };

    return NextResponse.json({
      total,
      grandTotals: {
        sales: summary.totalSales,
        netSales: summary.totalSales - summary.totalDelivery,
        delivery: summary.totalDelivery,
        paid: summary.totalPaid,
        due: summary.totalDue,
        commission: 0,
      },
      showrooms: showroomList.map((s: any) => ({
        value: String(s._id),
        label: s.name,
      })),
      page,
      limit,
      data,
    });
  } catch (err: any) {
    console.error('[report/showroom-sales]', err);
    return NextResponse.json({ error: 'Failed to fetch showroom sales report' }, { status: 500 });
  }
}

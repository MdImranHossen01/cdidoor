import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Expense from '@/models/Expense';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');
    const showroomId = searchParams.get('showroom') || '';
    const hasShowroom = showroomId && mongoose.Types.ObjectId.isValid(showroomId);
    const showroomObjId = hasShowroom ? new mongoose.Types.ObjectId(showroomId) : null;

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from.includes('T') ? from : `${from}T00:00:00.000Z`);
    if (to)   dateFilter.$lte = new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`);
    
    const billMatch: Record<string, any> = { documentType: 'bill' };
    if (Object.keys(dateFilter).length) billMatch.date = dateFilter;
    if (showroomObjId) billMatch.showroom = showroomObjId;

    const expenseMatch: Record<string, any> = { type: 'expense' };
    if (Object.keys(dateFilter).length) expenseMatch.date = dateFilter;
    if (showroomObjId) expenseMatch.showroom = showroomObjId;

    // ─── Sales Summary ───
    const salesAgg = await Bill.aggregate([
      { $match: billMatch },
      {
        $group: {
          _id: null,
          netSales:     { $sum: { $subtract: ['$total', { $ifNull: ['$deliveryCharge', 0] }] } },
          deliveryCost: { $sum: '$deliveryCharge' },
          total:        { $sum: '$total' },
          cashIn:       { $sum: '$cashIn' },
          due:          { $sum: '$currentBillDue' },
        },
      },
    ]);
    const sales = salesAgg[0] ?? { netSales: 0, deliveryCost: 0, total: 0, cashIn: 0, due: 0 };

    // ─── Collection from LedgerTransactions ───
    const txnMatch: Record<string, any> = { type: 'debit' };
    if (Object.keys(dateFilter).length) txnMatch.date = dateFilter;
    if (showroomObjId) txnMatch.showroom = showroomObjId;

    const collectionsAgg = await LedgerTransaction.aggregate([
      { $match: txnMatch },
      {
        $project: {
          amount: 1,
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$description', regex: /advance/i } }, then: 'advance' },
                { case: { $regexMatch: { input: '$description', regex: /installment/i } }, then: 'installment' },
                { case: { $regexMatch: { input: '$description', regex: /due/i } }, then: 'due' },
                { case: { $regexMatch: { input: '$description', regex: /sales|invoice|order|received|payment/i } }, then: 'invoice' },
              ],
              default: 'invoice',
            },
          },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const collectionMap: Record<string, number> = {};
    for (const c of collectionsAgg) {
      if (c._id) collectionMap[c._id] = c.total;
    }
    const collection = {
      invoice:     collectionMap.invoice ?? 0,
      due:         collectionMap.due ?? 0,
      installment: collectionMap.installment ?? 0,
      advance:     collectionMap.advance ?? 0,
    };

    // ─── Expense Summary ───
    const expenseAgg = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: '$amount' },
        },
      },
    ]);
    const totalExpense = expenseAgg[0]?.totalExpense ?? 0;

    // ─── Profit: Sales Profit = Sales Revenue - Purchase Cost of Sold Items ───
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
          _id: null,
          saleRevenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          purchaseCost: { $sum: { $multiply: [{ $ifNull: ['$product.purchasePrice', 0] }, '$items.quantity'] } },
        },
      },
    ]);
    const salesProfit = profitAgg[0]
      ? profitAgg[0].saleRevenue - profitAgg[0].purchaseCost
      : 0;
    const netProfit = salesProfit - totalExpense;

    // ─── Account Summary ───
    const accounts = await LedgerAccount.find({}, 'name code accountNo currentBalance accountCategory').lean();
    const txnAccountFilter: Record<string, any> = {};
    if (Object.keys(dateFilter).length) txnAccountFilter.date = dateFilter;
    if (showroomObjId) txnAccountFilter.showroom = showroomObjId;

    const accountTxnAgg = await LedgerTransaction.aggregate([
      ...(Object.keys(txnAccountFilter).length ? [{ $match: txnAccountFilter }] : []),
      {
        $group: {
          _id: { account: '$account', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const accountTotalsMap = new Map<string, { debit: number; credit: number }>();
    for (const item of accountTxnAgg) {
      const accId = item._id.account?.toString();
      if (!accId) continue;
      if (!accountTotalsMap.has(accId)) {
        accountTotalsMap.set(accId, { debit: 0, credit: 0 });
      }
      const entry = accountTotalsMap.get(accId)!;
      if (item._id.type === 'debit') entry.debit = item.total ?? 0;
      if (item._id.type === 'credit') entry.credit = item.total ?? 0;
    }

    const accountSummary = accounts.map((acc: any) => {
      const accId = acc._id.toString();
      const totals = accountTotalsMap.get(accId) || { debit: 0, credit: 0 };
      return {
        name: acc.name,
        code: acc.code,
        accountNo: acc.accountNo ?? acc.code,
        debit: totals.debit,
        credit: totals.credit,
        balance: acc.currentBalance ?? 0,
      };
    });

    return NextResponse.json({
      sales: {
        netSales:     sales.netSales,
        deliveryCost: sales.deliveryCost,
        total:        sales.total,
        cashIn:       sales.cashIn,
        due:          sales.due,
      },
      collection,
      expense: { total: totalExpense },
      profit: {
        netSales:    sales.netSales,
        salesProfit,
        expense:     totalExpense,
        netProfit,
      },
      accounts: accountSummary,
    });
  } catch (err: any) {
    console.error('[report/summary]', err);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

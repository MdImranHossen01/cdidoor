import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerTransaction from '@/models/LedgerTransaction';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectToDatabase();

    const dateQuery: any = {};
    if (from) {
      dateQuery.$gte = new Date(from + 'T00:00:00');
    }
    if (to) {
      dateQuery.$lte = new Date(to + 'T23:59:59');
    }

    const query: any = {};
    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }

    // Query matching transactions
    const transactions = await LedgerTransaction.find(query)
      .populate('account')
      .lean() as any[];

    // Extract reference IDs pointing to the Expense/Income collection
    const isObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const expenseIds = transactions
      .map(tx => tx.reference)
      .filter(ref => ref && isObjectId(ref));

    const Expense = (await import('@/models/Expense')).default;
    const expensesMap: Record<string, string> = {};

    if (expenseIds.length > 0) {
      const expenses = await Expense.find({ _id: { $in: expenseIds } }).select('category').lean() as any[];
      expenses.forEach(exp => {
        expensesMap[exp._id.toString()] = exp.category;
      });
    }

    const categorySummaryMap: Record<string, { debit: number, credit: number }> = {};
    const accountSummaryMap: Record<string, { accountName: string, code: string, debit: number, credit: number }> = {};

    transactions.forEach((tx) => {
      const amount = tx.amount || 0;
      const type = tx.type; // 'debit' | 'credit'
      const acc = tx.account;
      const accId = acc?._id?.toString() || 'unknown';
      const accName = acc?.name || 'Unknown Account';
      const accCode = acc?.code || 'UNKNOWN';

      // 1. Account-wise Cumulative summary
      if (!accountSummaryMap[accId]) {
        accountSummaryMap[accId] = {
          accountName: accName,
          code: accCode,
          debit: 0,
          credit: 0
        };
      }
      if (type === 'debit') {
        accountSummaryMap[accId].debit += amount;
      } else {
        accountSummaryMap[accId].credit += amount;
      }

      // 2. Category-wise Cumulative summary
      let categoryName = 'Manual / Others';
      const ref = tx.reference || '';
      const desc = tx.description || '';

      if (ref && expensesMap[ref.toString()]) {
        categoryName = expensesMap[ref.toString()];
      } else if (ref.startsWith('ORDER-') || ref.startsWith('AR-ORDER-') || ref.startsWith('AR-CREDIT-')) {
        categoryName = 'Customer Orders & Sales';
      } else if (ref.startsWith('SUPPLIER-') || ref.startsWith('SUPPLIER_BILL-')) {
        categoryName = 'Supplier Payments';
      } else if (ref.startsWith('WHOLESALER-')) {
        categoryName = 'Wholesaler Collections';
      } else if (ref.startsWith('LOAN-') || ref.startsWith('BUSINESS-LOAN-')) {
        categoryName = 'Loan Transaction';
      } else if (desc.startsWith('Transfer to') || desc.startsWith('Transfer from')) {
        categoryName = 'Internal Transfers';
      }

      if (!categorySummaryMap[categoryName]) {
        categorySummaryMap[categoryName] = { debit: 0, credit: 0 };
      }
      if (type === 'debit') {
        categorySummaryMap[categoryName].debit += amount;
      } else {
        categorySummaryMap[categoryName].credit += amount;
      }
    });

    const categorySummary = Object.entries(categorySummaryMap).map(([category, totals]) => ({
      category,
      debit: totals.debit,
      credit: totals.credit
    }));

    const accountSummary = Object.values(accountSummaryMap);

    return NextResponse.json({
      categorySummary,
      accountSummary
    });
  } catch (error: any) {
    console.error('Error fetching ledger summary:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

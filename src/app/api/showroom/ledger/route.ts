import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { seedLedgerAccounts } from '@/lib/ledgerHelper';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    await seedLedgerAccounts();

    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const txQuery: any = { showroom: showroom._id };
    if (startDate || endDate) {
      txQuery.date = {};
      if (startDate) {
        txQuery.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        txQuery.date.$lte = end;
      }
    }

    const accounts = await LedgerAccount.find().sort({ code: 1 }).lean();
    const transactions = await LedgerTransaction.find(txQuery)
      .populate('account')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Calculate showroom-specific balances for each account dynamically
    const accountsWithShowroomBalances = accounts.map((acc: any) => {
      const accTx = transactions.filter(t => t.account && (t.account as any)._id && (t.account as any)._id.toString() === acc._id.toString());
      
      let runningBalance = 0;
      const mappedTx = accTx.map(t => {
        const change = acc.type === 'liability'
          ? (t.type === 'credit' ? t.amount : -t.amount)
          : (t.type === 'debit' ? t.amount : -t.amount);
        runningBalance += change;
        return {
          ...t,
          balanceAfter: runningBalance
        };
      });

      return {
        ...acc,
        currentBalance: runningBalance,
        transactions: mappedTx.reverse() // latest first for display
      };
    });

    // Flatten all transactions with their calculated showroom balances (latest first)
    const allMappedTx: any[] = [];
    accountsWithShowroomBalances.forEach((acc: any) => {
      allMappedTx.push(...acc.transactions);
    });
    allMappedTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      accounts: accountsWithShowroomBalances.map((a: any) => {
        const { transactions, ...rest } = a;
        return rest;
      }),
      transactions: allMappedTx
    });
  } catch (error: any) {
    console.error('Error fetching showroom ledger:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

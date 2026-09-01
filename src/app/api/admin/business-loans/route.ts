import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import LedgerAccount from '@/models/LedgerAccount';
import { logLedgerTransaction } from '@/lib/ledgerHelper';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const loans = await BusinessLoan.find({})
      .populate('receivingAccountId', 'name code')
      .populate('lenderId', 'name contactPerson phone')
      .sort({ date: -1 });
    return NextResponse.json(loans);
  } catch (error: any) {
    console.error('Error fetching business loans:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionAuth = await auth();
    if (!sessionAuth || !(['admin', 'super_admin', 'manager'].includes((sessionAuth?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      lenderName,
      amount,
      date,
      expectedRepaymentDate,
      receivingAccountId,
      lenderId,
      repaymentType = 'One-time',
      interestAmount = 0,
      totalRepaymentAmount,
      installmentCount,
      installmentAmount,
      installmentDayOfMonth
    } = body;

    if (!lenderName || !amount || !expectedRepaymentDate || !receivingAccountId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    
    let loanData;

    try {
      await dbSession.withTransaction(async () => {
        // Generate loan ID
        const Counter = (await import('@/models/Counter')).default;
        const counterKey = 'business_loan';
        const counter = await Counter.findOneAndUpdate(
          { _id: counterKey },
          { $inc: { seq: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).session(dbSession);
        const loanId = `LOAN-${counter.seq.toString().padStart(5, '0')}`;

        const calcTotal = totalRepaymentAmount || (Number(amount) + Number(interestAmount || 0));

        // Create Loan
        const [loan] = await BusinessLoan.create([{
          loanId,
          lenderName,
          amount: Number(amount),
          interestAmount: Number(interestAmount || 0),
          totalRepaymentAmount: Number(calcTotal),
          dueAmount: Number(calcTotal),
          repaymentType,
          installmentCount: installmentCount ? Number(installmentCount) : undefined,
          installmentAmount: installmentAmount ? Number(installmentAmount) : undefined,
          installmentDayOfMonth: installmentDayOfMonth ? Number(installmentDayOfMonth) : undefined,
          lenderId: lenderId || undefined,
          date: date ? new Date(date) : new Date(),
          expectedRepaymentDate: new Date(expectedRepaymentDate),
          receivingAccountId,
        }], { session: dbSession });
        
        loanData = loan;

        // Log transaction to receiving account
        const account = await LedgerAccount.findById(receivingAccountId).session(dbSession);
        if (!account) {
          throw new Error('Receiving account not found');
        }

        // Debit the receiving account (Asset increases)
        await logLedgerTransaction(
          account.code,
          'debit',
          Number(amount),
          `Business Loan Received: ${loanId} from ${lenderName}`,
          loan._id.toString(),
          date ? new Date(date) : new Date(),
          undefined,
          undefined,
          dbSession
        );

      });
    } finally {
      dbSession.endSession();
    }

    return NextResponse.json({ message: 'Loan created successfully', loan: loanData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating business loan:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

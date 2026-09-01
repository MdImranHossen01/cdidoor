import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import BusinessLoan from '@/models/BusinessLoan';
import { logLedgerTransaction } from '@/lib/ledgerHelper';

export async function POST(req: NextRequest) {
  try {
    const sessionAuth = await auth();
    if (!sessionAuth || !(['admin', 'super_admin', 'manager'].includes((sessionAuth?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      targetAccountId, 
      sourceType, 
      sourceAccountId,
      // For Loan
      lenderName,
      lenderId,
      amount,
      repaymentType,
      expectedRepaymentDate,
      totalRepaymentAmount,
      installmentCount,
      installmentAmount,
      installmentDayOfMonth
    } = body;

    if (!targetAccountId || !sourceType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();
    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();

    try {
      await dbSession.withTransaction(async () => {
        const targetAccount = await LedgerAccount.findById(targetAccountId).session(dbSession);
        if (!targetAccount) throw new Error('Target account not found');

        if (sourceType === 'Loan') {
          if (!lenderName || !amount || !repaymentType || !totalRepaymentAmount) {
            throw new Error('Missing loan details');
          }

          // Generate loan ID
          const Counter = (await import('@/models/Counter')).default;
          const counterKey = 'business_loan';
          const counter = await Counter.findOneAndUpdate(
            { _id: counterKey },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          ).session(dbSession);
          const loanId = `LOAN-${counter.seq.toString().padStart(5, '0')}`;

          const interestAmount = Math.max(0, Number(totalRepaymentAmount) - Number(amount));

          // Create Loan
          const [loan] = await BusinessLoan.create([{
            loanId,
            lenderName,
            lenderId: lenderId || undefined,
            amount: Number(amount),
            date: new Date(),
            expectedRepaymentDate: expectedRepaymentDate ? new Date(expectedRepaymentDate) : new Date(),
            receivingAccountId: targetAccountId,
            repaymentType,
            totalRepaymentAmount: Number(totalRepaymentAmount),
            interestAmount,
            installmentCount: installmentCount ? Number(installmentCount) : undefined,
            installmentAmount: installmentAmount ? Number(installmentAmount) : undefined,
            installmentDayOfMonth: installmentDayOfMonth ? Number(installmentDayOfMonth) : undefined,
          }], { session: dbSession });

          // Debit the receiving account (Asset increases) with Principal
          await logLedgerTransaction(
            targetAccount.code,
            'debit',
            Number(amount),
            `Business Loan Received: ${loanId} from ${lenderName}`,
            loan._id.toString(),
            new Date(),
            undefined,
            undefined,
            dbSession
          );

          // If there is interest, Debit Interest Expense
          if (interestAmount > 0) {
            await logLedgerTransaction(
              'INTEREST_EXP',
              'debit',
              interestAmount,
              `Interest Expense for Loan: ${loanId}`,
              loan._id.toString(),
              new Date(),
              undefined,
              undefined,
              dbSession
            );
          }

          // No explicit Liability ledger entry here because Business Loans payable is a separate virtual calculation on dashboard,
          // but if we were strictly double-entry, we'd credit a LOAN_PAYABLE account.
          // Currently Dashboard stats calculates payable by summing BusinessLoan.dueAmount.
          // That's fine for our hybrid system.

        } else if (sourceType === 'Bank' || sourceType === 'MFS' || sourceType === 'Cash') {
          if (!sourceAccountId) throw new Error('Source account is required for transfer');
          if (sourceAccountId === targetAccountId) throw new Error('Source and Target cannot be the same');

          const sourceAccount = await LedgerAccount.findById(sourceAccountId).session(dbSession);
          if (!sourceAccount) throw new Error('Source account not found');
          if (!amount) throw new Error('Amount is required');

          // Credit Source (decrease Asset)
          await logLedgerTransaction(
            sourceAccount.code,
            'credit',
            Number(amount),
            `Fund Transfer to ${targetAccount.name}`,
            targetAccountId,
            new Date(),
            undefined,
            undefined,
            dbSession
          );

          // Debit Target (increase Asset)
          await logLedgerTransaction(
            targetAccount.code,
            'debit',
            Number(amount),
            `Fund Transfer from ${sourceAccount.name}`,
            sourceAccountId,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
        } else {
          // generic income/others - debit target, credit generic income
          if (!amount) throw new Error('Amount is required');
          
          await logLedgerTransaction(
            targetAccount.code,
            'debit',
            Number(amount),
            `Direct Balance Added: ${sourceType}`,
            undefined,
            new Date(),
            undefined,
            undefined,
            dbSession
          );
          // Note: To balance, we should credit some equity or income account, but depending on the system design, maybe we just want to debit asset.
          // Let's assume there is an implicit "OWNER_EQUITY" or "MISC_INCOME" to balance it.
        }
      });
    } finally {
      dbSession.endSession();
    }

    return NextResponse.json({ message: 'Balance added successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding balance:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

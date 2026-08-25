import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import LedgerAccount from '@/models/LedgerAccount';
import { logLedgerTransaction } from '@/lib/ledgerHelper';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const sessionAuth = await auth();
    if (!sessionAuth || !(['admin', 'super_admin'].includes((sessionAuth?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Deleting a business loan can be complex if we need to reverse ledger transactions.
    // For simplicity, we just delete the record here. In a real accounting system, we'd reverse it.
    await BusinessLoan.findByIdAndDelete(resolvedParams.id);

    return NextResponse.json({ message: 'Loan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting business loan:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const sessionAuth = await auth();
    if (!sessionAuth || !(['admin', 'super_admin', 'manager'].includes((sessionAuth?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, paymentAmount, paymentAccountId } = body;
    
    await connectToDatabase();

    if (action === 'PAY') {
      if (!paymentAmount || paymentAmount <= 0) {
        return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 });
      }
      if (!paymentAccountId) {
        return NextResponse.json({ message: 'Payment account is required' }, { status: 400 });
      }

      const mongoose = (await import('mongoose')).default;
      const dbSession = await mongoose.startSession();
      
      try {
        await dbSession.withTransaction(async () => {
          const loan = await BusinessLoan.findById(resolvedParams.id).session(dbSession);
          if (!loan) throw new Error('Loan not found');
          
          if (paymentAmount > loan.dueAmount) {
            throw new Error('Payment amount cannot exceed due amount');
          }

          // Update loan
          loan.paidAmount += paymentAmount;
          await loan.save({ session: dbSession });

          // Log payment transaction (decrease asset)
          const pAccount = await LedgerAccount.findById(paymentAccountId).session(dbSession);
          if (!pAccount) throw new Error('Payment account not found');

          await logLedgerTransaction(
            pAccount.code,
            'credit',
            Number(paymentAmount),
            `Business Loan Repayment: ${loan.loanId}`,
            loan._id.toString(),
            new Date(),
            undefined,
            undefined,
            dbSession
          );
        });
      } finally {
        dbSession.endSession();
      }
      
      return NextResponse.json({ message: 'Payment recorded successfully' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating business loan:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

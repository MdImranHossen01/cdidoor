import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import { addDays, isAfter, isBefore, startOfToday, setDate, addMonths } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch all active loans
    const activeLoans = await BusinessLoan.find({ status: 'Active' })
      .populate('lenderId', 'name')
      .populate('receivingAccountId', 'name code')
      .sort({ expectedRepaymentDate: 1 });

    const today = startOfToday();
    const thirtyDaysFromNow = addDays(today, 30);

    const upcomingPayments: any[] = [];

    for (const loan of activeLoans) {
      if (loan.repaymentType === 'One-time') {
        const expectedDate = new Date(loan.expectedRepaymentDate);
        if (expectedDate >= today && expectedDate <= thirtyDaysFromNow) {
          upcomingPayments.push({
            _id: loan._id,
            loanId: loan.loanId,
            lenderName: loan.lenderId ? (loan.lenderId as any).name : loan.lenderName,
            amount: loan.dueAmount,
            dueDate: expectedDate,
            type: 'Full Repayment',
          });
        }
      } else if (loan.repaymentType === 'Installment') {
        // If it's an installment, determine the next installment date.
        // We know the installmentDayOfMonth (1-31).
        const dayOfMonth = loan.installmentDayOfMonth || 1;
        
        let nextInstallmentDate = setDate(today, dayOfMonth);
        
        // If the day is already passed this month, the next installment is next month
        if (nextInstallmentDate < today) {
          nextInstallmentDate = addMonths(nextInstallmentDate, 1);
        }

        // Also make sure next installment is not after the expected maturity date of the loan
        const maturityDate = new Date(loan.expectedRepaymentDate);
        if (nextInstallmentDate <= maturityDate) {
          if (nextInstallmentDate >= today && nextInstallmentDate <= thirtyDaysFromNow) {
            upcomingPayments.push({
              _id: loan._id,
              loanId: loan.loanId,
              lenderName: loan.lenderId ? (loan.lenderId as any).name : loan.lenderName,
              amount: loan.installmentAmount || loan.dueAmount,
              dueDate: nextInstallmentDate,
              type: 'Installment',
            });
          }
        } else {
          // If next monthly installment is past maturity, then the maturity date is the remaining final payment
          if (maturityDate >= today && maturityDate <= thirtyDaysFromNow) {
            upcomingPayments.push({
              _id: loan._id,
              loanId: loan.loanId,
              lenderName: loan.lenderId ? (loan.lenderId as any).name : loan.lenderName,
              amount: loan.dueAmount,
              dueDate: maturityDate,
              type: 'Final Repayment',
            });
          }
        }
      }
    }

    // Sort upcoming payments by date ascending
    upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return NextResponse.json(upcomingPayments);
  } catch (error: any) {
    console.error('Error fetching upcoming payables:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import BusinessLoan from '@/models/BusinessLoan';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const todayDate = new Date();

    // 1. Fetch Supplier Bills where status is 'Due'
    const supplierBills = await SupplierBill.find({ status: 'Due' }).populate('supplier').lean() as any[];

    // 2. Fetch Business Loans where status is 'Active'
    const activeBusinessLoans = await BusinessLoan.find({ status: 'Active' }).populate('lenderId').lean() as any[];

    // Group Supplier Bills by Supplier
    const supplierMap = new Map<string, any>();
    for (const sb of supplierBills) {
      const s = sb.supplier;
      const key = s?._id?.toString() || 'unknown';
      const isMatured = sb.expectedPaymentDate && new Date(sb.expectedPaymentDate) < todayDate;
      const due = sb.dueAmount || 0;

      const existing = supplierMap.get(key);
      if (existing) {
        existing.totalDue += due;
        if (isMatured) existing.maturedDue += due;
        existing.billsCount += 1;
      } else {
        supplierMap.set(key, {
          supplierId: s?._id?.toString() || null,
          name: s?.name || s?.companyName || sb.supplierName || 'Unknown Supplier',
          phone: s?.phone || 'N/A',
          totalDue: due,
          maturedDue: isMatured ? due : 0,
          billsCount: 1
        });
      }
    }

    // Group Business Loans by Lender
    const loanMap = new Map<string, any>();
    for (const l of activeBusinessLoans) {
      const lender = l.lenderId;
      const key = lender?._id?.toString() || l._id.toString();
      const due = l.dueAmount || 0;

      // Calculate matured loan amount (similar to stats calculations)
      let maturedAmount = 0;
      if (l.repaymentType === 'Installment') {
        if (l.installmentDayOfMonth && l.installmentAmount && l.date) {
          const loanStartDate = new Date(l.date);
          const currentYear = todayDate.getFullYear();
          const currentMonth = todayDate.getMonth();
          
          let diffMonths = (currentYear - loanStartDate.getFullYear()) * 12 + (currentMonth - loanStartDate.getMonth());
          if (todayDate.getDate() < l.installmentDayOfMonth) {
            diffMonths--;
          }
          const passedInstallments = Math.max(0, diffMonths);
          const expectedPaid = passedInstallments * l.installmentAmount;
          maturedAmount = Math.max(0, expectedPaid - (l.paidAmount || 0));
        }
      } else {
        if (l.expectedRepaymentDate && new Date(l.expectedRepaymentDate) < todayDate) {
          maturedAmount = l.dueAmount || 0;
        }
      }

      const existing = loanMap.get(key);
      if (existing) {
        existing.totalDue += due;
        existing.maturedDue += maturedAmount;
        existing.loansCount += 1;
      } else {
        loanMap.set(key, {
          loanId: l._id.toString(),
          name: lender?.name || l.lenderName || 'Unknown Lender',
          totalDue: due,
          maturedDue: maturedAmount,
          loansCount: 1,
          repaymentType: l.repaymentType,
          installmentAmount: l.installmentAmount || null
        });
      }
    }

    const suppliers = Array.from(supplierMap.values()).sort((a, b) => b.totalDue - a.totalDue);
    const businessLoans = Array.from(loanMap.values()).sort((a, b) => b.totalDue - a.totalDue);

    return NextResponse.json({ suppliers, businessLoans });
  } catch (error: any) {
    console.error('API GET Payable Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

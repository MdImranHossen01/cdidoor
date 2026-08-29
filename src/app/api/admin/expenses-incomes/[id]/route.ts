/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const existingExpense = await Expense.findById(id);
    if (!existingExpense) {
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    // Authorization checks
    if (userRole === 'manager' || userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const userId = (session.user as any).id || (session.user as any)._id;
      const managedShowroom = await Showroom.findOne({ manager: userId });
      if (!managedShowroom || existingExpense.showroom?.toString() !== managedShowroom._id.toString()) {
        return NextResponse.json({ message: 'Unauthorized access to this showroom expense' }, { status: 401 });
      }
      if (existingExpense.status !== 'Pending') {
        return NextResponse.json({ message: 'Cannot edit an expense that has already been processed' }, { status: 400 });
      }
    }

    const body = await req.json();
    const { title, amount, category, date, description, type, status, showroom, employee, accountCode } = body;

    // Sanitize update data (whitelist)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (employee !== undefined) updateData.employee = employee;
    if (accountCode !== undefined) updateData.accountCode = accountCode;

    if (['admin', 'super_admin'].includes(userRole)) {
      if (status !== undefined) updateData.status = status;
      if (showroom !== undefined) updateData.showroom = showroom;
    }

    const dbSession = await mongoose.startSession();
    try {
      dbSession.startTransaction();

      const expense = await Expense.findOneAndUpdate(
        { _id: id },
        updateData,
        { new: true, runValidators: true, session: dbSession }
      );

      if (!expense) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Record not found' }, { status: 404 });
      }

      // Update ledger entry if amount, title or type changed
      const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
      const { recalculateLedgerBalance, logLedgerTransaction } = await import('@/lib/ledgerHelper');

      // Delete old ledger entries for this reference
      await LedgerTransaction.deleteMany({ reference: id }).session(dbSession);

      // Log the updated expense/income if Approved
      if (expense.status === 'Approved') {
        const targetAccount = expense.accountCode || 'CASH';
        if (expense.type === 'expense') {
          let ledgerDescription = `Expense Paid: ${expense.title}`;
          if (expense.category === 'Loan Paid' || expense.category === 'Profit/Interest') {
            ledgerDescription = expense.title;
          }
          await logLedgerTransaction(
            targetAccount,
            'credit',
            expense.amount,
            ledgerDescription,
            expense._id.toString(),
            expense.date ? new Date(expense.date) : new Date()
          );
        } else {
          await logLedgerTransaction(
            targetAccount,
            'debit',
            expense.amount,
            `Income Received: ${expense.title}`,
            expense._id.toString(),
            expense.date ? new Date(expense.date) : new Date()
          );
        }
      }
      // Recalculate Cash/Bank balances
      await recalculateLedgerBalance(existingExpense.accountCode || 'CASH');
      if (expense.accountCode && expense.accountCode !== existingExpense.accountCode) {
        await recalculateLedgerBalance(expense.accountCode);
      }

      await dbSession.commitTransaction();
      dbSession.endSession();
      return NextResponse.json(expense);
    } catch (err: any) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      console.error('Error updating ledger on transaction update:', err);
      return NextResponse.json({ message: 'Ledger sync failed on update', error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const existingExpense = await Expense.findById(id);
    if (!existingExpense) {
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    if (userRole === 'manager' || userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const userId = (session.user as any).id || (session.user as any)._id;
      const managedShowroom = await Showroom.findOne({ manager: userId });
      if (!managedShowroom || existingExpense.showroom?.toString() !== managedShowroom._id.toString()) {
        return NextResponse.json({ message: 'Unauthorized access to this showroom expense' }, { status: 401 });
      }
      if (existingExpense.status !== 'Pending') {
        return NextResponse.json({ message: 'Cannot delete an expense that has already been processed' }, { status: 400 });
      }
    }

    const dbSession = await mongoose.startSession();
    try {
      dbSession.startTransaction();

      await Expense.findByIdAndDelete(id).session(dbSession);

      const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
      const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');

      // Delete ledger entries
      await LedgerTransaction.deleteMany({ reference: id }).session(dbSession);

      // Recalculate Cash/Bank balance
      await recalculateLedgerBalance(existingExpense.accountCode || 'CASH');

      await dbSession.commitTransaction();
      dbSession.endSession();
      return NextResponse.json({ message: 'Record deleted successfully' });
    } catch (err: any) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      console.error('Error updating ledger on delete:', err);
      return NextResponse.json({ message: 'Ledger sync failed on delete', error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

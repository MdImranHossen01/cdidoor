/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';
import Showroom from '@/models/Showroom';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (category) query.category = category;
    if (type) query.type = type;

    if (from || to) {
      const dateQuery: any = {};

      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return NextResponse.json({ message: 'Invalid "from" date format' }, { status: 400 });
        }
        dateQuery.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return NextResponse.json({ message: 'Invalid "to" date format' }, { status: 400 });
        }
        toDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = toDate;
      }

      query.date = dateQuery;
    }

    if (userRole === 'manager' || userRole === 'showroom_manager') {
      const userId = (session.user as any).id || (session.user as any)._id;
      const managedShowroom = await Showroom.findOne({ manager: userId });
      if (managedShowroom) {
        query.showroom = managedShowroom._id;
      } else {
        return NextResponse.json([]);
      }
    }

    const expenses = await Expense.find(query).populate('showroom', 'name').populate('employee', 'name email').sort({ date: -1 });
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, amount, category, date, description, type, employee } = body;

    // Validate required fields (basic)
    if (!title || amount === undefined || !category || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    let expenseStatus = 'Approved';
    let showroomId = body.showroom;

    await connectToDatabase();

    if (userRole === 'manager' || userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const userId = (session.user as any).id || (session.user as any)._id;
      const managedShowroom = await Showroom.findOne({ manager: userId });
      if (managedShowroom) {
        showroomId = managedShowroom._id;
      }
      expenseStatus = 'Pending';
    } else if (body.status) {
      expenseStatus = body.status;
    }

    // Build safe payload (whitelist)
    const safePayload: any = {
      title,
      amount,
      category,
      type,
      date: date ? new Date(date) : new Date(),
      description,
      status: expenseStatus,
      employee
    };

    if (showroomId) {
      safePayload.showroom = showroomId;
    }

    const expense = await Expense.create(safePayload);

    // Log to ledger only if approved
    if (expenseStatus === 'Approved') {
      try {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
        if (type === 'expense') {
          // Credit Cash (decreases cash asset)
          await logLedgerTransaction(
            'CASH',
            'credit',
            amount,
            `Expense Paid: ${title}`,
            expense._id.toString()
          );
        } else {
          // Debit Cash (increases cash asset)
          await logLedgerTransaction(
            'CASH',
            'debit',
            amount,
            `Income Received: ${title}`,
            expense._id.toString()
          );
        }
      } catch (err) {
        console.error('Error logging transaction to ledger:', err);
      }
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

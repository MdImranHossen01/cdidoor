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
    const { title, amount, category, date, description, type, employee, accountCode, supplier, customerPhone } = body;

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
      employee,
      supplier: supplier || undefined,
      customerPhone: customerPhone || undefined,
      accountCode: accountCode || 'CASH'
    };

    if (showroomId) {
      safePayload.showroom = showroomId;
    }

    const expense = await Expense.create(safePayload);

    // Log to ledger only if approved
    if (expenseStatus === 'Approved') {
      try {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
        const targetAccount = expense.accountCode || 'CASH';

        if (type === 'expense') {
          let ledgerDescription = `Expense Paid: ${title}`;
          if (category === 'Loan Paid' || category === 'Profit/Interest') {
            ledgerDescription = title;
          }
          await logLedgerTransaction(
            targetAccount,
            'credit',
            amount,
            ledgerDescription,
            expense._id.toString()
          );

          if (category === 'Account payable') {
            // Log Debit to AP ledger (reduces Accounts Payable liability)
            await logLedgerTransaction(
              'AP',
              'debit',
              amount,
              `Supplier Payment: ${title}`,
              expense._id.toString()
            );

            // Deduct supplier currentBalance and create SupplierPayment record
            if (supplier) {
              const Supplier = (await import('@/models/Supplier')).default;
              const SupplierPayment = (await import('@/models/SupplierPayment')).default;
              
              const targetSupplier = await Supplier.findById(supplier);
              if (targetSupplier) {
                targetSupplier.currentBalance = (targetSupplier.currentBalance || 0) - amount;
                await targetSupplier.save();

                await SupplierPayment.create({
                  supplier: targetSupplier._id,
                  amount: amount,
                  paymentMethod: 'Cash',
                  description: `Supplier payment recorded via Expense Transaction: ${title}`,
                  date: date ? new Date(date) : new Date()
                });
              }
            }
          }
        } else {
          // Debit selected account (increases asset)
          await logLedgerTransaction(
            targetAccount,
            'debit',
            amount,
            `Income Received: ${title}`,
            expense._id.toString()
          );

          if (category === 'Account receivable') {
            // Log Credit to AR ledger (reduces Accounts Receivable asset)
            await logLedgerTransaction(
              'AR',
              'credit',
              amount,
              `Accounts Receivable Collection: ${title}`,
              expense._id.toString()
            );

            // Adjust customer outstanding dues (Bills first, then Orders)
            if (customerPhone) {
              const Bill = (await import('@/models/Bill')).default;
              const Order = (await import('@/models/Order')).default;
              const phoneStr = customerPhone.trim();
              let remainingAmount = amount;

              // 1. Fetch outstanding due Bills for this customer (oldest first)
              const dueBills = await Bill.find({ 
                clientPhone: phoneStr,
                currentBillDue: { $gt: 0 }
              }).sort({ date: 1, createdAt: 1 });

              for (const bill of dueBills) {
                if (remainingAmount <= 0) break;
                const due = bill.currentBillDue || 0;
                const pay = Math.min(remainingAmount, due);

                bill.cashIn = (bill.cashIn || 0) + pay;
                bill.currentBillDue = Math.max(0, due - pay);
                bill.status = bill.currentBillDue <= 0 ? 'Paid' : 'Due';
                await bill.save();

                remainingAmount -= pay;
              }

              // 2. Fetch outstanding due Orders for this customer if there is remainingAmount (oldest first)
              if (remainingAmount > 0) {
                const dueOrders = await Order.find({
                  $or: [
                    { clientPhone: phoneStr },
                    { 'shippingAddress.phone': phoneStr }
                  ],
                  paymentStatus: { $ne: 'Paid' },
                  status: { $ne: 'Cancelled' }
                }).sort({ createdAt: 1 });

                for (const order of dueOrders) {
                  if (remainingAmount <= 0) break;
                  const total = order.totalAmount || 0;
                  const paid = order.paidAmount || 0;
                  const orderDue = total - paid;
                  if (orderDue <= 0) continue;

                  const pay = Math.min(remainingAmount, orderDue);
                  order.paidAmount = paid + pay;
                  order.paymentStatus = (order.paidAmount >= total) ? 'Paid' : 'Pending';
                  if (order.paymentStatus === 'Paid') {
                    order.status = 'Paid';
                  }
                  await order.save();

                  remainingAmount -= pay;
                }
              }
            }
          }
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

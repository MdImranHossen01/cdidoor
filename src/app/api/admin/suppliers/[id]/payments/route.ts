import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierPayment from '@/models/SupplierPayment';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { amount, paymentMethod, description, date } = body;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const dbSession = await conn.startSession();
    dbSession.startTransaction();

    let payment;
    try {
      const supplier = await Supplier.findById(id).session(dbSession);
      if (!supplier) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
      }

      const [newPayment] = await SupplierPayment.create([{
        supplier: id,
        amount: amountNum,
        paymentMethod,
        description,
        date: date ? new Date(date) : new Date()
      }], { session: dbSession });

      payment = newPayment;

      // Update supplier balance (payment decreases outstanding payable balance, overpayments result in credit/negative balance)
      supplier.currentBalance = (supplier.currentBalance || 0) - amountNum;
      await supplier.save({ session: dbSession });

      const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
      const txDate = date ? new Date(date) : new Date();

      // 1. Debit Accounts Payable (decreases liability)
      await logLedgerTransaction(
        'AP',
        'debit',
        amountNum,
        `Supplier Payment: ${supplier.name || supplier.companyName || 'Supplier'}`,
        payment._id.toString(),
        txDate,
        undefined,
        undefined,
        dbSession
      );

      // 2. Credit Cash/Bank (decreases asset)
      const accCode = paymentMethod === 'Bank' ? 'CASH' : 'CASH';
      await logLedgerTransaction(
        accCode,
        'credit',
        amountNum,
        `Supplier Payment: ${supplier.name || supplier.companyName || 'Supplier'}`,
        payment._id.toString(),
        txDate,
        undefined,
        undefined,
        dbSession
      );

      await dbSession.commitTransaction();
    } catch (txErr) {
      await dbSession.abortTransaction();
      throw txErr;
    } finally {
      dbSession.endSession();
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error('Error recording supplier payment:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

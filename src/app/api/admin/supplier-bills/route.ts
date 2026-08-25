import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const bills = await SupplierBill.find({})
      .populate('supplier', 'name companyName phone')
      .sort({ date: -1 });

    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching supplier bills:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, date, items, subtotal, discount, total, paidAmount, paymentMethod, paymentAccountId, expectedPaymentDate } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Supplier and items are required' }, { status: 400 });
    }

    await connectToDatabase();

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();

    let billResult: any = null;
    let customErrorResponse: NextResponse | null = null;

    try {
      await dbSession.withTransaction(async () => {
        const supplier = await Supplier.findById(supplierId).session(dbSession);
        if (!supplier) {
          customErrorResponse = NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
          throw new Error('Supplier not found');
        }

        // Validate items and calculate subtotal
        if (!Array.isArray(items)) {
          customErrorResponse = NextResponse.json({ message: 'Items must be an array' }, { status: 400 });
          throw new Error('Items must be an array');
        }

        let calculatedSubtotal = 0;
        for (const item of items) {
          const qty = Number(item.quantity);
          const price = Number(item.price);
          if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
            customErrorResponse = NextResponse.json({ message: 'Invalid item quantity or price' }, { status: 400 });
            throw new Error('Invalid item quantity or price');
          }
          calculatedSubtotal += qty * price;
        }

        const discNum = Number(discount || 0);
        if (isNaN(discNum) || discNum < 0) {
          customErrorResponse = NextResponse.json({ message: 'Invalid discount' }, { status: 400 });
          throw new Error('Invalid discount');
        }

        const totalNum = Math.max(0, calculatedSubtotal - discNum);
        const paidNum = Number(paidAmount || 0);
        if (isNaN(paidNum) || paidNum < 0) {
          customErrorResponse = NextResponse.json({ message: 'Invalid paid amount' }, { status: 400 });
          throw new Error('Invalid paid amount');
        }

        if (paidNum > totalNum) {
          customErrorResponse = NextResponse.json({ message: 'Paid amount cannot exceed the total bill amount' }, { status: 400 });
          throw new Error('Paid amount cannot exceed the total bill amount');
        }

        const dueNum = totalNum - paidNum;
        const status = dueNum === 0 ? 'Paid' : 'Due';

        // Generate sequential purchase bill number using Counter model
        const Counter = (await import('@/models/Counter')).default;
        const counterKey = 'purchase_bill';
        const counter = await Counter.findOneAndUpdate(
          { _id: counterKey },
          { $inc: { seq: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).session(dbSession);
        const billNo = `PUR-${counter.seq.toString().padStart(5, '0')}`;

        const [bill] = await SupplierBill.create([{
          billNo,
          supplier: supplierId,
          date: date ? new Date(date) : new Date(),
          items: items.map(item => ({
            name: String(item.name),
            quantity: Number(item.quantity),
            price: Number(item.price)
          })),
          subtotal: calculatedSubtotal,
          discount: discNum,
          total: totalNum,
          paidAmount: paidNum,
          dueAmount: dueNum,
          paymentMethod,
          paymentAccountId: paymentAccountId || undefined,
          expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate) : undefined,
          status
        }], { session: dbSession });

        // Increment supplier balance by dueAmount
        supplier.currentBalance = (supplier.currentBalance || 0) + dueNum;
        await supplier.save({ session: dbSession });

        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');

        if (dueNum > 0) {
          await logLedgerTransaction(
            'AP',
            'credit',
            dueNum,
            `Supplier Bill Generated: ${billNo}`,
            bill._id.toString(),
            date ? new Date(date) : new Date(),
            undefined,
            undefined,
            dbSession
          );
        }

        if (paidNum > 0) {
          let accCode = 'CASH';
          if (paymentMethod === 'Bank' || paymentMethod === 'MFS') {
            if (!paymentAccountId) {
              customErrorResponse = NextResponse.json({ message: `${paymentMethod} account must be selected.` }, { status: 400 });
              throw new Error(`${paymentMethod} account must be selected.`);
            }
            const LedgerAccount = (await import('@/models/LedgerAccount')).default;
            const pAccount = await LedgerAccount.findById(paymentAccountId).session(dbSession);
            if (!pAccount) {
              customErrorResponse = NextResponse.json({ message: 'Selected payment account not found.' }, { status: 404 });
              throw new Error('Selected payment account not found.');
            }
            accCode = pAccount.code;
          }
          await logLedgerTransaction(
            accCode,
            'credit',
            paidNum,
            `Supplier Bill Upfront Payment: ${billNo}`,
            bill._id.toString(),
            date ? new Date(date) : new Date(),
            undefined,
            undefined,
            dbSession
          );
        }

        billResult = bill;
      });

      dbSession.endSession();

      if (customErrorResponse) {
        return customErrorResponse;
      }

      return NextResponse.json(billResult, { status: 201 });
    } catch (transactionError: any) {
      dbSession.endSession();
      if (customErrorResponse) {
        return customErrorResponse;
      }
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error creating supplier bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

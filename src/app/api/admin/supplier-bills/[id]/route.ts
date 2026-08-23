import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { supplierId, date, items, subtotal, discount, total, paidAmount, paymentMethod } = body;

    await connectToDatabase();

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const oldBill = await SupplierBill.findById(id).session(dbSession);
      if (!oldBill) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
      }

      // 1. Validate new supplier first if changing it
      let targetSupplierId = oldBill.supplier;
      if (supplierId && supplierId.toString() !== oldBill.supplier.toString()) {
        const checkSupplier = await Supplier.findById(supplierId).session(dbSession);
        if (!checkSupplier) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
        }
        targetSupplierId = supplierId;
      }

      // 2. Subtract the old due amount from the old supplier (without Math.max clamping)
      const oldSupplier = await Supplier.findById(oldBill.supplier).session(dbSession);
      if (oldSupplier) {
        oldSupplier.currentBalance = (oldSupplier.currentBalance || 0) - oldBill.dueAmount;
        await oldSupplier.save({ session: dbSession });
      }

      // 3. Update the bill details deriving from oldBill values when fields are omitted, handling null/empty/non-numeric values
      let totalNum = oldBill.total;
      if (total !== undefined && total !== null && total !== '') {
        const parsedTotal = parseFloat(total);
        totalNum = isNaN(parsedTotal) || !isFinite(parsedTotal) ? 0 : parsedTotal;
      } else if (total === null || total === '') {
        totalNum = 0;
      }

      let paidNum = oldBill.paidAmount;
      if (paidAmount !== undefined && paidAmount !== null && paidAmount !== '') {
        const parsedPaid = parseFloat(paidAmount);
        paidNum = isNaN(parsedPaid) || !isFinite(parsedPaid) ? 0 : parsedPaid;
      } else if (paidAmount === null || paidAmount === '') {
        paidNum = 0;
      }

      const dueNum = Math.max(0, totalNum - paidNum);
      const status = dueNum === 0 ? 'Paid' : 'Due';

      oldBill.supplier = targetSupplierId;
      if (date) oldBill.date = new Date(date);
      if (items) oldBill.items = items;
      if (subtotal !== undefined) oldBill.subtotal = subtotal;
      if (discount !== undefined) oldBill.discount = discount;
      oldBill.total = totalNum;
      oldBill.paidAmount = paidNum;
      oldBill.dueAmount = dueNum;
      oldBill.status = status;
      if (paymentMethod) oldBill.paymentMethod = paymentMethod;

      await oldBill.save({ session: dbSession });

      // 4. Add the new due amount to the new supplier
      const newSupplier = await Supplier.findById(oldBill.supplier).session(dbSession);
      if (newSupplier) {
        newSupplier.currentBalance = (newSupplier.currentBalance || 0) + dueNum;
        await newSupplier.save({ session: dbSession });
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json(oldBill);
    } catch (transactionError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error updating supplier bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const bill = await SupplierBill.findById(id).session(dbSession);
      if (!bill) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
      }

      // Subtract the bill due amount from supplier balance (without Math.max clamping)
      const supplier = await Supplier.findById(bill.supplier).session(dbSession);
      if (supplier) {
        supplier.currentBalance = (supplier.currentBalance || 0) - bill.dueAmount;
        await supplier.save({ session: dbSession });
      }

      await bill.deleteOne({ session: dbSession });

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({ message: 'Bill deleted successfully' });
    } catch (transactionError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error deleting supplier bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

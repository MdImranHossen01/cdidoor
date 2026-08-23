import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import Bill from '@/models/Bill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'paid', 'due'
    const type = searchParams.get('type') || 'bill'; // 'offer', 'chalan', 'bill'
    
    let query: any = { showroom: showroom._id };
    if (type === 'bill') {
      query.$or = [{ documentType: 'bill' }, { documentType: { $exists: false } }];
      // Apply the showroom filter inside the OR conditions if they exist
      query.$and = [{ showroom: showroom._id }];
    } else {
      query.documentType = type;
    }

    if (filter === 'paid') {
      query.status = 'Paid';
    } else if (filter === 'due') {
      query.status = 'Due';
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching showroom bills:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      clientAddress,
      items,
      deliveryCharge,
      serviceFee,
      discountType,
      discountValue,
      prevDue,
      cashIn,
      expectedReceivableDate,
      documentType,
      convertedFrom
    } = body;

    if (!clientName || !clientPhone || !clientAddress || !items || items.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate inputs and avoid trusting client-provided monetary numbers
    const validatedDeliveryCharge = Math.max(0, Number(deliveryCharge) || 0);
    const validatedServiceFee = Math.max(0, Number(serviceFee) || 0);
    const validatedDiscountValue = Math.max(0, Number(discountValue) || 0);
    const validatedPrevDue = Math.max(0, Number(prevDue) || 0);
    const validatedCashIn = Math.max(0, Number(cashIn) || 0);

    let calculatedSubtotal = 0;
    const sanitizedItems = items.map((item: any) => {
      const q = Math.max(1, parseInt(item.quantity) || 1);
      const p = Math.max(0, parseFloat(item.price) || 0);
      calculatedSubtotal += q * p;
      return {
        name: String(item.name),
        quantity: q,
        price: p,
        size: item.size ? String(item.size) : undefined,
        color: item.color ? String(item.color) : undefined,
      };
    });

    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = Math.round((calculatedSubtotal * validatedDiscountValue) / 100);
    } else {
      calculatedDiscount = validatedDiscountValue;
    }
    calculatedDiscount = Math.max(0, calculatedDiscount);

    const calculatedTotal = Math.max(0, calculatedSubtotal + validatedDeliveryCharge + validatedServiceFee - calculatedDiscount);
    const calculatedGTotal = calculatedTotal + validatedPrevDue;
    const calculatedCurrentBillDue = Math.max(0, calculatedGTotal - validatedCashIn);
    const derivedStatus = validatedCashIn >= calculatedGTotal ? 'Paid' : 'Due';

    if (!isFinite(calculatedSubtotal) || calculatedSubtotal < 0 ||
        !isFinite(calculatedTotal) || calculatedTotal < 0 ||
        !isFinite(calculatedGTotal) || calculatedGTotal < 0 ||
        !isFinite(calculatedCurrentBillDue) || calculatedCurrentBillDue < 0) {
      return NextResponse.json({ message: 'Invalid monetary calculations' }, { status: 400 });
    }

    // Generate unique sequential document number using Counter model
    const docType = documentType || 'bill';
    const Counter = (await import('@/models/Counter')).default;
    const counterKey = `bill_${docType}`;
    const counter = await Counter.findOneAndUpdate(
      { _id: counterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const nextNum = 100 + counter.seq;

    let prefix = 'INV-';
    if (docType === 'offer') prefix = 'OFF-';
    else if (docType === 'chalan') prefix = 'CH-';

    const invoiceNo = `${prefix}${String(nextNum).padStart(7, '0')}`;

    const mongoose = (await import('mongoose')).default;
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const newBill = new Bill({
        clientName,
        clientPhone,
        clientAddress,
        invoiceNo,
        items: sanitizedItems,
        subtotal: calculatedSubtotal,
        deliveryCharge: validatedDeliveryCharge,
        serviceFee: validatedServiceFee,
        discountType,
        discountValue: validatedDiscountValue,
        discount: calculatedDiscount,
        total: calculatedTotal,
        prevDue: validatedPrevDue,
        gTotal: calculatedGTotal,
        cashIn: validatedCashIn,
        currentBillDue: calculatedCurrentBillDue,
        status: derivedStatus,
        expectedReceivableDate: derivedStatus === 'Due' && expectedReceivableDate ? new Date(expectedReceivableDate) : undefined,
        documentType: docType,
        convertedFrom: convertedFrom || undefined,
        showroom: showroom._id
      });

      await newBill.save({ session: dbSession });

      // Log to ledger if it is a final Bill (not offers/chalans)
      if (docType === 'bill') {
        const { logLedgerTransaction } = await import('@/lib/ledgerHelper');
        
        // Debit Accounts Receivable by the grand total of the bill
        await logLedgerTransaction(
          'AR',
          'debit',
          calculatedGTotal,
          `Bill Generated for ${clientName} (${showroom.name})`,
          invoiceNo,
          new Date(),
          undefined,
          showroom._id.toString(),
          dbSession
        );

        // If client paid any cash upfront
        if (validatedCashIn > 0) {
          // Debit Cash (increases cash asset)
          await logLedgerTransaction(
            'CASH',
            'debit',
            validatedCashIn,
            `Cash Paid Upfront for Bill ${invoiceNo} (${showroom.name})`,
            invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
          // Credit Accounts Receivable (decreases receivable asset)
          await logLedgerTransaction(
            'AR',
            'credit',
            validatedCashIn,
            `Upfront payment credit for Bill ${invoiceNo} (${showroom.name})`,
            invoiceNo,
            new Date(),
            undefined,
            showroom._id.toString(),
            dbSession
          );
        }
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json(newBill, { status: 201 });
    } catch (transactionError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error creating showroom bill:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';

export async function POST(req: NextRequest, { params }: { params: Promise<{ invoiceNo: string }> }) {
  try {
    const { invoiceNo } = await params;
    if (!invoiceNo) {
      return NextResponse.json({ message: 'Invoice number is required' }, { status: 400 });
    }

    const { methodName, senderNumber, transactionId } = await req.json();

    if (!methodName || !senderNumber || !transactionId) {
      return NextResponse.json({ message: 'Method name, Sender Number, and Transaction ID are required' }, { status: 400 });
    }

    await connectToDatabase();

    const bill = await Bill.findOne({ invoiceNo }).populate('showroom', 'name address phone');
    if (!bill) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    // Save manual payment submission details
    bill.manualPaymentDetails = {
      methodName,
      senderNumber,
      transactionId,
    };

    await bill.save();

    return NextResponse.json({
      message: 'Payment information submitted successfully. Admin will verify and confirm shortly.',
      bill
    });
  } catch (error: any) {
    console.error('Error submitting manual payment for bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

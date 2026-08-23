import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET(req: NextRequest, { params }: { params: Promise<{ invoiceNo: string }> }) {
  try {
    const { invoiceNo } = await params;
    if (!invoiceNo) {
      return NextResponse.json({ message: 'Invoice number is required' }, { status: 400 });
    }

    await connectToDatabase();

    const bill = await Bill.findOne({ invoiceNo }).populate('showroom', 'name address phone');
    if (!bill) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error: any) {
    console.error('Error fetching public bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

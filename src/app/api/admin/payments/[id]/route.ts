import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Invalid payment ID' }, { status: 400 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { status } = body;

    if (!['confirmed', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    if (['confirmed', 'rejected'].includes(payment.status)) {
      return NextResponse.json({ message: 'Cannot modify a payment in a terminal state' }, { status: 400 });
    }

    payment.status = status;
    payment.reviewedBy = (session.user as any).id;
    payment.reviewedAt = new Date();
    await payment.save();

    const updatedPayment = await Payment.findById(id).populate('user', 'name email');

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
    }

    const { methodName, senderNumber, transactionId } = await req.json();

    if (!methodName || !senderNumber || !transactionId) {
      return NextResponse.json({ message: 'Method name, Sender Number, and Transaction ID are required' }, { status: 400 });
    }

    await connectToDatabase();

    let order = null;
    const mongoose = (await import('mongoose')).default;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({
        $or: [
          { shortId: id },
          { shortId: id.toLowerCase() },
          { shortId: id.toUpperCase() },
          { orderId: id },
          { orderId: id.startsWith('#') ? id : `#${id}` }
        ]
      });
    }

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Save manual payment submission details
    order.manualPaymentDetails = {
      methodName,
      senderNumber,
      transactionId,
    };
    order.paymentMethod = 'Manual';

    await order.save();

    return NextResponse.json({
      message: 'Payment information submitted successfully. Admin will verify and confirm shortly.',
      order
    });
  } catch (error: any) {
    console.error('Error submitting manual payment:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

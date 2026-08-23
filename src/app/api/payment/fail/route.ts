import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';

// FAIL ROUTE
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature');
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
    const secret = settings?.paymentConfig?.sslcommerz?.storePassword;
    const rawBody = await req.text();

    if (!signature || !secret) {
      console.error('Payment fail route: Missing signature or secret');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature !== hmac) {
      console.error('Payment fail route: Signature mismatch');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    const data = Object.fromEntries(new URLSearchParams(rawBody).entries());
    const tranId = data.tran_id?.toString();
    if (!tranId) {
      console.error('Payment fail route: Missing tran_id in verified body');
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    let resolvedId = '';
    let resolvedType = 'order';

    if (tranId.startsWith('BILL-')) {
      resolvedType = 'bill';
      const Bill = (await import('@/models/Bill')).default;
      const bill = await Bill.findOne({ transactionId: tranId });
      if (!bill) {
        return NextResponse.json({ message: 'Matching bill not found' }, { status: 400 });
      }
      resolvedId = bill._id.toString();
    } else if (tranId.startsWith('TRANS-')) {
      resolvedType = 'order';
      const order = await Order.findOne({ transactionId: tranId });
      if (!order) {
        return NextResponse.json({ message: 'Matching order not found' }, { status: 400 });
      }
      resolvedId = order._id.toString();
    } else {
      return NextResponse.json({ message: 'Invalid transaction ID format' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queryId = searchParams.get('id');
    const queryType = searchParams.get('type') || 'order';
    const redirectParam = searchParams.get('redirect') || 'checkout';

    if (queryId !== resolvedId || queryType !== resolvedType) {
      console.error(`Payment fail route: query params mismatch. queryId=${queryId}, resolvedId=${resolvedId}, queryType=${queryType}, resolvedType=${resolvedType}`);
      return NextResponse.json({ message: 'Query parameters mismatch' }, { status: 400 });
    }

    if (resolvedType === 'bill') {
      console.info(`Bill payment failed for ID: ${resolvedId}`);
    } else {
      const order = await Order.findOne({ _id: resolvedId });
      if (order) {
        if (order.paymentStatus === 'Paid') {
          console.info(`Order ${resolvedId} is already marked as Paid. Skipping Failed assignment.`);
        } else {
          console.info(`Marking order ${resolvedId} as Failed. Previous status: ${order.paymentStatus}, User: ${order.user}`);
          try {
            order.paymentStatus = 'Failed';
            await order.save();
          } catch (dbError: any) {
            console.error(`Error saving order ${resolvedId} status:`, dbError.message);
          }
        }
      }
    }

    const origin = req.nextUrl.origin;
    let redirectUrl = `${origin}/checkout?order=failed`;
    if (resolvedType === 'bill') {
      const Bill = (await import('@/models/Bill')).default;
      const bill = await Bill.findById(resolvedId);
      if (bill) {
        redirectUrl = `${origin}/bills/${bill.invoiceNo}?payment=failed`;
      }
    } else {
      if (redirectParam === 'public') {
        redirectUrl = `${origin}/orders/${resolvedId}?payment=failed`;
      } else {
        redirectUrl = `${origin}/checkout?order=failed&id=${resolvedId}`;
      }
    }
      
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error: any) {
    console.error('payment fail route error:', error.message, error.stack);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

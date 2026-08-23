import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const searchParams = req.nextUrl.searchParams;
  const orderId = searchParams.get('id');
  const type = searchParams.get('type') || 'order';
  const redirectParam = searchParams.get('redirect') || 'checkout';

  let redirectUrl = `${origin}/checkout`;

  try {
    if (type === 'bill' && orderId) {
      await connectToDatabase();
      const Bill = (await import('@/models/Bill')).default;
      const bill = await Bill.findById(orderId);
      if (bill) {
        redirectUrl = `${origin}/bills/${bill.invoiceNo}?payment=cancelled`;
      }
    } else if (orderId) {
      if (redirectParam === 'public') {
        redirectUrl = `${origin}/orders/${orderId}?payment=cancelled`;
      } else {
        redirectUrl = `${origin}/checkout?order=cancelled&id=${orderId}`;
      }
    }
  } catch (error) {
    console.error('Cancel redirect error:', error);
  }

  return NextResponse.redirect(redirectUrl, 303);
}


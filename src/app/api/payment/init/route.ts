import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { initPayment } from '@/lib/sslcommerz';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { orderId, billId, redirect } = await req.json();

    // Limit redirect to public or checkout, defaulting to checkout
    const redirectVal = (redirect === 'public' || redirect === 'checkout') ? redirect : 'checkout';

    if (!orderId && !billId) {
      return NextResponse.json({ message: 'Order ID or Bill ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    if (billId) {
      const Bill = (await import('@/models/Bill')).default;
      const bill = await Bill.findById(billId);
      if (!bill) {
        return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
      }
      if (bill.status === 'Paid') {
        return NextResponse.json({ message: 'Bill is already paid' }, { status: 400 });
      }
      if (!bill.currentBillDue || bill.currentBillDue <= 0) {
        return NextResponse.json({ message: 'Bill has no outstanding due amount' }, { status: 400 });
      }

      const transactionId = `BILL-${billId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const customerEmail = bill.clientEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'billing@example.com';

      const data = {
        total_amount: bill.currentBillDue,
        currency: 'BDT',
        tran_id: transactionId,
        success_url: `${baseUrl}/api/payment/success?id=${billId}&type=bill&redirect=${redirectVal}`,
        fail_url: `${baseUrl}/api/payment/fail?id=${billId}&type=bill&redirect=${redirectVal}`,
        cancel_url: `${baseUrl}/api/payment/cancel?id=${billId}&type=bill&redirect=${redirectVal}`,
        ipn_url: `${baseUrl}/api/payment/ipn`,
        shipping_method: 'Courier',
        product_name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Store'} Bill Payment`,
        product_category: 'E-commerce',
        product_profile: 'general',
        cus_name: bill.clientName || 'Customer',
        cus_email: customerEmail,
        cus_add1: bill.clientAddress || 'N/A',
        cus_city: 'Dhaka',
        cus_state: '',
        cus_postcode: '0000',
        cus_country: 'Bangladesh',
        cus_phone: bill.clientPhone || '01700000000',
        ship_name: bill.clientName || 'Customer',
        ship_add1: bill.clientAddress || 'N/A',
        ship_city: 'Dhaka',
        ship_state: '',
        ship_postcode: '0000',
        ship_country: 'Bangladesh',
      };

      const response = await initPayment(data);

      if (response?.GatewayPageURL) {
        // Persist the generated transaction ID on the bill before initiating payment
        bill.transactionId = transactionId;
        await bill.save();

        return NextResponse.json({ url: response.GatewayPageURL });
      } else {
        console.error('SSLCommerz Bill Init Failed. Response:', response);
        return NextResponse.json({ message: 'Failed to initialize payment gateway' }, { status: 500 });
      }
    }

    if (orderId) {
      const order = await Order.findOne({ _id: orderId });

      if (!order) {
        return NextResponse.json({ message: 'Order not found' }, { status: 404 });
      }

      if (order.paymentStatus === 'Paid') {
        return NextResponse.json({ message: 'Order is already paid' }, { status: 400 });
      }

      // Ownership enforcement
      if (order.user) {
        if (!session || !session.user || (session.user as any).id !== order.user.toString()) {
          return NextResponse.json({ message: 'Unauthorized: You do not own this order' }, { status: 401 });
        }
      }

      // Generate a fresh unique transaction ID for every payment attempt
      const transactionId = `TRANS-${orderId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const { shippingAddress } = order;
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.phone) {
        return NextResponse.json({ message: 'Incomplete shipping or contact information' }, { status: 400 });
      }

      // Resolve the owner's email, falling back appropriately
      let customerEmail = '';
      if (order.user) {
        const User = (await import('@/models/User')).default;
        const u = await User.findById(order.user).lean();
        if (u && (u as any).email) {
          customerEmail = (u as any).email;
        }
      }
      if (!customerEmail) {
        customerEmail = session?.user?.email || `guest@${process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'example.com'}`;
      }

      const data = {
        total_amount: order.totalAmount,
        currency: 'BDT',
        tran_id: transactionId,
        success_url: `${baseUrl}/api/payment/success?id=${orderId}&type=order&redirect=${redirectVal}`,
        fail_url: `${baseUrl}/api/payment/fail?id=${orderId}&type=order&redirect=${redirectVal}`,
        cancel_url: `${baseUrl}/api/payment/cancel?id=${orderId}&type=order&redirect=${redirectVal}`,
        ipn_url: `${baseUrl}/api/payment/ipn`,
        shipping_method: 'Courier',
        product_name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Store'} Order`,
        product_category: 'E-commerce',
        product_profile: 'general',
        cus_name: shippingAddress.fullName,
        cus_email: customerEmail,
        cus_add1: shippingAddress.street,
        cus_city: shippingAddress.city,
        cus_state: shippingAddress.state || '',
        cus_postcode: shippingAddress.zipCode || '0000',
        cus_country: shippingAddress.country || 'Bangladesh',
        cus_phone: shippingAddress.phone,
        ship_name: shippingAddress.fullName,
        ship_add1: shippingAddress.street,
        ship_city: shippingAddress.city,
        ship_state: shippingAddress.state || '',
        ship_postcode: shippingAddress.zipCode || '0000',
        ship_country: shippingAddress.country || 'Bangladesh',
      };

      const response = await initPayment(data);

      if (response?.GatewayPageURL) {
        // Save the newly generated transaction ID immediately
        order.transactionId = transactionId;
        await order.save();

        return NextResponse.json({ url: response.GatewayPageURL });
      } else {
        console.error('SSLCommerz Order Init Failed. Response:', response);
        return NextResponse.json({
          message: 'Failed to initialize payment gateway'
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Payment Init Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

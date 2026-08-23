import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Payment from '@/models/Payment';
import { auth } from '@/auth';

// GET /api/payments - Fetch user's own manual payment history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // Assuming user id is stored in session.user.id or we can look up by email
    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ message: 'User ID not found in session' }, { status: 400 });
    }
    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { message: 'Error fetching payments' },
      { status: 500 }
    );
  }
}

const rateLimit = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record) {
    rateLimit.set(ip, { count: 1, lastRequest: now });
    return false;
  }
  if (now - record.lastRequest > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, lastRequest: now });
    return false;
  }
  if (record.count >= MAX_REQUESTS) return true;
  record.count += 1;
  record.lastRequest = now;
  return false;
}

// POST /api/payments - Submit a new manual payment verification
export async function POST(req: NextRequest) {
  const session = await auth();

  // Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { clientName, clientMobile, clientEmail, amount, paymentMethod, transactionId, senderNumber, notes } = body;

    // Validate and coerce amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 });
    }
    const MAX_AMOUNT = 10000000; // 10 million sane maximum
    if (parsedAmount > MAX_AMOUNT) {
      return NextResponse.json({ message: 'Payment amount exceeds maximum limit' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { message: 'Payment Method is required' },
        { status: 400 }
      );
    }

    if (paymentMethod !== 'Scan QR' && !transactionId && !senderNumber) {
      return NextResponse.json(
        { message: 'Either Transaction ID or Sender Number must be provided.' },
        { status: 400 }
      );
    }

    // Input sanitization and length checks
    const sanitizedName = typeof clientName === 'string' ? clientName.trim() : '';
    if (sanitizedName.length > 100) {
      return NextResponse.json({ message: 'Client name is too long' }, { status: 400 });
    }

    const sanitizedEmail = typeof clientEmail === 'string' ? clientEmail.trim().toLowerCase() : '';
    if (sanitizedEmail) {
      if (sanitizedEmail.length > 100) {
        return NextResponse.json({ message: 'Client email is too long' }, { status: 400 });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
      }
    }

    const sanitizedMobile = typeof clientMobile === 'string' ? clientMobile.trim() : '';
    if (sanitizedMobile.length > 20) {
      return NextResponse.json({ message: 'Client mobile number is too long' }, { status: 400 });
    }

    const sanitizedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (sanitizedNotes.length > 1000) {
      return NextResponse.json({ message: 'Notes are too long' }, { status: 400 });
    }

    const userId = (session?.user as any)?.id;

    const newPayment = new Payment({
      user: userId || undefined,
      clientName: sanitizedName || undefined,
      clientMobile: sanitizedMobile || undefined,
      clientEmail: sanitizedEmail || undefined,
      amount: parsedAmount,
      paymentMethod,
      transactionId: typeof transactionId === 'string' ? transactionId.trim() : transactionId,
      senderNumber: typeof senderNumber === 'string' ? senderNumber.trim() : senderNumber,
      notes: sanitizedNotes || undefined,
    });

    await newPayment.save();

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting payment:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { message: 'Validation failed', errors: messages },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Error submitting payment' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LoanProvider from '@/models/LoanProvider';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const providers = await LoanProvider.find({}).sort({ name: 1 });
    return NextResponse.json(providers);
  } catch (error: any) {
    console.error('Error fetching loan providers:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, address, description } = body;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    await connectToDatabase();
    const provider = await LoanProvider.create({
      name,
      phone: normalizePhoneNumber(phone),
      email,
      address,
      description,
    });

    return NextResponse.json({ message: 'Loan provider created successfully', provider }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating loan provider:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

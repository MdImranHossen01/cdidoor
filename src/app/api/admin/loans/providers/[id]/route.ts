import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LoanProvider from '@/models/LoanProvider';
import BusinessLoan from '@/models/BusinessLoan';
import { normalizePhoneNumber } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
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
    const provider = await LoanProvider.findByIdAndUpdate(
      resolvedParams.id,
      { name, phone: normalizePhoneNumber(phone), email, address, description },
      { new: true }
    );

    if (!provider) {
      return NextResponse.json({ message: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider updated successfully', provider });
  } catch (error: any) {
    console.error('Error updating loan provider:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if there are active loans associated with this provider
    const associatedLoans = await BusinessLoan.countDocuments({ lenderId: resolvedParams.id });
    if (associatedLoans > 0) {
      return NextResponse.json({ message: 'Cannot delete provider with associated loans.' }, { status: 400 });
    }

    const provider = await LoanProvider.findByIdAndDelete(resolvedParams.id);
    if (!provider) {
      return NextResponse.json({ message: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting loan provider:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

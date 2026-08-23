import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import SalaryDisbursement from '@/models/SalaryDisbursement';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Missing disbursement ID' }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await SalaryDisbursement.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: 'Disbursement not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Disbursement deleted successfully' });
  } catch (error: any) {
    console.error('Delete Disbursement Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

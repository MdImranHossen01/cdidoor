import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import { auth } from '@/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { 
      name, accountNo, note, 
      accountCategory, mfsProvider, mfsType, branchName, bankAccountType 
    } = body;

    await connectToDatabase();

    const account = await LedgerAccount.findById(id);
    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Only allow editing custom accounts
    if (!account.code.startsWith('AC')) {
      return NextResponse.json({ message: 'Default accounts cannot be modified' }, { status: 400 });
    }

    if (name) account.name = name;
    if (accountNo !== undefined) account.accountNo = accountNo;
    if (note !== undefined) account.note = note;
    if (accountCategory !== undefined) account.accountCategory = accountCategory;
    if (mfsProvider !== undefined) account.mfsProvider = mfsProvider;
    if (mfsType !== undefined) account.mfsType = mfsType;
    if (branchName !== undefined) account.branchName = branchName;
    if (bankAccountType !== undefined) account.bankAccountType = bankAccountType;

    await account.save();

    return NextResponse.json(account, { status: 200 });
  } catch (error: any) {
    console.error(`PUT /api/accounts/[id] error:`, error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const account = await LedgerAccount.findById(id);
    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Only allow deleting custom accounts
    if (!account.code.startsWith('AC')) {
      return NextResponse.json({ message: 'Default accounts cannot be deleted' }, { status: 400 });
    }

    await LedgerAccount.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/accounts/[id] error:`, error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

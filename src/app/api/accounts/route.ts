import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import User from '@/models/User';
import { auth } from '@/auth';
import { seedLedgerAccounts } from '@/lib/ledgerHelper';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();
    
    // Ensure primary accounts exist
    await seedLedgerAccounts();

    const accounts = await LedgerAccount.find({
      $or: [
        { code: /^AC/ },
        { code: 'CASH' }
      ]
    })
      .populate('createdBy', 'name')
      .lean();

    // Sort: CASH account first, then others by createdAt descending
    accounts.sort((a: any, b: any) => {
      if (a.code === 'CASH') return -1;
      if (b.code === 'CASH') return 1;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json(accounts, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, accountNo, openingBalance, note, 
      accountCategory, mfsProvider, mfsType, branchName, bankAccountType 
    } = body;

    if (!name) {
      return NextResponse.json({ message: 'Account Name is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate custom code e.g., AC001, AC002
    // Count custom accounts (ones that start with AC)
    const count = await LedgerAccount.countDocuments({ code: /^AC/ });
    const nextNum = count + 1;
    const code = `AC${nextNum.toString().padStart(3, '0')}`;

    const newAccount = new LedgerAccount({
      name,
      code,
      accountCategory,
      mfsProvider: accountCategory === 'MFS' ? mfsProvider : undefined,
      mfsType: accountCategory === 'MFS' ? mfsType : undefined,
      branchName: accountCategory === 'Bank' ? branchName : undefined,
      bankAccountType: accountCategory === 'Bank' ? bankAccountType : undefined,
      accountNo,
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
      type: 'asset', // Defaulting to asset for generic accounts
      note,
      createdBy: (session.user as any).id,
    });

    await newAccount.save();

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

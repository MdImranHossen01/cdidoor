import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== 'employee' && userRole !== 'showroom_manager')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const disbursements = await Expense.find({
      employee: userId,
      category: { $in: ['Staff Salary', 'Wages'] }
    })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ disbursements });
  } catch (error: any) {
    console.error('Fetch Employee Salaries Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

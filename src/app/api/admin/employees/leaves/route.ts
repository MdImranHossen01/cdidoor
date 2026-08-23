import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Leave from '@/models/Leave';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id || (session?.user as any)?._id;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let query: any = {};
    if (['employee', 'showroom_manager', 'manager'].includes(userRole)) {
      query.employee = userId;
    } else if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'name email phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({ leaves });
  } catch (error: any) {
    console.error('Fetch Leaves Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id || (session?.user as any)?._id;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, startDate, endDate, reason } = body;

    let targetEmployee = userId;
    if (['admin', 'super_admin'].includes(userRole) && employeeId) {
      targetEmployee = employeeId;
    }

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ message: 'Missing required leave fields' }, { status: 400 });
    }

    await connectToDatabase();

    const leave = await Leave.create({
      employee: targetEmployee,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'Pending'
    });

    return NextResponse.json({
      message: 'Leave request submitted successfully',
      leave
    });
  } catch (error: any) {
    console.error('Submit Leave Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

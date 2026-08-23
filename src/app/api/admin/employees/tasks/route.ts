/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
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

    const query: any = {};
    if (['employee', 'showroom_manager', 'manager'].includes(userRole)) {
      if (!userId) {
        return NextResponse.json({ tasks: [] });
      }
      query.employee = userId;
    } else if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    } else {
      const { searchParams } = new URL(req.url);
      const employeeFilter = searchParams.get('employeeId');
      if (employeeFilter) query.employee = employeeFilter;
    }

    const tasks = await Task.find(query)
      .populate('employee', 'name email phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Fetch Tasks Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, title, description, payout, dueDate } = body;

    if (!employeeId || !title) {
      return NextResponse.json({ message: 'Missing required task fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify employee exists
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return NextResponse.json({ message: 'Employee user not found' }, { status: 404 });
    }

    const task = await Task.create({
      employee: employeeId,
      title,
      description: description || '',
      payout: payout ? Number(payout) : 0,
      status: 'Pending',
      assignedDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return NextResponse.json({
      message: 'Task assigned successfully',
      task
    });
  } catch (error: any) {
    console.error('Create Task Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

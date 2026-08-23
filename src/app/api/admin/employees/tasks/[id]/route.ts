/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id || (session?.user as any)?._id;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body;

    if (['employee', 'showroom_manager', 'manager'].includes(userRole)) {
      // Employees can only mark their own task as completed
      if (task.employee.toString() !== userId.toString()) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      if (status !== 'Completed') {
        return NextResponse.json({ message: 'Employees can only mark tasks as Completed' }, { status: 400 });
      }

      if (task.status !== 'Pending') {
        return NextResponse.json({ message: 'Only pending tasks can be marked as completed' }, { status: 400 });
      }

      task.status = 'Completed';
      task.completedDate = new Date();
      await task.save();

      return NextResponse.json({ message: 'Task marked as Completed', task });
    }

    if (['admin', 'super_admin'].includes(userRole)) {
      if (status) {
        task.status = status;
        if (status === 'Completed' && !task.completedDate) {
          task.completedDate = new Date();
        }
        await task.save();
      }

      return NextResponse.json({ message: 'Task updated successfully', task });
    }

    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  } catch (error: any) {
    console.error('Update Task Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'Pending') {
      return NextResponse.json({ message: 'Can only delete pending tasks' }, { status: 400 });
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Delete Task Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

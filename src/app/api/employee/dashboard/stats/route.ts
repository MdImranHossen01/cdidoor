import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';
import Leave from '@/models/Leave';
import Task from '@/models/Task';
import EmployeeProfile from '@/models/EmployeeProfile';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== 'employee' && userRole !== 'showroom_manager')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Auto-fill presence for monthly staff (excluding weekends & manual leaves/absents)
    try {
      const { autoFillMissingAttendance } = await import('@/lib/autoAttendance');
      await autoFillMissingAttendance();
    } catch (e) {
      console.warn('Auto attendance fill error:', e);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Employee profile info
    const profile = await EmployeeProfile.findOne({ user: userId }).lean() as any;

    // This month's salary disbursements
    const monthSalaries = await Expense.find({
      employee: userId,
      category: { $in: ['Staff Salary', 'Wages'] },
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();
    const monthSalaryTotal = monthSalaries.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

    // All salary total
    const allSalaries = await Expense.find({ 
      employee: userId,
      category: { $in: ['Staff Salary', 'Wages'] }
    }).sort({ date: -1 }).limit(6).lean();

    // Leaves
    const pendingLeaves = await Leave.countDocuments({ employee: userId, status: 'Pending' });
    const approvedLeaves = await Leave.countDocuments({ employee: userId, status: 'Approved' });
    const recentLeaves = await Leave.find({ employee: userId }).sort({ createdAt: -1 }).limit(5).lean();

    // Tasks
    const pendingTasks = await Task.countDocuments({ employee: userId, status: 'Pending' });
    const completedTasks = await Task.countDocuments({ employee: userId, status: 'Completed' });
    const paidTasks = await Task.countDocuments({ employee: userId, status: 'Paid' });
    const allEmployeeTasks = await Task.find({ employee: userId }).lean();
    const totalTaskEarnings = allEmployeeTasks
      .filter((t: any) => t.status === 'Completed' || t.status === 'Paid')
      .reduce((sum: number, t: any) => sum + (t.payout || 0), 0);
    const pendingTaskPayout = allEmployeeTasks
      .filter((t: any) => t.status === 'Completed')
      .reduce((sum: number, t: any) => sum + (t.payout || 0), 0);

    const recentTasks = await Task.find({ employee: userId, status: { $in: ['Pending', 'Completed', 'Paid'] } })
      .sort({ assignedDate: -1 }).limit(5).lean();

    // Attendance (for monthly employees)
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const presentDaysCount = await (await import('@/models/Attendance')).default.countDocuments({
      employee: userId,
      date: { $regex: `^${currentMonthPrefix}` },
      status: { $in: ['Present', 'Late'] }
    });

    return NextResponse.json({
      profile: {
        employeeType: profile?.employeeType || 'monthly',
        baseSalary: profile?.baseSalary || 0,
        joinedDate: profile?.joinedDate,
      },
      salary: {
        thisMonth: monthSalaryTotal,
        history: allSalaries,
      },
      attendance: {
        presentThisMonth: presentDaysCount,
      },
      leaves: { pending: pendingLeaves, approved: approvedLeaves, recent: recentLeaves },
      tasks: {
        pending: pendingTasks,
        completed: completedTasks,
        paid: paidTasks,
        totalEarnings: totalTaskEarnings,
        pendingPayout: pendingTaskPayout,
        recent: recentTasks
      },
    });
  } catch (error: any) {
    console.error('Employee Dashboard Stats Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

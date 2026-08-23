/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import User from '@/models/User';
import Order from '@/models/Order';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const showrooms = await Showroom.find({})
      .populate('manager', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const showroomsWithStats = await Promise.all(
      showrooms.map(async (showroom) => {
        // Today's Sales
        const todayOrders = await Order.find({
          showroom: showroom._id,
          status: { $ne: 'Cancelled' },
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        });
        const todaySales = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // This Month's Sales
        const monthOrders = await Order.find({
          showroom: showroom._id,
          status: { $ne: 'Cancelled' },
          createdAt: { $gte: startOfMonth, $lte: endOfToday },
        });
        const monthSales = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // Query real approved expenses for Today's Cost
        const todayExpenses = await Expense.find({
          showroom: showroom._id,
          status: 'Approved',
          type: 'expense',
          date: { $gte: startOfToday, $lte: endOfToday },
        });
        const todayCost = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // Query real approved expenses for This Month's Cost
        const monthExpenses = await Expense.find({
          showroom: showroom._id,
          status: 'Approved',
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfToday },
        });
        const monthCost = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // Query real pending expenses for Pending Cost
        const pendingExpenses = await Expense.find({
          showroom: showroom._id,
          status: 'Pending',
          type: 'expense',
        });
        const pendingCost = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        return {
          ...(showroom as any),
          todaySales,
          monthSales,
          todayCost,
          monthCost,
          pendingCost,
        };
      })
    );

    // Sort by this month's sales in descending order
    showroomsWithStats.sort((a, b) => b.monthSales - a.monthSales);

    return NextResponse.json({ showrooms: showroomsWithStats });
  } catch (error) {
    console.error('Fetch Showrooms Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, address, image, manager } = await req.json();

    if (!name || !manager) {
      return NextResponse.json({ message: 'Name and Manager are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify manager exists and is a manager
    const managerUser = await User.findById(manager);
    if (!managerUser) {
      return NextResponse.json({ message: 'Manager user not found' }, { status: 404 });
    }

    if (managerUser.role !== 'showroom_manager' && managerUser.role !== 'manager') {
      return NextResponse.json({ message: 'Selected user must have showroom_manager or manager role' }, { status: 400 });
    }
    // Update role to showroom_manager if it was manager
    if (managerUser.role === 'manager') {
      managerUser.role = 'showroom_manager';
      await managerUser.save();
    }

    // Check if this manager is already assigned to another showroom
    const existingShowroom = await Showroom.findOne({ manager });
    if (existingShowroom) {
      return NextResponse.json({ message: 'This manager is already assigned to showroom: ' + existingShowroom.name }, { status: 400 });
    }

    const newShowroom = await Showroom.create({
      name,
      address,
      image,
      manager,
      isActive: true,
    });

    return NextResponse.json({
      message: 'Showroom created successfully',
      showroom: newShowroom
    });
  } catch (error: any) {
    console.error('Create Showroom Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'This manager is already assigned to a showroom' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, address, image, manager, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Showroom ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const showroom = await Showroom.findById(id);
    if (!showroom) {
      return NextResponse.json({ message: 'Showroom not found' }, { status: 404 });
    }

    if (manager && manager !== showroom.manager.toString()) {
      // Verify new manager exists and is a manager
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return NextResponse.json({ message: 'Manager user not found' }, { status: 404 });
      }

      if (managerUser.role !== 'showroom_manager' && managerUser.role !== 'manager') {
        return NextResponse.json({ message: 'Selected user must have showroom_manager or manager role' }, { status: 400 });
      }
      if (managerUser.role === 'manager') {
        managerUser.role = 'showroom_manager';
        await managerUser.save();
      }

      // Check if this manager is already assigned to another showroom
      const existingShowroom = await Showroom.findOne({ manager, _id: { $ne: id } });
      if (existingShowroom) {
        return NextResponse.json({ message: 'This manager is already assigned to showroom: ' + existingShowroom.name }, { status: 400 });
      }
      showroom.manager = manager;
    }

    if (name) showroom.name = name;
    if (address !== undefined) showroom.address = address;
    if (image !== undefined) showroom.image = image;
    if (isActive !== undefined) showroom.isActive = isActive;

    await showroom.save();

    return NextResponse.json({
      message: 'Showroom updated successfully',
      showroom
    });
  } catch (error: any) {
    console.error('Update Showroom Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Showroom ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    await Showroom.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Showroom deleted successfully' });
  } catch (error: any) {
    console.error('Delete Showroom Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import Order from '@/models/Order';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find the showroom assigned to this manager
    const showroom = await Showroom.findOne({ manager: userId }).lean();
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';

    // Main query: only show orders for this showroom
    let query: any = { showroom: showroom._id, deletedAt: null };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);

      const userIds = await User.find({
        $or: [
          { name: { $regex: sanitizedSearch, $options: 'i' } },
          { email: { $regex: sanitizedSearch, $options: 'i' } }
        ]
      }).limit(100).select('_id');

      const searchConditions: any[] = [
        { "shippingAddress.fullName": { $regex: sanitizedSearch, $options: 'i' } },
        { "shippingAddress.phone": { $regex: sanitizedSearch, $options: 'i' } }
      ];

      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: search });
      } else if (search.length >= 8) {
        searchConditions.push({ shortId: { $regex: sanitizedSearch, $options: 'i' } });
      }

      if (userIds.length > 0) {
        searchConditions.push({ user: { $in: userIds.map(u => u._id) } });
      }

      query.$and = [{ $or: searchConditions }];
    }

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('showroom', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Calculate tab counts
    const countQuery = { showroom: showroom._id, deletedAt: null };
    const allCounts = await Order.aggregate([
      { $match: countQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = {
      all: 0,
      placed: 0,
      processing: 0,
      courier: 0,
      completed: 0,
      cancelled: 0,
      hold: 0,
      returned: 0
    };

    allCounts.forEach((c: any) => {
      counts.all += c.count;
      if (c._id === 'Order Placed') counts.placed = c.count;
      else if (c._id === 'Processing') counts.processing = c.count;
      else if (c._id === 'Shipped via Courier') counts.courier = c.count;
      else if (c._id === 'Completed') counts.completed = c.count;
      else if (c._id === 'Cancelled') counts.cancelled = c.count;
      else if (c._id === 'On Hold') counts.hold = c.count;
      else if (c._id === 'Returned') counts.returned = c.count;
    });

    return NextResponse.json({
      orders,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      counts
    });
  } catch (error: any) {
    console.error('Error fetching showroom orders:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

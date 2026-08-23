import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import StockTransfer from '@/models/StockTransfer';
import { auth } from '@/auth';
import Showroom from '@/models/Showroom';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !['showroom_manager', 'manager'].includes((session.user as any)?.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: session.user.id });
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 400 });
    }

    const showroomId = showroom._id;
    const searchParams = req.nextUrl.searchParams;
    const parsedPage = parseInt(searchParams.get('page') || '1');
    const parsedLimit = parseInt(searchParams.get('limit') || '10');
    const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
    const limit = Math.min(100, Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit));
    const skip = (page - 1) * limit;

    const query = { showroom: showroomId, status: 'pending' as const };

    const [transfers, total] = await Promise.all([
      StockTransfer.find(query)
        .populate('product', 'name sku images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockTransfer.countDocuments(query)
    ]);

    return NextResponse.json({
      transfers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import Product from '@/models/Product';

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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search');

    // Filter query: only show products associated with this showroom
    const query: any = {
      'showroomStocks.showroom': showroom._id
    };

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { sku: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('name sku price salePrice showroomStocks images slug isPublished')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    // Map product objects to inject only the current showroom's stock as the main stock value
    const mappedProducts = products.map((product: any) => {
      const specificStock = product.showroomStocks?.find(
        (s: any) => s.showroom && s.showroom.toString() === showroom._id.toString()
      )?.stock ?? 0;

      const { showroomStocks, ...rest } = product;

      return {
        ...rest,
        // Override main stock with showroom-specific stock
        stock: specificStock
      };
    });

    return NextResponse.json({
      products: mappedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching showroom stock:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

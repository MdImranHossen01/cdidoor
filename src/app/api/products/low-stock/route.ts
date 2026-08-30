import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Showroom from '@/models/Showroom';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || !session.user || !(['admin', 'super_admin', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let showroomId: string | null = null;
    let showroomName = '';
    if (userRole === 'showroom_manager') {
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (!showroom) {
        return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
      }
      showroomId = showroom._id.toString();
      showroomName = showroom.name;
    }

    // Fetch all showrooms to map showroom IDs to names
    const showrooms = await Showroom.find().lean();
    const showroomMap: Record<string, string> = {};
    showrooms.forEach(s => {
      showroomMap[s._id.toString()] = s.name;
    });

    // Fetch all products (to check central, variant, and showroom stocks)
    // To optimize, we could query for stock < 5, but for safety against complex subdocument checks, we'll fetch lean and filter in memory if the dataset isn't huge.
    // Or we can query $or: [ { stock: { $lt: 5 } }, { 'variants.stock': { $lt: 5 } }, { 'showroomStocks.stock': { $lt: 5 } } ]
    const products = await Product.find({
      $or: [
        { stock: { $lt: 5 } },
        { 'variants.stock': { $lt: 5 } },
        { 'showroomStocks.stock': { $lt: 5 } }
      ]
    }).lean();

    const lowStockItems: any[] = [];
    const isShowroomMgr = userRole === 'showroom_manager';

    for (const product of products) {
      // Check Central Base Stock (if no variants, or we track base stock) - only for admin/manager
      if (!isShowroomMgr && product.stock < 5) {
        lowStockItems.push({
          id: `${product._id}-central`,
          productId: product._id,
          name: product.name,
          color: null,
          size: null,
          location: 'Central Warehouse',
          stock: product.stock || 0,
        });
      }

      // Check Variants (Central) - only for admin/manager
      if (!isShowroomMgr && product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.stock < 5) {
            lowStockItems.push({
              id: `${product._id}-variant-${variant._id}`,
              productId: product._id,
              name: product.name,
              color: variant.color || null,
              size: variant.size || null,
              location: 'Central Warehouse',
              stock: variant.stock || 0,
            });
          }
        }
      }

      // Check Showroom Stocks - filter by assigned showroom for showroom manager
      if (product.showroomStocks && Array.isArray(product.showroomStocks)) {
        for (const srStock of product.showroomStocks) {
          const isThisShowroom = showroomId ? srStock.showroom.toString() === showroomId : true;
          if (isThisShowroom && srStock.stock < 5) {
            lowStockItems.push({
              id: `${product._id}-showroom-${srStock.showroom}`,
              productId: product._id,
              name: product.name,
              color: null,
              size: null,
              location: showroomName || showroomMap[srStock.showroom.toString()] || 'Unknown Showroom',
              stock: srStock.stock || 0,
            });
          }
        }
      }
    }

    // Sort by lowest stock first
    lowStockItems.sort((a, b) => a.stock - b.stock);

    return NextResponse.json({ items: lowStockItems }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching low stock:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

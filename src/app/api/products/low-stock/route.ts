import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Showroom from '@/models/Showroom';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

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

    for (const product of products) {
      // Check Central Base Stock (if no variants, or we track base stock)
      if (product.stock < 5) {
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

      // Check Variants (Central)
      if (product.variants && Array.isArray(product.variants)) {
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

      // Check Showroom Stocks
      if (product.showroomStocks && Array.isArray(product.showroomStocks)) {
        for (const srStock of product.showroomStocks) {
          if (srStock.stock < 5) {
            lowStockItems.push({
              id: `${product._id}-showroom-${srStock.showroom}`,
              productId: product._id,
              name: product.name,
              color: null,
              size: null,
              location: showroomMap[srStock.showroom.toString()] || 'Unknown Showroom',
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

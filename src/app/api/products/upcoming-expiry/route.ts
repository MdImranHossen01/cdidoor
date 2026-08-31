import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
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
    if (userRole === 'showroom_manager') {
      const Showroom = (await import('@/models/Showroom')).default;
      const showroom = await Showroom.findOne({ manager: userId }).lean();
      if (!showroom) {
        return NextResponse.json({ message: 'No showroom assigned' }, { status: 404 });
      }
      showroomId = showroom._id.toString();
    }

    // Calculate the date 30 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);
    next30Days.setHours(23, 59, 59, 999); // End of the 30th day

    // Fetch all products that have batches (either top-level or variant-level)
    const products = await Product.find({
      $or: [
        { 'batches.expiryDate': { $exists: true } },
        { 'variants.batches.expiryDate': { $exists: true } }
      ]
    }).lean();

    const expiringBatches: any[] = [];

    const hasShowroomStock = (prod: any) => {
      if (!showroomId) return true;
      const srStock = (prod.showroomStocks || []).find((s: any) => s.showroom?.toString() === showroomId);
      return srStock && srStock.stock > 0;
    };

    // Process products to flatten the batches
    for (const product of products) {
      if (!hasShowroomStock(product)) continue;

      // Top level batches
      if (product.batches && Array.isArray(product.batches)) {
        for (const batch of product.batches) {
          if (batch.expiryDate) {
            const expDate = new Date(batch.expiryDate);
            if (expDate <= next30Days && batch.stock > 0) {
              expiringBatches.push({
                id: `${product._id}-${batch.batchNumber}`,
                productId: product._id,
                name: product.name,
                color: null,
                size: null,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                stock: batch.stock,
              });
            }
          }
        }
      }

      // Variant level batches
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.batches && Array.isArray(variant.batches)) {
            for (const batch of variant.batches) {
              if (batch.expiryDate) {
                const expDate = new Date(batch.expiryDate);
                if (expDate <= next30Days && batch.stock > 0) {
                  expiringBatches.push({
                    id: `${product._id}-${variant._id}-${batch.batchNumber}`,
                    productId: product._id,
                    name: product.name,
                    color: variant.color || null,
                    size: variant.size || null,
                    batchNumber: batch.batchNumber,
                    expiryDate: batch.expiryDate,
                    stock: batch.stock,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Sort by closest expiry date
    expiringBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return NextResponse.json({ batches: expiringBatches }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching upcoming expiry:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

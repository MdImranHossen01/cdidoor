import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';


export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session || ((session.user as any)?.role !== 'super_admin' && (session.user as any)?.role !== 'admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { productId, batchNumber: rawBatchNumber, expiryDate, variantStocks, topLevelStock } = await req.json();

    if (!productId) {
      return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    const batchNumber = rawBatchNumber?.trim() || 'DEFAULT';

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Process top-level stock
    if (topLevelStock > 0) {
      product.stock += topLevelStock;
      
      const existingBatchIndex = (product.batches || []).findIndex((b: any) => b.batchNumber === batchNumber);
      if (existingBatchIndex >= 0) {
        (product.batches || [])[existingBatchIndex].stock += topLevelStock;
        if (expiryDate) (product.batches || [])[existingBatchIndex].expiryDate = new Date(expiryDate);
      } else {
        if(!product.batches) product.batches = []; product.batches.push({
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          stock: topLevelStock
        });
      }
    }

    // Process variant stocks
    if (variantStocks && Array.isArray(variantStocks)) {
      variantStocks.forEach((vStock) => {
        if (vStock.stockToAdd > 0) {
          const variant = product.variants?.find((v: any) => v._id?.toString() === vStock.variantId);
          if (variant) {
            variant.stock += vStock.stockToAdd;
            
            const vBatchIndex = (variant.batches || []).findIndex((b: any) => b.batchNumber === batchNumber);
            if (vBatchIndex >= 0) {
              (variant.batches || [])[vBatchIndex].stock += vStock.stockToAdd;
              if (expiryDate) (variant.batches || [])[vBatchIndex].expiryDate = new Date(expiryDate);
            } else {
              (variant.batches || []).push({
                batchNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                stock: vStock.stockToAdd
              });
            }
          }
        }
      });
    }

    await product.save();

    return NextResponse.json({ message: 'Stock added successfully', product }, { status: 200 });
  } catch (error: any) {
    console.error('Add Stock Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

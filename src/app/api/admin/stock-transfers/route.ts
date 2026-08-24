import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import StockTransfer from '@/models/StockTransfer';
import Product from '@/models/Product';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ message: 'Invalid JSON request body' }, { status: 400 });
    }

    const { productId, sourceShowroomId, showroomId, quantity, notes, batchNumber } = body;

    const qty = Number(quantity);
    if (!productId || !showroomId || isNaN(qty) || !Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ message: 'Missing required fields or invalid quantity' }, { status: 400 });
    }

    const normSource = (sourceShowroomId && sourceShowroomId !== 'central') ? sourceShowroomId : 'central';
    const normDest = (showroomId && showroomId !== 'central') ? showroomId : 'central';

    if (normSource === normDest) {
      return NextResponse.json({ message: 'Source and destination cannot be the same' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const dbSession = await conn.startSession();
    dbSession.startTransaction();

    try {
      const product = await Product.findById(productId).session(dbSession);
      if (!product) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }

      // Check global batch stock if transferring from central with specific batch
      let batchIndex = -1;
      if (normSource === 'central' && batchNumber && batchNumber !== 'auto') {
        batchIndex = product.batches?.findIndex((b: any) => b.batchNumber === batchNumber) ?? -1;
        if (batchIndex === -1 || product.batches![batchIndex].stock < qty) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return NextResponse.json({ message: `Insufficient stock in batch ${batchNumber}` }, { status: 400 });
        }
      }

      // Deduct stock from the source
      if (normSource !== 'central') {
        const sourceShowroomIndex = product.showroomStocks?.findIndex(s => s.showroom.toString() === normSource) ?? -1;
        if (sourceShowroomIndex === -1 || (product.showroomStocks![sourceShowroomIndex].stock < qty)) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return NextResponse.json({ message: 'Insufficient stock in source showroom' }, { status: 400 });
        }
        product.showroomStocks![sourceShowroomIndex].stock -= qty;
      } else {
        if (product.stock < qty) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return NextResponse.json({ message: 'Insufficient central stock' }, { status: 400 });
        }
        product.stock -= qty;
        if (batchIndex !== -1) {
          product.batches![batchIndex].stock -= qty;
        }
      }

      const isDestCentral = normDest === 'central';
      
      // Auto-approve if transferring back to Central
      if (isDestCentral) {
        product.stock += qty;
      }

      await product.save({ session: dbSession });

      const [transfer] = await StockTransfer.create([{
        product: productId,
        sourceShowroom: normSource !== 'central' ? normSource : undefined,
        showroom: isDestCentral ? undefined : normDest,
        quantity: qty,
        notes: batchNumber && batchNumber !== 'auto' ? (notes ? `${notes} (Batch: ${batchNumber})` : `Batch: ${batchNumber}`) : notes,
        status: isDestCentral ? 'approved' : 'pending'
      }], { session: dbSession });

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({ message: 'Stock transfer initiated successfully', transfer }, { status: 201 });
    } catch (txErr) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw txErr;
    }
  } catch (error: any) {
    console.error('Error creating stock transfer:', error);
    const status = typeof error.status === 'number' ? error.status : 500;
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status });
  }
}

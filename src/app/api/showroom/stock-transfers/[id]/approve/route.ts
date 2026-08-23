import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import StockTransfer from '@/models/StockTransfer';
import Product from '@/models/Product';
import { auth } from '@/auth';
import Showroom from '@/models/Showroom';
import mongoose from 'mongoose';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user || !['showroom_manager', 'manager'].includes((session.user as any)?.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const { action } = body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    await connectToDatabase();

    const showroom = await Showroom.findOne({ manager: session.user.id });
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned' }, { status: 400 });
    }

    const dbSession = await mongoose.startSession();
    let resultMessage = '';
    let customErrorResponse: NextResponse | null = null;

    try {
      await dbSession.withTransaction(async () => {
        const transfer = await StockTransfer.findById(id).session(dbSession);
        if (!transfer) {
          customErrorResponse = NextResponse.json({ message: 'Transfer not found' }, { status: 404 });
          throw new Error('Transfer not found');
        }

        if (!transfer.showroom) {
          customErrorResponse = NextResponse.json({ message: 'Unauthorized for this showroom' }, { status: 403 });
          throw new Error('Showroom not specified on transfer');
        }

        if (transfer.showroom.toString() !== showroom._id.toString()) {
          customErrorResponse = NextResponse.json({ message: 'Unauthorized for this showroom' }, { status: 403 });
          throw new Error('Unauthorized for this showroom');
        }

        if (transfer.status !== 'pending') {
          customErrorResponse = NextResponse.json({ message: 'Transfer is already processed' }, { status: 400 });
          throw new Error('Transfer is already processed');
        }

        const product = await Product.findById(transfer.product).session(dbSession);
        if (!product) {
          customErrorResponse = NextResponse.json({ message: 'Product not found' }, { status: 404 });
          throw new Error('Product not found');
        }

        // Atomically claim the transfer status
        const updatedTransfer = await StockTransfer.findOneAndUpdate(
          { _id: id, status: 'pending' },
          { status: action === 'approve' ? 'approved' : 'rejected' },
          { session: dbSession, new: true }
        );

        if (!updatedTransfer) {
          customErrorResponse = NextResponse.json({ message: 'Transfer is already processed' }, { status: 400 });
          throw new Error('Transfer is already processed');
        }

        if (action === 'approve') {
          // Update destination showroom stock in Product
          const destShowroomIndex = product.showroomStocks?.findIndex(
            (s: any) => s.showroom && s.showroom.toString() === updatedTransfer.showroom!.toString()
          ) ?? -1;

          if (!product.showroomStocks) {
            product.showroomStocks = [];
          }

          if (destShowroomIndex > -1) {
            product.showroomStocks[destShowroomIndex].stock += updatedTransfer.quantity;
          } else if (updatedTransfer.showroom) {
            product.showroomStocks.push({
              showroom: updatedTransfer.showroom,
              stock: updatedTransfer.quantity
            });
          }
        } else if (action === 'reject') {
          // Refund the reserved stock back to the source
          if (updatedTransfer.sourceShowroom) {
            const sourceShowroomIndex = product.showroomStocks?.findIndex(
              (s: any) => s.showroom && s.showroom.toString() === updatedTransfer.sourceShowroom!.toString()
            ) ?? -1;
            
            if (!product.showroomStocks) {
              product.showroomStocks = [];
            }

            if (sourceShowroomIndex > -1) {
              product.showroomStocks[sourceShowroomIndex].stock += updatedTransfer.quantity;
            } else {
              product.showroomStocks.push({
                showroom: updatedTransfer.sourceShowroom,
                stock: updatedTransfer.quantity
              });
            }
          } else {
            product.stock += updatedTransfer.quantity;
          }
        }

        await product.save({ session: dbSession });
        resultMessage = `Transfer ${action}d successfully`;
      });

      return NextResponse.json({ message: resultMessage });
    } catch (error: any) {
      if (customErrorResponse) {
        return customErrorResponse;
      }
      throw error;
    } finally {
      await dbSession.endSession();
    }
  } catch (error: any) {
    console.error('Error processing stock transfer:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

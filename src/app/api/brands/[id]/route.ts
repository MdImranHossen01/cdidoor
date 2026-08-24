/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Brand from '@/models/Brand';
import Product from '@/models/Product';
import { auth } from '@/auth';

// GET a single brand
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const brand = await Brand.findOne(query);

    if (!brand) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update a brand (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist allowed fields to prevent mass-assignment
    const allowedFields = ['name', 'slug', 'image', 'isActive'];
    const updateData: any = {};

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    // Check if new slug already exists for another brand
    if (updateData.slug) {
      const existingBrand = await Brand.findOne({ slug: updateData.slug });
      if (existingBrand && existingBrand._id.toString() !== id && existingBrand.slug !== id) {
        return NextResponse.json({ message: 'Brand with this slug already exists' }, { status: 400 });
      }
    }

    const updatedBrand = await Brand.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedBrand) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    revalidateTag('brands', 'max');
    revalidatePath('/');

    return NextResponse.json(updatedBrand);
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a brand (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    
    // Find the brand first to get its _id
    const brand = await Brand.findOne(query);
    if (!brand) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    // Check if brand is associated with any products
    const associatedProducts = await Product.countDocuments({ brand: brand._id });
    if (associatedProducts > 0) {
      return NextResponse.json({ 
        message: `Cannot delete brand. It is associated with ${associatedProducts} product(s).` 
      }, { status: 400 });
    }

    await Brand.deleteOne({ _id: brand._id });

    revalidateTag('brands', 'max');
    revalidatePath('/');

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { auth } from '@/auth';
import { deleteFromR2 } from '@/lib/r2';
import { purgeCloudflareCache } from '@/lib/cloudflareCache';

// GET a single category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(slug) ? { _id: slug } : { slug };
    const category = await Category.findOne(query);

    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update a category (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist allowed fields to prevent mass-assignment
    const allowedFields = ['name', 'slug', 'image', 'parentCategory', 'isActive'];
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

    const query = mongoose.Types.ObjectId.isValid(slug) ? { _id: slug } : { slug };
    const existingCategory = await Category.findOne(query);
    if (!existingCategory) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const updatedCategory = await Category.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Clean up old category image from R2 if image was changed
    if (existingCategory.image && updateData.image && existingCategory.image !== updateData.image) {
      deleteFromR2(existingCategory.image).catch((err) =>
        console.error('Failed to delete old category image from R2:', err)
      );
    }

    await revalidateTag('categories', 'max');
    revalidatePath('/');
    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on category update:', err)
    );

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a category (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authSession = await auth();

    if (!authSession || !authSession.user || !(['admin', 'super_admin', 'manager'].includes((authSession.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Verify existence first
    const query = mongoose.Types.ObjectId.isValid(slug) ? { _id: slug } : { slug };
    const category = await Category.findOne(query);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // 2. Perform deletion operations in a transaction
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        // Remove this category from all products ($pull removes the ID from the array)
        await Product.updateMany(
          { categories: category._id },
          { $pull: { categories: category._id } },
          { session: dbSession }
        );

        // Rescue subcategories: update them to have no parent category
        await Category.updateMany(
          { parentCategory: category._id },
          { $set: { parentCategory: null } },
          { session: dbSession }
        );

        await Category.findOneAndDelete({ _id: category._id }, { session: dbSession });
      });

      // Delete category image from Cloudflare R2
      if (category.image) {
        deleteFromR2(category.image).catch((err) =>
          console.error('Failed to delete category image from R2:', err)
        );
      }

      // Purge Cloudflare cache
      purgeCloudflareCache().catch((err) =>
        console.error('Failed to purge Cloudflare cache on category delete:', err)
      );

      try {
        await revalidateTag('categories', 'max');
        revalidatePath('/');
      } catch (e) {
        console.error('Revalidation error:', e);
      }

      return NextResponse.json({ message: 'Category deleted successfully' });
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

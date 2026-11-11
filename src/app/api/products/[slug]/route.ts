/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';
import { generateUniqueSlug } from '@/lib/slugify-server';
import { CACHE_TAGS } from '@/lib/data-fetching';
import { deleteMultipleFromR2 } from '@/lib/r2';
import { purgeCloudflareCache } from '@/lib/cloudflareCache';

// GET a single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const product = await Product.findOne(query).populate('categories').populate('brand');

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update a product (Admin only)
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
    const allowedFields = [
      'name', 'slug', 'description', 'price', 'salePrice', 'discountRate',
      'sku', 'stock', 'categories', 'tags', 'images',
      'attributes', 'variants', 'isFeatured', 'isNewArrival', 'isPublished', 'deliveryCharge',
      'wholesalePrice', 'wholesaleSalePrice', 'purchasePrice', 'showroomStocks', 'brand', 'showroomPrice', 'batches'
    ];
    const safeUpdate: any = {};

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        let value = body[key];

        // Numeric coercion for main fields
        if (['price', 'salePrice', 'stock', 'discountRate'].includes(key)) {
          if (value === '' || value === undefined || value === null) {
            value = (key === 'salePrice' || key === 'discountRate') ? undefined : 0;
          } else {
            const parsed = key === 'stock' ? parseInt(value, 10) : parseFloat(value);
            value = Number.isFinite(parsed) ? parsed : (key === 'salePrice' || key === 'discountRate' ? undefined : 0);
          }
        }

        // Deep coercion for variants
        if (key === 'variants' && Array.isArray(value)) {
          value = value.map((v: any) => ({
            _id: v._id || v.id,
            color: v.color,
            size: v.size,
            sku: v.sku,
            image: v.image,
            images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
            price: Number.isFinite(parseFloat(v.price)) ? parseFloat(v.price) : 0,
            purchasePrice: Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined,
            salePrice: Number.isFinite(parseFloat(v.salePrice)) ? parseFloat(v.salePrice) : undefined,
            showroomPrice: Number.isFinite(parseFloat(v.showroomPrice)) ? parseFloat(v.showroomPrice) : undefined,
            stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
            discountRate: Number.isFinite(parseFloat(v.discountRate)) ? parseFloat(v.discountRate) : undefined,
          }));
        }

        // Deep coercion for batches
        if (key === 'batches' && Array.isArray(value)) {
          value = value.map((b: any) => ({
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
            stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
          }));
        }

        safeUpdate[key] = value;
      }
    });

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const existingProduct = await Product.findOne(query);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    let updatedProduct;

    if (safeUpdate.slug) {
      const maxRetries = 3;
      let attempt = 0;
      let lastError;

      while (attempt < maxRetries) {
        attempt++;
        const currentSlugCandidate = attempt === 1 ? safeUpdate.slug : `${safeUpdate.slug}-${attempt - 1}`;

        let actualId = slug;
        if (!mongoose.Types.ObjectId.isValid(slug)) {
          actualId = existingProduct._id.toString();
        }

        const uniqueSlug = await generateUniqueSlug(Product, currentSlugCandidate, actualId);

        try {
          updatedProduct = await Product.findOneAndUpdate(
            query,
            { $set: { ...safeUpdate, slug: uniqueSlug } },
            { new: true, runValidators: true }
          );

          if (!updatedProduct) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
          }
          break;
        } catch (error: any) {
          lastError = error;
          if (error.code === 11000 && error.keyPattern?.slug) {
            continue;
          }
          if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'slug/SKU';
            return NextResponse.json({ message: `Product with this ${field} already exists.` }, { status: 400 });
          }
          throw error;
        }
      }

      if (!updatedProduct) {
        return NextResponse.json({
          message: 'Failed to generate a unique slug after several attempts.',
          error: lastError?.message
        }, { status: 400 });
      }
    } else {
      updatedProduct = await Product.findOneAndUpdate(
        query,
        { $set: safeUpdate },
        { returnDocument: 'after', runValidators: true }
      );

      if (!updatedProduct) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
    }

    // Clean up any removed images from Cloudflare R2
    try {
      const oldImages: string[] = [];
      if (Array.isArray(existingProduct.images)) oldImages.push(...existingProduct.images);
      if (Array.isArray(existingProduct.variants)) {
        existingProduct.variants.forEach((v: any) => {
          if (Array.isArray(v.images)) oldImages.push(...v.images);
          if (v.image) oldImages.push(v.image);
        });
      }

      const newImages = new Set<string>();
      if (Array.isArray(updatedProduct.images)) {
        updatedProduct.images.forEach((img: string) => newImages.add(img));
      }
      if (Array.isArray(updatedProduct.variants)) {
        updatedProduct.variants.forEach((v: any) => {
          if (Array.isArray(v.images)) v.images.forEach((img: string) => newImages.add(img));
          if (v.image) newImages.add(v.image);
        });
      }

      const removedImages = oldImages.filter((img) => !newImages.has(img));
      if (removedImages.length > 0) {
        deleteMultipleFromR2(removedImages).catch((err) =>
          console.error('Failed to clean up removed product images from R2:', err)
        );
      }
    } catch (cleanErr) {
      console.warn('Error checking removed product images:', cleanErr);
    }

    revalidateTag('products', 'max');
    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on product update:', err)
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a product (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const deletedProduct = await Product.findOneAndDelete(query);

    if (!deletedProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Collect all image URLs for cleanup from Cloudflare R2
    const imagesToDelete: string[] = [];
    if (Array.isArray(deletedProduct.images)) {
      imagesToDelete.push(...deletedProduct.images);
    }
    if (Array.isArray(deletedProduct.variants)) {
      deletedProduct.variants.forEach((v: any) => {
        if (Array.isArray(v.images)) imagesToDelete.push(...v.images);
        if (v.image) imagesToDelete.push(v.image);
      });
    }

    if (imagesToDelete.length > 0) {
      deleteMultipleFromR2(imagesToDelete).catch((err) =>
        console.error('Failed to delete product images from R2:', err)
      );
    }

    // Trigger Cloudflare edge cache purge
    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on product delete:', err)
    );

    try {
      await revalidateTag(CACHE_TAGS.products, 'max');
    } catch (revalidateError) {
      console.error('Failed to revalidate product tags:', revalidateError);
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

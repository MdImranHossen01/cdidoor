import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';
import { slugify } from '@/lib/slugify';
import { generateUniqueSlug } from '@/lib/slugify-server';

// GET all products
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const ids = searchParams.get('ids');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    // TODO: Consider requiring admin auth for limits > 100 or implementing a separate bulk endpoint
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '40')));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (ids) {
      query._id = { $in: ids.split(',') };
    }

    const search = searchParams.get('search');
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { sku: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const category = searchParams.get('category');
    if (category) {
      query.categories = { $in: category.split(',') };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categories')
        .populate('brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new product (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ message: 'Invalid JSON request body' }, { status: 400 });
    }

    const { name, slug, description, sku, categories, tags, images, attributes, variants, isFeatured, isNewArrival, isPublished, discountRate, wholesalePrice, wholesaleSalePrice, purchasePrice, showroomStocks, brand, showroomPrice, batches, price, salePrice, stock } = body;
    // Coerce variant numeric fields and whitelist properties
    const coercedVariants = (variants || []).map((v: any) => ({
      _id: v._id || v.id,
      color: v.color,
      size: v.size,
      sku: v.sku,
      image: v.image,
      images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
      price: Number.isFinite(parseFloat(v.price)) ? parseFloat(v.price) : 0,
      salePrice: Number.isFinite(parseFloat(v.salePrice)) ? parseFloat(v.salePrice) : undefined,
      purchasePrice: Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined,
      wholesaleSalePrice: Number.isFinite(parseFloat(v.wholesaleSalePrice)) ? parseFloat(v.wholesaleSalePrice) : undefined,
      showroomPrice: Number.isFinite(parseFloat(v.showroomPrice)) ? parseFloat(v.showroomPrice) : undefined,
      stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
      discountRate: Number.isFinite(parseFloat(v.discountRate)) ? parseFloat(v.discountRate) : undefined,
    }));

    const hasVariants = coercedVariants.length > 0;
    const firstVariant = hasVariants ? coercedVariants[0] : null;

    // Numeric validation and coercion with fallback from variants
    const rawPrice = parseFloat(price);
    let parsedPrice = Number.isFinite(rawPrice) ? rawPrice : 0;
    if ((!parsedPrice || parsedPrice <= 0) && firstVariant?.price) {
      parsedPrice = firstVariant.price;
    }

    const rawSalePrice = parseFloat(salePrice);
    let parsedSalePrice = Number.isFinite(rawSalePrice) ? rawSalePrice : undefined;
    if (parsedSalePrice === undefined && firstVariant?.salePrice) {
      parsedSalePrice = firstVariant.salePrice;
    }

    const rawStock = parseInt(stock, 10);
    let parsedStock = Number.isFinite(rawStock) ? rawStock : 0;
    if (parsedStock === 0 && hasVariants) {
      parsedStock = coercedVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    }

    let resolvedSku = (sku || '').trim();
    if (!resolvedSku && firstVariant?.sku) {
      resolvedSku = firstVariant.sku;
    } else if (!resolvedSku && slug) {
      resolvedSku = `${slug.toUpperCase()}-MAIN`;
    }

    let resolvedImages = Array.isArray(images) ? images : [];
    if (resolvedImages.length === 0 && hasVariants) {
      const allVariantImages = coercedVariants.flatMap((v: any) => (v.images && v.images.length > 0 ? v.images : (v.image ? [v.image] : []))).filter(Boolean);
      resolvedImages = Array.from(new Set(allVariantImages));
    }

    const rawDiscountRate = parseFloat(discountRate);
    const parsedDiscountRate = Number.isFinite(rawDiscountRate) ? rawDiscountRate : undefined;

    // Validate required fields and price
    if (!name || !slug || !description || !resolvedSku || isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({
        message: 'Invalid or missing required fields. Price must be a positive number.'
      }, { status: 400 });
    }

    // Validate salePrice logic
    if (parsedSalePrice !== undefined) {
      if (isNaN(parsedSalePrice) || parsedSalePrice < 0 || parsedSalePrice > parsedPrice) {
        return NextResponse.json({
          message: 'Sale price must be a non-negative number and less than or equal to the regular price.'
        }, { status: 400 });
      }
    }

    // Coerce batch fields
    const coercedBatches = (batches || []).map((b: any) => ({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
      stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
    }));

    await connectToDatabase();

    const maxRetries = 3;
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      attempt++;
      const currentSlug = attempt === 1 ? slug : `${slug}-${attempt - 1}`;
      const uniqueSlug = await generateUniqueSlug(Product, currentSlug);

      try {
        const newProduct = await Product.create({
          name,
          slug: uniqueSlug,
          brand,
          description,
          price: parsedPrice,
          salePrice: parsedSalePrice,
          wholesalePrice: Number.isFinite(parseFloat(wholesalePrice)) ? parseFloat(wholesalePrice) : undefined,
          wholesaleSalePrice: Number.isFinite(parseFloat(wholesaleSalePrice)) ? parseFloat(wholesaleSalePrice) : undefined,
          purchasePrice: Number.isFinite(parseFloat(purchasePrice)) ? parseFloat(purchasePrice) : undefined,
          showroomPrice: Number.isFinite(parseFloat(showroomPrice)) ? parseFloat(showroomPrice) : undefined,
          discountRate: parsedDiscountRate,
          sku: resolvedSku,
          stock: parsedStock,
          categories: categories || [],
          tags: tags || [],
          images: resolvedImages,
          attributes: attributes || [],
          variants: coercedVariants,
          batches: coercedBatches,
          showroomStocks: showroomStocks || [],
          isFeatured: isFeatured !== undefined ? isFeatured : false,
          isNewArrival: isNewArrival !== undefined ? isNewArrival : false,
          isPublished: isPublished !== undefined ? isPublished : true,
        });

        revalidateTag('products', 'max');
        revalidatePath('/');
        return NextResponse.json(newProduct, { status: 201 });
      } catch (error: any) {
        lastError = error;
        if (error.code === 11000 && error.keyPattern?.slug) {
          // If slug conflict, retry with incremented slug
          continue;
        }

        // If other duplicate error (e.g. SKU), or other DB error, return 400
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern || {})[0] || 'slug/SKU';
          return NextResponse.json({
            message: `Product with this ${field} already exists.`
          }, { status: 400 });
        }
        throw error;
      }
    }

    // If we exhausted retries
    return NextResponse.json({
      message: 'Failed to generate a unique slug after several attempts. Please try a different name or slug.',
      error: lastError?.message
    }, { status: 400 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


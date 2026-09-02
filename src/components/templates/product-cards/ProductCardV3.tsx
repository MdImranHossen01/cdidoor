/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingBag, Heart, Eye, MoreVertical, Edit, Trash2, Settings } from 'lucide-react';
import { RatingStars } from '@/components/ui/rating-stars';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { fbEvent } from '@/lib/fpixel';
import { ttEvent } from '@/lib/tiktok';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { QuickViewModal } from './QuickViewModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    salePrice?: number;
    images: string[];
    isFeatured?: boolean;
    isNewArrival?: boolean;
    stock: number;
    categories?: any[];
    variants?: any[];
    ratings?: number;
    numReviews?: number;
    sku?: string;
  };
  isFlashSale?: boolean;
}

export default function ProductCardV3({ product: initialProduct, isFlashSale }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(initialProduct._id);
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const firstVariant = initialProduct.variants && initialProduct.variants.length > 0 ? initialProduct.variants[0] : null;
  const product = firstVariant ? {
    ...initialProduct,
    price: firstVariant.price,
    salePrice: firstVariant.salePrice,
    stock: firstVariant.stock ?? initialProduct.stock,
    sku: firstVariant.sku ?? initialProduct.sku,
    images: firstVariant.image ? [firstVariant.image, ...initialProduct.images.filter((img: string) => img !== firstVariant.image)] : initialProduct.images
  } : initialProduct;

  const hasVariants = product.variants && product.variants.length > 0;
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);

  const discount = (product.price > 0 && product.salePrice && product.salePrice < product.price)
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      setShowQuickViewModal(true);
    } else {
      executeAddToCart();
    }
  };

  const executeAddToCart = () => {
    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: product.salePrice ?? product.price,
      basePrice: product.price,
      quantity: 1,
      image: product.images?.[0]
    }));

    // Track AddToCart
    const addToCartPayload = {
      content_name: product.name,
      content_category: product.categories?.[0]?.name || 'Uncategorized',
      content_ids: [product._id],
      content_type: 'product',
      value: product.salePrice || product.price,
      currency: 'BDT',
      quantity: 1
    };
    const trackingUser = {
      em: session?.user?.email || undefined,
      ph: (session?.user as any)?.phone || undefined,
      fn: session?.user?.name || undefined
    };
    fbEvent('AddToCart', addToCartPayload, trackingUser);
    ttEvent('AddToCart', addToCartPayload, trackingUser);

    toast.success(`${product.name} added to cart`);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'unauthenticated') {
      toast.error('Please login to save to wishlist');
      return;
    }

    dispatch(toggleWishlist(product._id));
    const willBeInWishlist = !isInWishlist;

    if (willBeInWishlist) {
      // Track AddToWishlist
      const addToWishlistPayload = {
        content_name: product.name,
        content_category: product.categories?.[0]?.name || 'Uncategorized',
        content_ids: [product._id],
        content_type: 'product',
        value: product.salePrice || product.price,
        currency: 'BDT'
      };
      const trackingUser = {
        em: session?.user?.email || undefined,
        ph: (session?.user as any)?.phone || undefined,
        fn: session?.user?.name || undefined
      };
      fbEvent('AddToWishlist', addToWishlistPayload, trackingUser);
      ttEvent('AddToWishlist', addToWishlistPayload, trackingUser);
    }

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id }),
      });

      if (!res.ok) {
        throw new Error('Server error updating wishlist');
      }

      toast.success(willBeInWishlist ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      console.error('Wishlist error:', err);
      dispatch(toggleWishlist(product._id));
      toast.error('Failed to sync wishlist. Please try again.');
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickViewModal(true);
  };

  const handleDeleteProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: 'Are you sure you want to delete this product? This action is permanent.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/products/${product.slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete product');
      }
      toast.success('Product removed successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Failed to delete product'}`);
    }
  };

  const mainCategory = product.categories && product.categories.length > 0 ? product.categories[0] : null;
  const categoryName = mainCategory?.name || 'AMIRA BEAUTIFUL CARE';

  return (
    <div className="w-full bg-card border border-border/40 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group flex flex-col h-full relative">
      {/* Image Area */}
      <div className="relative w-full aspect-[4/5] bg-muted/10 overflow-hidden">
        <Link href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover w-full h-full object-center transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </Link>

        {/* Unified Ribbon Badge (Top Left) */}
        {(isFlashSale || discount > 0 || product.isNewArrival || product.isFeatured) && (
          <div className="absolute top-0 left-0 overflow-hidden w-20 h-20 z-10 pointer-events-none">
            <div className={`absolute top-0 left-0 text-[8px] font-black py-0.5 w-28 text-center -rotate-45 -translate-x-8 translate-y-3.5 shadow-md uppercase tracking-wider ${isFlashSale ? 'bg-orange-600 text-white animate-pulse' :
              discount > 0 ? 'bg-primary text-primary-foreground' :
                product.isNewArrival ? 'bg-emerald-600 text-white' :
                  'bg-amber-400 text-neutral-950'
              }`}>
              {isFlashSale ? 'Flash' :
                discount > 0 ? `${discount}% OFF` :
                  product.isNewArrival ? 'New' :
                    'Featured'}
            </div>
          </div>
        )}

        {/* Quick Actions (Wishlist & Quick View) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <TooltipProvider>
            {/* Wishlist Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleFavorite}
                  className="w-8 h-8 rounded-full bg-white text-black hover:text-primary hover:bg-neutral-50 shadow-sm border border-border/20 flex items-center justify-center transition-all duration-200"
                  aria-label="Add to Wishlist"
                >
                  <Heart className={`h-4.5 w-4.5 ${isInWishlist ? 'fill-red-500 text-red-500 border-none' : 'text-neutral-600'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Quick View Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleQuickView}
                  className="w-8 h-8 rounded-full bg-white text-black hover:bg-primary hover:text-primary-foreground border border-neutral-200/80 shadow-md flex items-center justify-center transition-all duration-200"
                  aria-label="Quick View"
                >
                  <Eye className="h-4.5 w-4.5 text-neutral-600 hover:text-primary-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Quick View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Admin Menu */}
        {isAdmin && (
          <div className="absolute bottom-3 right-3 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full bg-white/90 border shadow hover:bg-white">
                  <MoreVertical className="h-3.5 w-3.5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.slug}`)}>
                  <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteProduct} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/admin/products')}>
                  <Settings className="mr-2 h-3.5 w-3.5" /> Manage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="px-3 py-4 flex flex-col justify-between flex-grow gap-4">
        {/* Category & Title */}
        <div className="space-y-1 w-full">
          <Link href={`/shop?category=${mainCategory?.slug || ''}`} className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors block">
            {categoryName}
          </Link>
          <Link href={`/product/${product.slug}`} className="block group/title">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 min-h-[38px] group-hover/title:text-primary transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          {(product.ratings ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <RatingStars rating={product.ratings || 0} starClassName="h-3 w-3" />
              <span className="text-[10px] text-muted-foreground font-bold">
                ({product.numReviews || 0})
              </span>
            </div>
          )}
        </div>

        {/* Price & Button Stack */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between mt-auto pt-1 w-full">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[16px] font-black text-primary">
              Tk {Math.round(product.salePrice ?? product.price).toLocaleString()}
            </span>
            {product.salePrice != null && product.salePrice < product.price && (
              <span className="text-xs text-muted-foreground line-through decoration-primary/20">
                Tk {Math.round(product.price).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            onClick={handleAddToCartClick}
            disabled={product.stock === 0}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stock === 0 ? 'Out' : 'Add'}
          </Button>
        </div>
      </div>

      <QuickViewModal
        product={initialProduct}
        isOpen={showQuickViewModal}
        onClose={() => setShowQuickViewModal(false)}
      />
    </div>
  );
}

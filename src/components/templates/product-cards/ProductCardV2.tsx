/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Heart, Eye, MoreVertical, Edit, Trash2, Settings } from 'lucide-react';
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

export default function ProductCardV2({ product: initialProduct, isFlashSale }: ProductCardProps) {
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
      toast.error('Please login to add to wishlist');
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
        throw new Error('Server synchronization failed');
      }

      toast.success(willBeInWishlist ? 'Added to wishlist' : 'Removed from wishlist');
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
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Product deleted successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const mainCategory = product.categories && product.categories.length > 0 ? product.categories[0] : null;
  const categoryName = mainCategory?.name || 'OMOR AUTO CORNER';

  return (
    <div className="group relative flex flex-col bg-background rounded-md border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] h-full">
      {/* Image & Hover Action Buttons */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/10 flex items-center justify-center border-b border-border/30">
        <Link prefetch={true} href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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

        {/* Ryans Style Floating Action Buttons (Cart, Wishlist, Quick View) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 z-10 translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          <TooltipProvider>
            {/* Add to Cart Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleAddToCartClick}
                  disabled={product.stock === 0}
                  className="w-8 h-8 rounded-full bg-white text-black hover:bg-primary hover:text-primary-foreground border border-neutral-200/80 shadow-md flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                  aria-label="Add to Cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Wishlist Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleFavorite}
                  className="w-8 h-8 rounded-full bg-white text-black hover:bg-primary hover:text-primary-foreground border border-neutral-200/80 shadow-md flex items-center justify-center transition-all duration-200"
                  aria-label="Add to Wishlist"
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
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
                  <Eye className="h-4 w-4" />
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
          <div className="absolute bottom-2.5 right-2.5 z-20">
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

      {/* Content Section */}
      <div className="p-4 flex flex-col items-center text-center flex-grow justify-between gap-2.5">
        <div className="space-y-1 w-full">
          {/* Brand/Category Label */}
          <Link href={`/shop?category=${mainCategory?.slug || ''}`} className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors block">
            {categoryName}
          </Link>

          {/* Product Title */}
          <Link prefetch={true} href={`/product/${product.slug}`} className="block group/title">
            <h4 className="text-[13px] font-bold leading-snug tracking-tight line-clamp-2 min-h-[36px] text-foreground hover:text-primary transition-colors">
              {product.name}
            </h4>
          </Link>
        </div>

        {/* Price Tag */}
        <div className="flex items-center justify-center gap-2 mt-auto">
          <span className="text-[15px] font-extrabold text-primary">
            Tk {Math.round(product.salePrice ?? product.price).toLocaleString()}
          </span>
          {product.salePrice != null && product.salePrice < product.price && (
            <span className="text-xs text-muted-foreground line-through decoration-primary/20">
              Tk {Math.round(product.price).toLocaleString()}
            </span>
          )}
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

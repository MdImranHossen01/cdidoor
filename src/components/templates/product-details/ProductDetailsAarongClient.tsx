/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { Heart, Minus, Plus, Share2, Eye, X, BookOpen, Star, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import ReviewsSection from '@/components/storefront/ReviewsSection';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateHtml } from '@/lib/server-html';
import ShareDialog from '@/components/storefront/ShareDialog';
import { fbEvent } from '@/lib/fpixel';
import { ttEvent } from '@/lib/tiktok';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductDetailsAarongClientProps {
  product: any;
}

export default function ProductDetailsAarongClient({ product }: ProductDetailsAarongClientProps) {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(product?._id);
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, percentageX: 0, percentageY: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const defaultVariant = product?.variants && product.variants.length > 0 ? product.variants[0] : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(defaultVariant?.color || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(defaultVariant?.size || null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeTabOpen, setActiveTabOpen] = useState<string | null>(null); // 'description', 'size-guide', 'reviews', etc.
  const [descriptionDrawerOpen, setDescriptionDrawerOpen] = useState(false);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);
  const [prevSelectedColor, setPrevSelectedColor] = useState<string | null>(null);

  const uniqueColors = useMemo(() =>
    Array.from(new Set((product?.variants || []).map((v: any) => v.color))).filter(Boolean) as string[],
    [product?.variants]
  );

  const uniqueSizes = useMemo(() =>
    Array.from(new Set((product?.variants || []).map((v: any) => v.size))).filter(Boolean) as string[],
    [product?.variants]
  );

  const availableSizes = useMemo(() =>
    (product?.variants || [])
      .filter((v: any) => !selectedColor || v.color === selectedColor)
      .map((v: any) => v.size)
      .filter(Boolean) as string[],
    [product?.variants, selectedColor]
  );

  const activeVariant = useMemo(() =>
    (product?.variants || []).find(
      (v: any) =>
        (v.color || null) === (selectedColor || null) &&
        (v.size || null) === (selectedSize || null)
    ),
    [product?.variants, selectedColor, selectedSize]
  );

  const hasVariants = (uniqueColors.length > 0 || uniqueSizes.length > 0);
  const currentVariant = activeVariant || defaultVariant;

  const displayPrice = hasVariants ? (currentVariant?.price ?? 0) : product?.price;
  const displaySalePrice = hasVariants ? currentVariant?.salePrice : product?.salePrice;
  const displayStock = hasVariants ? (currentVariant?.stock ?? 0) : (product?.stock ?? 0);

  const allImages = useMemo(() => {
    if (activeVariant) {
      const activeImages = [
        ...(activeVariant.images || []),
        activeVariant.image
      ].filter(Boolean) as string[];
      if (activeImages.length > 0) {
        return Array.from(new Set(activeImages));
      }
    }
    return product?.images || [];
  }, [product?.images, activeVariant]);
  // Sync state when product changes
  if (product && product._id !== prevProductId) {
    setPrevProductId(product._id);
    setSelectedColor(uniqueColors[0] || null);
    setQuantity(1);
  }

  // Reset selected image when selected color changes
  if (selectedColor !== prevSelectedColor) {
    setPrevSelectedColor(selectedColor);
    setSelectedImage(0);
  }

  // Adjust size selection if current selectedSize is not available
  const currentSize = (selectedSize !== null && availableSizes.includes(selectedSize))
    ? selectedSize
    : (availableSizes[0] || null);

  if (selectedSize !== currentSize) {
    setSelectedSize(currentSize);
  }

  if (quantity > displayStock) {
    setQuantity(Math.max(1, displayStock));
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left - 75; // Center lens
    const y = e.clientY - top - 75;

    // Constrain lens within bounds
    const boundedX = Math.max(0, Math.min(x, width - 150));
    const boundedY = Math.max(0, Math.min(y, height - 150));

    // Calculate background position percentages
    const percentageX = ((e.clientX - left) / width) * 100;
    const percentageY = ((e.clientY - top) / height) * 100;

    setZoomPos({
      x: boundedX,
      y: boundedY,
      percentageX,
      percentageY
    });
  };

  const activeImage = useMemo(() => {
    if (allImages && allImages.length > 0 && selectedImage < allImages.length) {
      return allImages[selectedImage];
    }
    return '/placeholder.png';
  }, [allImages, selectedImage]);

  const handleAddToCart = () => {
    if (displayStock <= 0) {
      toast.error(t('store.product.out_of_stock') as string || 'Product is out of stock');
      return;
    }

    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: displaySalePrice ?? displayPrice,
      basePrice: displayPrice,
      quantity,
      image: activeImage,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    }));

    // FB & TikTok Tracking
    const trackingPayload = {
      content_name: product.name,
      content_category: product.categories?.[0]?.name || 'Apparel',
      content_ids: [product._id],
      content_type: 'product',
      value: (displaySalePrice ?? displayPrice) * quantity,
      currency: 'BDT',
      quantity
    };
    const trackingUser = {
      em: session?.user?.email || undefined,
      ph: (session?.user as any)?.phone || undefined,
      fn: session?.user?.name || undefined
    };
    fbEvent('AddToCart', trackingPayload, trackingUser);
    ttEvent('AddToCart', trackingPayload, trackingUser);

    toast.success(`${quantity} ${quantity > 1 ? 'items' : 'item'} ${t('store.product.added_to_cart') || 'added to bag'}`);
  };

  const handleWishlist = () => {
    if (status === 'unauthenticated') {
      toast.error('Please login to add to wishlist');
      return;
    }
    dispatch(toggleWishlist(product._id));
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  // Default specifications for fashion clothes if product attributes are empty
  const displayAttributes = product?.attributes && product.attributes.length > 0 
    ? product.attributes 
    : [
        { key: 'Colour', value: selectedColor || 'Multicolor' },
        { key: 'Fabric', value: 'Cotton' },
        { key: 'Value Addition', value: 'Block Print' },
        { key: 'Cut /Fit', value: 'A-Line' },
        { key: 'Side Cut', value: 'Side Open' },
        { key: 'Collar/Neck', value: 'Band Collar' },
        { key: 'Sleeve', value: '3-Quarter Sleeve' },
        { key: 'Length', value: 'Long' },
        { key: 'Care', value: 'Hand Wash With Mild Detergent In Cold Water' }
      ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 font-jost text-foreground relative">
      
      {/* ── Left Column: Portrait Aspect Image with Zoom & Thumbnails ── */}
      <div className="lg:col-span-7 space-y-4">
        <div className="relative group/zoom">
          <div
            className="relative aspect-[3/4] bg-muted w-full overflow-hidden border border-border/40 cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
          >
            {allImages && allImages.length > 0 && selectedImage < allImages.length ? (
              <>
                <Image
                  src={allImages[selectedImage]}
                  alt={product?.name || 'Aarong apparel'}
                  fill
                  className="object-cover w-full h-full object-center"
                  priority
                />

                {/* Zoom Lens overlay */}
                {showZoom && (
                  <div
                    className="absolute border border-primary/30 bg-primary/10 shadow-inner pointer-events-none hidden lg:block"
                    style={{
                      width: '150px',
                      height: '150px',
                      left: `${zoomPos.x}px`,
                      top: `${zoomPos.y}px`,
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground italic">
                {t('store.product.no_images') || 'No images available'}
              </div>
            )}
          </div>

          {/* External Zoom Preview window */}
          {showZoom && allImages && allImages.length > 0 && allImages[selectedImage] && (
            <div
              className="absolute left-[105%] top-0 w-full h-full border-2 border-border/80 bg-background shadow-2xl z-50 pointer-events-none overflow-hidden hidden lg:block animate-in fade-in zoom-in-95 duration-200"
            >
              <div
                className="w-full h-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${allImages[selectedImage]})`,
                  backgroundSize: '250%',
                  backgroundPosition: `${zoomPos.percentageX}% ${zoomPos.percentageY}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Thumbnails list */}
        {allImages && allImages.length > 1 && (
          <div className="flex gap-3 overflow-auto pb-2 scrollbar-none">
            {allImages.map((img: string, i: number) => (
              <button
                key={i}
                className={`relative h-20 w-16 flex-shrink-0 border-2 overflow-hidden transition-all ${
                  selectedImage === i ? 'border-primary scale-105 shadow-sm' : 'border-border/60 hover:border-primary/50'
                }`}
                onClick={() => setSelectedImage(i)}
                aria-label={`View product thumbnail image ${i + 1}`}
              >
                <Image
                  src={img}
                  alt={`Product thumbnail ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 64px, 64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right Column: Info & Interactivity ── */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-playfair tracking-tight text-foreground uppercase">
            {product?.name}
          </h1>
          
          <div className="flex items-center gap-3 mt-3">
            {displaySalePrice ? (
              <>
                <span className="text-xl font-black text-foreground">Tk {(displaySalePrice).toLocaleString()}</span>
                <span className="text-sm text-muted-foreground line-through font-normal">Tk {(displayPrice ?? 0).toLocaleString()}</span>
              </>
            ) : (
              <span className="text-xl font-black text-foreground">Tk {(displayPrice ?? 0).toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="h-px bg-border/60" />

        {/* Variant Selectors */}
        {hasVariants && (
          <div className="space-y-4">
            {uniqueColors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('store.product.color') || 'Color'}: {selectedColor}</span>
                <div className="flex gap-2.5">
                  {uniqueColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1.5 text-xs font-bold border uppercase tracking-wider transition-all ${
                        selectedColor === c 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border hover:border-foreground bg-transparent'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uniqueSizes.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('store.product.size') || 'Size'}</span>
                <select
                  value={selectedSize || ''}
                  onChange={(e) => setSelectedSize(e.target.value || null)}
                  className="w-full h-11 px-3 bg-background border border-border focus:border-primary outline-none text-xs font-semibold uppercase tracking-wider"
                >
                  <option value="" disabled>{t('store.product.select_size') || 'Choose an Option...'}</option>
                  {uniqueSizes.map((s) => (
                    <option key={s} value={s} disabled={!availableSizes.includes(s)}>
                      {s} {!availableSizes.includes(s) && '(Out of stock)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Quantity & Stock Alert */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">{t('store.product.quantity') || 'Quantity'}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border h-11">
              <button
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => q - 1)}
                className="h-full px-4 hover:bg-muted text-foreground transition-colors disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center text-xs font-bold">{quantity}</span>
              <button
                disabled={quantity >= displayStock}
                onClick={() => setQuantity(q => q + 1)}
                className="h-full px-4 hover:bg-muted text-foreground transition-colors disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {displayStock <= 0 ? (
              <span className="text-xs font-black uppercase text-destructive tracking-widest animate-pulse ml-2">{t('store.product.out_of_stock') || 'OUT OF STOCK'}</span>
            ) : displayStock <= 5 ? (
              <span className="text-xs font-bold text-orange-600 tracking-wider ml-2">Only {displayStock} left in stock!</span>
            ) : null}
          </div>
        </div>

        {/* Action buttons (ADD TO BAG, heart, share) */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleAddToCart}
            disabled={displayStock <= 0}
            className="flex-1 h-12 bg-black hover:bg-neutral-900 text-white rounded-none font-black text-xs uppercase tracking-[0.25em] shadow-lg transition duration-300 disabled:bg-neutral-400"
          >
            {t('store.product.add_to_cart') || 'ADD TO BAG'}
          </Button>
          
          <button
            onClick={handleWishlist}
            className={`h-12 w-12 border flex items-center justify-center transition-all ${
              isInWishlist ? 'border-primary text-primary bg-primary/5' : 'border-border hover:border-foreground text-foreground'
            }`}
            title="Wishlist"
          >
            <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => setIsShareOpen(true)}
            className="h-12 w-12 border border-border hover:border-foreground text-foreground flex items-center justify-center transition-colors"
            title="Share Product"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsible Accordion sections */}
        <div className="pt-6 divide-y divide-border/60 border-t border-b border-border/60 text-xs">
          
          {/* Product Code */}
          {product?.sku && (
            <div className="py-3.5 flex items-center justify-between text-foreground">
              <span className="font-bold uppercase tracking-wider">Product Code</span>
              <span className="font-mono text-muted-foreground uppercase tracking-widest">{product.sku}</span>
            </div>
          )}

          {/* Size Guide activator */}
          <div className="py-3.5 flex items-center justify-between text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => setActiveTabOpen(activeTabOpen === 'size-guide' ? null : 'size-guide')}>
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5"><HelpCircle className="h-4 w-4" /> {t('store.product.size_guide') || 'Size Guide'}</span>
            <Plus className={`h-4 w-4 transition-transform duration-300 ${activeTabOpen === 'size-guide' ? 'rotate-45' : ''}`} />
          </div>
          {activeTabOpen === 'size-guide' && (
            <div className="py-3.5 text-muted-foreground leading-relaxed animate-in fade-in duration-200">
              <p className="mb-2">Standard apparel size chart applies to this product.</p>
              <div className="border border-border/80 text-[10px] text-center font-bold">
                <div className="grid grid-cols-4 bg-muted py-1 border-b border-border">
                  <span>Size</span><span>Chest (in)</span><span>Length (in)</span><span>Sleeve (in)</span>
                </div>
                <div className="grid grid-cols-4 py-1 border-b border-border/60">
                  <span>36</span><span>38</span><span>39</span><span>32.5</span>
                </div>
                <div className="grid grid-cols-4 py-1 border-b border-border/60">
                  <span>38</span><span>40</span><span>40</span><span>33</span>
                </div>
                <div className="grid grid-cols-4 py-1 border-b border-border/60">
                  <span>40</span><span>42</span><span>41</span><span>33.5</span>
                </div>
                <div className="grid grid-cols-4 py-1">
                  <span>42</span><span>44</span><span>42</span><span>34</span>
                </div>
              </div>
            </div>
          )}

          {/* Product Description Drawer Activator */}
          <div 
            onClick={() => setDescriptionDrawerOpen(true)} 
            className="py-3.5 flex items-center justify-between text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {t('store.product.description') || 'Product Description'}</span>
            <Plus className="h-4 w-4" />
          </div>

          {/* Reviews tab */}
          <div className="py-3.5 flex items-center justify-between text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => setActiveTabOpen(activeTabOpen === 'reviews' ? null : 'reviews')}>
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5"><Star className="h-4 w-4" /> {t('store.product.reviews') || 'Customer Reviews'} ({product?.numReviews || 0})</span>
            <Plus className={`h-4 w-4 transition-transform duration-300 ${activeTabOpen === 'reviews' ? 'rotate-45' : ''}`} />
          </div>
          {activeTabOpen === 'reviews' && (
            <div className="py-4 animate-in fade-in duration-200">
              <ReviewsSection productId={product._id} />
            </div>
          )}

        </div>
      </div>

      {/* ── Slide-Out Description Specification Drawer ── */}
      <AnimatePresence>
        {descriptionDrawerOpen && (
          <>
            {/* Drawer Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDescriptionDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            {/* Drawer Sidebar Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] md:w-[500px] bg-background text-foreground shadow-2xl p-6 md:p-8 overflow-y-auto z-50 flex flex-col gap-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-black text-sm uppercase tracking-widest text-foreground">PRODUCT DESCRIPTION</h3>
                <button
                  onClick={() => setDescriptionDrawerOpen(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Rich Description */}
              <div className="text-xs text-muted-foreground leading-relaxed space-y-4">
                <div dangerouslySetInnerHTML={{ __html: generateHtml(product?.description) }} />
              </div>

              {/* Specifications List Table */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <h4 className="font-black text-xs uppercase tracking-wider text-foreground">Specifications</h4>
                <div className="border border-border/80 divide-y divide-border/60 text-xs rounded-none overflow-hidden">
                  {displayAttributes.map((attr: any, idx: number) => (
                    <div 
                      key={attr.key || idx} 
                      className={`grid grid-cols-5 p-3 ${idx % 2 === 0 ? 'bg-muted/15' : 'bg-transparent'}`}
                    >
                      <span className="col-span-2 font-bold text-foreground/80 uppercase tracking-wide text-[10px]">{attr.key}</span>
                      <span className="col-span-3 text-muted-foreground">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ShareDialog
        isOpen={isShareOpen}
        onOpenChange={setIsShareOpen}
        title={product?.name || ''}
      />
    </div>
  );
}

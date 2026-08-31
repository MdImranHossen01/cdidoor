'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash, Loader2, Search, DatabaseZap, Download, MoreHorizontal, Store, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AdminProduct {
  _id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  wholesalePrice?: number;
  wholesaleSalePrice?: number;
  showroomPrice?: number;
  purchasePrice?: number;
  brand?: any;
  attributes?: any;
  showroomStocks?: { showroom: string | { _id: string; name: string }; stock: number }[];
  batches?: { _id?: string, batchNumber: string; expiryDate?: Date; stock: number }[];
  isPublished: boolean;
  images?: string[];
  slug: string;
  views?: number;
  totalSales?: number;
  description?: string;
  categories?: any[];
  variants?: any[];
}

function ProductsContent() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { t } = useLanguage();
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [showroomsList, setShowroomsList] = useState<{ _id: string; name: string }[]>([]);
  
  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState<AdminProduct | null>(null);
  const [transferSource, setTransferSource] = useState<string>('central');
  const [isAddMode, setIsAddMode] = useState(false);
  const [targetShowroom, setTargetShowroom] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferBatchNumber, setTransferBatchNumber] = useState<string>('auto');
  const [transferring, setTransferring] = useState(false);
  
  // Add Stock Modal State
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [addStockProduct, setAddStockProduct] = useState<AdminProduct | null>(null);
  const [addStockBatchNumber, setAddStockBatchNumber] = useState('');
  const [addStockExpiryDate, setAddStockExpiryDate] = useState('');
  const [addStockVariants, setAddStockVariants] = useState<{variantId: string, color: string, size: string, stockToAdd: number}[]>([]);
  const [addStockTopLevel, setAddStockTopLevel] = useState(0);
  const [addingStock, setAddingStock] = useState(false);
  
  const limit = 10;

  const fetchProducts = async (signal?: AbortSignal, page = currentPage) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?page=${page}&limit=${limit}`, { signal });
      if (!response.ok) {
        toast.error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchProducts(controller.signal);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentPage]);

  // Fetch showrooms for filter dropdown
  useEffect(() => {
    fetch('/api/showrooms')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.showrooms || []);
        setShowroomsList(list.map((s: any) => ({ _id: s._id, name: s.name })));
      })
      .catch(() => {});
  }, []);

  // Helper: get effective stock based on filter
  const getDisplayStock = (product: AdminProduct): number => {
    if (selectedShowroom === 'all') {
      // Total: central + all showroom stocks
      const showroomTotal = (product.showroomStocks || []).reduce((sum, s) => sum + (s.stock || 0), 0);
      return (product.stock || 0) + showroomTotal;
    } else if (selectedShowroom === 'central') {
      return product.stock || 0;
    } else {
      // Specific showroom
      const found = (product.showroomStocks || []).find(s => {
        const id = typeof s.showroom === 'object' ? s.showroom._id : s.showroom;
        return id === selectedShowroom;
      });
      return found?.stock ?? 0;
    }
  };

  const getStockLabel = (): string => {
    if (selectedShowroom === 'all') return t("products.total_stock") as string;
    if (selectedShowroom === 'central') return `${t("products.central")} ${t("products.stock")}`;
    const found = showroomsList.find(s => s._id === selectedShowroom);
    return found ? `${found.name} ${t("products.stock")}` : t("products.stock") as string;
  };

  const getTransferSourceStock = (product: AdminProduct): number => {
    const source = selectedShowroom === 'all' ? 'central' : selectedShowroom;
    if (source === 'central') return product.stock || 0;
    const found = (product.showroomStocks || []).find(s => {
      const id = typeof s.showroom === 'object' ? s.showroom._id : s.showroom;
      return id === source;
    });
    return found?.stock ?? 0;
  };

  const handleInitiateTransfer = (product: AdminProduct) => {
    setTransferProduct(product);
    setTransferSource(selectedShowroom === 'all' ? 'central' : selectedShowroom);
    setTargetShowroom('');
    setTransferQuantity(1);
    setIsAddMode(false);
    setTransferModalOpen(true);
  };


  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This product will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Product deleted successfully');
          setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
          fetchProducts();
        } else {
          toast.error('Failed to delete product');
        }
      } catch {
        toast.error('Error deleting product');
      }
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferProduct || !targetShowroom || transferQuantity < 1 || targetShowroom === transferSource) {
      toast.error('Please select a showroom and enter a valid quantity.');
      return;
    }
    const availableStock = (() => {
      if (transferSource === 'central') return transferProduct.stock;
      const srStock = transferProduct.showroomStocks?.find(
        s => typeof s.showroom === 'string' 
          ? s.showroom === transferSource 
          : s.showroom._id === transferSource
      )?.stock;
      return srStock ?? 0;
    })();

    if (transferQuantity > availableStock) {
      toast.error('Insufficient stock in the source location.');
      return;
    }
    
    setTransferring(true);
    try {
      const response = await fetch('/api/admin/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: transferProduct._id,
          sourceShowroomId: transferSource,
          showroomId: targetShowroom,
          quantity: transferQuantity,
          batchNumber: transferBatchNumber === 'auto' ? undefined : transferBatchNumber
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('Stock transfer initiated successfully');
        setTransferModalOpen(false);
        fetchProducts(); // Refresh products to show updated central stock
      } else {
        toast.error(data.message || 'Failed to initiate stock transfer');
      }
    } catch (err) {
      toast.error('An error occurred during transfer');
    } finally {
      setTransferring(false);
    }
  };

  const handleAddStockSubmit = async () => {
    if (!addStockProduct) {
      toast.error('Product is required');
      return;
    }

    // Check if any stock was added
    const hasStockAdded = addStockTopLevel > 0 || addStockVariants.some(v => v.stockToAdd > 0);
    if (!hasStockAdded) {
      toast.error('Please enter a quantity greater than 0');
      return;
    }

    setAddingStock(true);
    try {
      const response = await fetch('/api/products/add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: addStockProduct._id,
          batchNumber: addStockBatchNumber,
          expiryDate: addStockExpiryDate || undefined,
          variantStocks: addStockVariants,
          topLevelStock: addStockTopLevel
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('Stock added successfully');
        setAddStockModalOpen(false);
        fetchProducts();
      } else {
        toast.error(data.message || 'Failed to add stock');
      }
    } catch {
      toast.error('An error occurred while adding stock.');
    } finally {
      setAddingStock(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const searchLower = (search ?? '').toLowerCase();
    const nameLower = (p.name ?? '').toLowerCase();
    const skuLower = (p.sku ?? '').toLowerCase();
    return nameLower.includes(searchLower) || skuLower.includes(searchLower);
  });

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map(p => p._id);
    const areAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...prev, ...visibleIds.filter(id => !prev.includes(id))]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const cleanDescription = (htmlStr?: string) => {
    if (!htmlStr) return 'Product description';
    return htmlStr.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, ' ').trim() || 'Product description';
  };

  const getAbsoluteUrl = (urlPath?: string) => {
    if (!urlPath) return '';
    if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
      return urlPath;
    }
    return `${window.location.origin}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  };

  const exportToCSV = async () => {
    let productsToExport: AdminProduct[] = [];
    setExportLoading(true);

    try {
      toast.info('Fetching products for export...');
      const response = await fetch(`/api/products?page=1&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const allProducts: AdminProduct[] = Array.isArray(data.products) ? data.products : [];
        if (selectedIds.length > 0) {
          productsToExport = allProducts.filter(p => selectedIds.includes(p._id));
        } else {
          productsToExport = allProducts;
        }
      } else {
        productsToExport = selectedIds.length > 0 
          ? products.filter(p => selectedIds.includes(p._id))
          : products;
      }

      if (productsToExport.length === 0) {
        toast.error('No products to export');
        return;
      }

      const headers = [
        'id',
        'title',
        'item_group_id',
        'description',
        'availability',
        'condition',
        'sku',
        'price',
        'sale_price',
        'link',
        'image_link',
        'brand',
        'fb_product_category',
        'colour',
        'additional_image_link',
        'colour'
      ];

      const rows: any[][] = [];

      productsToExport.forEach(p => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any, index: number) => {
            const varPrice = v.price || p.price || 0;
            const varSalePrice = v.salePrice || p.salePrice || undefined;
            const varPriceVal = `${Math.round(varPrice)} BDT`;
            const varSalePriceVal = varSalePrice && varSalePrice < varPrice ? `${Math.round(varSalePrice)} BDT` : '';
            const varStock = v.stock !== undefined ? v.stock : (p.stock || 0);

            const primaryImage = v.image || (p.images && p.images[0]) || '';
            const additionalImages = (p.images || [])
              .filter(img => img !== primaryImage)
              .map(img => getAbsoluteUrl(img))
              .join(',');

            rows.push([
              v._id || `${p._id}-${index}`,
              p.name,
              p._id,
              cleanDescription(p.description),
              varStock > 0 ? 'in stock' : 'out of stock',
              'new',
              v.sku || p.sku || '',
              varPriceVal,
              varSalePriceVal,
              `${window.location.origin}/product/${p.slug}`,
              getAbsoluteUrl(primaryImage),
              'unknown',
              p.categories?.[0]?.name || '',
              v.color || '',
              additionalImages,
              v.color || ''
            ]);
          });
        } else {
          const priceVal = `${Math.round(p.price || 0)} BDT`;
          const salePriceVal = p.salePrice && p.salePrice < p.price ? `${Math.round(p.salePrice)} BDT` : '';
          const stockVal = p.stock || 0;

          const primaryImage = (p.images && p.images[0]) || '';
          const additionalImages = (p.images || [])
            .slice(1)
            .map(img => getAbsoluteUrl(img))
            .join(',');

          rows.push([
            p._id,
            p.name,
            p._id,
            cleanDescription(p.description),
            stockVal > 0 ? 'in stock' : 'out of stock',
            'new',
            p.sku || '',
            priceVal,
            salePriceVal,
            `${window.location.origin}/product/${p.slug}`,
            getAbsoluteUrl(primaryImage),
            'unknown',
            p.categories?.[0]?.name || '',
            '',
            additionalImages,
            ''
          ]);
        }
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `fb_catalog_export_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Facebook Catalog export started');
    } catch (error) {
      toast.error('Error exporting products');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-0 pb-2 pt-[1px] md:mt-0 md:p-8 md:pt-6">
      <div className="hidden md:flex items-center justify-between gap-4 px-2 md:px-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t("products.title")}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={exportToCSV} disabled={exportLoading} className="h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm">
            {exportLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {selectedIds.length > 0 ? `${t("products.export")} (${selectedIds.length})` : t("products.export_all")}
          </Button>
          <Link href="/admin/products/new">
            <Button className="h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t("products.add_product")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2 px-2 md:px-0 w-full">
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("products.search_placeholder") as string}
            className="pl-8 h-9 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Showroom Filter Dropdown */}
        {showroomsList.length > 0 && (
          <div className="flex items-center justify-between md:justify-start gap-1.5 bg-muted/50 p-1 rounded-lg border h-9 w-full md:w-auto">
            <div className="flex items-center gap-1 px-2 shrink-0">
              <Store className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("products.stock_view")}</span>
            </div>
            <select
              value={selectedShowroom}
              onChange={(e) => setSelectedShowroom(e.target.value)}
              className="h-7 bg-transparent text-xs border-none outline-none cursor-pointer pr-2 font-medium flex-1 md:flex-none"
            >
              <option value="all">{t("products.total_all")}</option>
              <option value="central">{t("products.central_only")}</option>
              {showroomsList.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-md border-none md:border bg-transparent md:bg-background overflow-hidden relative">
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-20 w-full bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-4 text-xs md:text-sm font-medium">
              <span>{selectedIds.length} {t("products.selected")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/10 text-xs h-7 px-2"
                onClick={() => setSelectedIds([])}
              >
                {t("products.deselect_all")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90 text-xs h-7 px-2"
                onClick={exportToCSV}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3 w-3" />
                )}
                {t("products.export_selected")}
              </Button>
            </div>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p._id))}
                    onCheckedChange={toggleSelectAll}
                    className="border-muted-foreground/50"
                  />
                </TableHead>
                <TableHead className="w-[80px]">{t("products.image")}</TableHead>
                <TableHead>{t("products.name")}</TableHead>
                <TableHead>{t("products.sku")}</TableHead>
                <TableHead>{t("products.price")}</TableHead>
                <TableHead>{getStockLabel()}</TableHead>
<TableHead>{t("products.views")}</TableHead>
                <TableHead>{t("products.sales")}</TableHead>
                <TableHead>{t("products.status")}</TableHead>
                <TableHead className="text-right">{t("products.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    {t("products.no_products_found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product._id} className={selectedIds.includes(product._id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product._id)}
                        onCheckedChange={() => toggleSelect(product._id)}
                        className="border-muted-foreground/50"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">
                        {product.images && product.images.length > 0 ? (
                          <Image 
                            src={product.images[0]} 
                            alt={product.name} 
                            width={48}
                            height={48}
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[250px]">
                      <div className="flex flex-col">
                        <Link 
                          href={`/product/${product.slug}`} 
                          target="_blank"
                          className="truncate hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4"
                        >
                          {product.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Brand: {product.brand?.name || product.attributes?.find((a: any) => a.key?.toLowerCase() === 'brand')?.value || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[10px] space-y-0.5 whitespace-nowrap">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("products.reg")}</span>
                          <span className="line-through">৳{Math.round(product.price || 0)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("products.sale")}</span>
                          <span className="font-bold text-primary">৳{Math.round(product.salePrice || product.price || 0)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("products.sr")}</span>
                          <span className="font-bold text-violet-600">৳{Math.round(product.showroomPrice || 0)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("products.ws")}</span>
                          <span className="font-bold text-amber-600">৳{Math.round(product.wholesaleSalePrice || product.wholesalePrice || 0)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {product.variants && product.variants.length > 0 && (
                          <div className="flex flex-col text-[10px] text-muted-foreground mb-1">
                            {product.variants.map((v: any, i: number) => (
                              <span key={i} className="whitespace-nowrap">
                                {v.color || 'N/A'} - {v.size || 'N/A'}: <strong className="text-foreground">{v.stock || 0}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className={(getDisplayStock(product)) <= 5 ? 'text-destructive font-semibold' : 'font-semibold'}>
                          {getDisplayStock(product)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-muted-foreground">{product.views ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">{product.totalSales ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isPublished ? 'default' : 'secondary'}>
                        {product.isPublished ? t("products.published") : t("products.draft")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {selectedShowroom !== 'all' && selectedShowroom !== 'central' && (
                            <DropdownMenuItem
                              disabled={(product.stock || 0) <= 0}
                              onClick={() => {
                                setTransferProduct(product);
                                setTransferSource('central');
                                setTargetShowroom(selectedShowroom);
                                setTransferQuantity(1);
                                setTransferBatchNumber('auto');
                                setIsAddMode(true);
                                setTransferModalOpen(true);
                              }}
                              className="cursor-pointer text-green-600 focus:text-green-600"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              <span>{t("products.add_from_central") || "Add from Central"}</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            disabled={getTransferSourceStock(product) <= 0}
                            onClick={() => handleInitiateTransfer(product)}
                            className="cursor-pointer text-blue-600 focus:text-blue-600"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            <span>{t("products.transfer_stock") || "Transfer Stock"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAddStockProduct(product);
                              setAddStockBatchNumber('');
                              setAddStockExpiryDate('');
                              setAddStockTopLevel(0);
                              setAddStockVariants(
                                (product.variants || []).map((v: any) => ({
                                  variantId: v._id,
                                  color: v.color || '',
                                  size: v.size || '',
                                  stockToAdd: 0
                                }))
                              );
                              setAddStockModalOpen(true);
                            }}
                            className="cursor-pointer text-orange-500 focus:text-orange-500"
                          >
                            <DatabaseZap className="h-4 w-4 mr-2" />
                            <span>{t("products.add_stock") || "Add Stock"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/products/${product._id}/edit`)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            <span>{t("products.edit") || "Edit"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(product._id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            <span>{t("products.delete") || "Delete"}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-border px-1">
          {loading ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t("products.no_products_found")}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const primaryImage = product.images?.[0];
              return (
                <div key={product._id} className="p-3 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-3 relative">
                  {/* Top section: Checkbox, Image, Title, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="pt-1 shrink-0">
                        <Checkbox
                          checked={selectedIds.includes(product._id)}
                          onCheckedChange={() => toggleSelect(product._id)}
                          className="h-4 w-4 border-muted-foreground/50"
                        />
                      </div>
                      {/* Image */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        {primaryImage ? (
                          <Image 
                            src={primaryImage} 
                            alt={product.name} 
                            width={48}
                            height={48}
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {/* Title & Info */}
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <Link 
                          href={`/product/${product.slug}`} 
                          target="_blank"
                          className="font-bold text-base md:text-sm text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight"
                        >
                          {product.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={product.isPublished ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5 font-bold tracking-tighter">
                            {product.isPublished ? t("products.live") : t("products.draft")}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">SKU: {product.sku || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    <div className="shrink-0 -mr-1 -mt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {selectedShowroom !== 'all' && selectedShowroom !== 'central' && (
                            <DropdownMenuItem 
                              disabled={(product.stock || 0) <= 0}
                              onClick={() => {
                                setTransferProduct(product);
                                setTransferSource('central');
                                setTargetShowroom(selectedShowroom);
                                setTransferQuantity(1);
                                setTransferBatchNumber('auto');
                                setIsAddMode(true);
                                setTransferModalOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4 text-green-600" /> {t("products.add_stock")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            disabled={getTransferSourceStock(product) <= 0}
                            onClick={() => handleInitiateTransfer(product)}
                          >
                            <Send className="mr-2 h-4 w-4 text-blue-500" /> {t("products.transfer_stock")}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setAddStockProduct(product);
                              setAddStockBatchNumber('');
                              setAddStockExpiryDate('');
                              setAddStockTopLevel(0);
                              setAddStockVariants(
                                (product.variants || []).map((v: any) => ({
                                  variantId: v._id,
                                  color: v.color || '',
                                  size: v.size || '',
                                  stockToAdd: 0
                                }))
                              );
                              setAddStockModalOpen(true);
                            }}
                          >
                            <DatabaseZap className="mr-2 h-4 w-4 text-orange-500" /> Add Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/products/${product._id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> {t("products.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(product._id)}>
                            <Trash className="mr-2 h-4 w-4" /> {t("products.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Detailed Information List */}
                  <div className="flex flex-col text-sm md:text-xs">
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.brand")}</span>
                      <span className="font-semibold text-foreground">
                        {product.brand?.name || product.attributes?.find((a: any) => a.key?.toLowerCase() === 'brand')?.value || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium mt-0.5">{t("products.stock")}</span>
                      <div className="flex flex-col items-end">
                        {product.variants && product.variants.length > 0 && (
                          <div className="flex flex-col items-end text-xs text-muted-foreground mb-1">
                            {product.variants.map((v: any, i: number) => (
                              <span key={i}>
                                {v.color || 'N/A'} - {v.size || 'N/A'}: <strong className="text-foreground">{v.stock || 0}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className={`font-semibold ${(getDisplayStock(product)) <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                          {getStockLabel()}: {getDisplayStock(product)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.purchase_cost_price")}</span>
                      <span className="font-semibold text-foreground text-base md:text-sm">
                        ৳{Math.round(product.purchasePrice || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.regular_price")}</span>
                      <span className="font-semibold text-muted-foreground line-through decoration-destructive/50 text-sm md:text-xs">
                        ৳{Math.round(product.price || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.sale_retail_price")}</span>
                      <span className="font-bold text-primary text-base md:text-sm">
                        ৳{Math.round(product.salePrice || product.price || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.showroom_price")}</span>
                      <span className="font-bold text-violet-600 text-base md:text-sm">
                        ৳{Math.round(product.showroomPrice || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">{t("products.wholesale_price")}</span>
                      <span className="font-bold text-amber-600 text-base md:text-sm">
                        ৳{Math.round(product.wholesaleSalePrice || product.wholesalePrice || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      
      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination 
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchProducts(undefined, page);
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', page.toString());
              router.push(`?${params.toString()}`);
            }}
          />
        </div>
      )}

      {/* Transfer Stock Modal */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isAddMode ? t("products.add_stock_from_central") : t("products.modal_transfer_stock")}</DialogTitle>
          </DialogHeader>
          {transferProduct && (() => {
            const getAvailableStock = () => {
              if (transferSource === 'central') return transferProduct.stock;
              const srStock = transferProduct.showroomStocks?.find(
                s => typeof s.showroom === 'string' 
                  ? s.showroom === transferSource 
                  : s.showroom._id === transferSource
              )?.stock;
              return srStock ?? 0;
            };
            const availableStock = getAvailableStock();
            
            return (
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{t("products.product_label")}</span>
                  <span className="text-sm text-muted-foreground">{transferProduct.name}</span>
                  <span className="text-xs text-muted-foreground">{t("products.available_stock_in")} {transferSource === 'central' ? t("products.central") : showroomsList.find(s => s._id === transferSource)?.name || t("products.source")}: {availableStock}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">{t("products.destination")}</label>
                  <select
                    className="col-span-3 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    value={targetShowroom}
                    onChange={(e) => setTargetShowroom(e.target.value)}
                    disabled={isAddMode}
                  >
                    <option value="" disabled>{t("products.select_destination")}</option>
                    {transferSource !== 'central' && (
                      <option value="central">{t("products.central_warehouse")}</option>
                    )}
                    {showroomsList
                      .filter(s => s._id !== transferSource)
                      .map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                  </select>
                </div>
                {/* Batch Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Batch</label>
                  <select
                    className="col-span-3 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={transferBatchNumber}
                    onChange={(e) => setTransferBatchNumber(e.target.value)}
                  >
                    <option value="auto">Auto (FIFO)</option>
                    {Array.from(new Set([
                      ...(transferProduct.batches || []).map(b => b.batchNumber),
                      ...(transferProduct.variants || []).flatMap(v => (v.batches || []).map((b: any) => b.batchNumber))
                    ])).filter(Boolean).map(batchNo => (
                      <option key={batchNo} value={batchNo}>{batchNo}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">{t("products.quantity")}</label>
                  <Input
                    type="number"
                    min="1"
                    max={availableStock > 0 ? availableStock : 1}
                    className="col-span-3"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferModalOpen(false)}>{t("products.cancel")}</Button>
            <Button onClick={handleTransferSubmit} disabled={transferring}>
              {transferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t("products.send_stock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stock Modal */}
      <Dialog open={addStockModalOpen} onOpenChange={setAddStockModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
          </DialogHeader>
          {addStockProduct && (
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Product</span>
                <span className="text-sm text-muted-foreground">{addStockProduct.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-muted-foreground">Batch Number</label>
                <Input
                  className="col-span-3"
                  placeholder="e.g. BATCH-002 (Optional)"
                  value={addStockBatchNumber}
                  onChange={(e) => setAddStockBatchNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-muted-foreground">Expiry Date</label>
                <Input
                  type="date"
                  className="col-span-3"
                  value={addStockExpiryDate}
                  onChange={(e) => setAddStockExpiryDate(e.target.value)}
                />
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-semibold mb-3">Add Stock Quantities</h4>
                {addStockVariants.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {addStockVariants.map((variant, index) => (
                      <div key={variant.variantId} className="flex items-center justify-between gap-4 p-2 border rounded-md">
                        <div className="text-sm">
                          {variant.color && <span>{variant.color}</span>}
                          {variant.color && variant.size && <span className="mx-1">-</span>}
                          {variant.size && <span>{variant.size}</span>}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          className="w-24 text-right"
                          value={variant.stockToAdd || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const newVariants = [...addStockVariants];
                            newVariants[index].stockToAdd = Math.max(0, val);
                            setAddStockVariants(newVariants);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 p-2 border rounded-md">
                    <span className="text-sm text-muted-foreground">Main Product Stock</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-24 text-right"
                      value={addStockTopLevel || ''}
                      onChange={(e) => setAddStockTopLevel(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockModalOpen(false)}>{t("products.cancel")}</Button>
            <Button onClick={handleAddStockSubmit} disabled={addingStock || !addStockBatchNumber.trim()}>
              {addingStock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
              Save Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4 pt-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, Suspense } from 'react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { ShoppingBag, Loader2, Search, Check, X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductStockItem {
  _id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  isPublished: boolean;
  images?: string[];
  slug: string;
}

function ShowroomStockContent() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 10;
  
  // Pending Transfers State
  const [activeTab, setActiveTab] = useState('current');
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchStock = async (page = currentPage) => {
    try {
      setLoading(true);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/showroom/stock?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        toast.error(`Failed to fetch stock: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setProducts(data.products || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      toast.error('An error occurred while fetching stock.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock(1);
      setCurrentPage(1);
    }, search ? 500 : 0);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchPendingTransfers = async () => {
    try {
      setTransfersLoading(true);
      const response = await fetch(`/api/showroom/stock-transfers?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setPendingTransfers(data.transfers || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingTransfers();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleTransferAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(id);
      const response = await fetch(`/api/showroom/stock-transfers/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (response.ok) {
        toast.success(`Transfer ${action}d successfully`);
        fetchPendingTransfers();
        fetchStock(currentPage);
      } else {
        toast.error(`Failed to ${action} transfer`);
      }
    } catch {
      toast.error('Error processing transfer');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStock(page);
  };

  if (loading && products.length === 0) {
    return <AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" />;
  }

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Showroom Stock</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            {t('store.showroom.stock_desc') || 'আপনার শো-রুমের বর্তমান স্টক ও প্রোডাক্টের বিবরণ দেখুন।'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="current" className="font-bold">Current Stock</TabsTrigger>
          <TabsTrigger value="pending" className="font-bold">
            Pending Approvals
            {pendingTransfers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {pendingTransfers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>

      {/* Main Stock List */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table className="block md:table">
            <TableHeader className="hidden md:table-header-group">
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Showroom Stock</TableHead>
                <TableHead>{t('store.showroom.th_status') || 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
              {loading ? (
                <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell colSpan={6} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell colSpan={6} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center text-muted-foreground">
                    No products found in this showroom.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0" key={product._id}>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name || 'Product Image'}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left font-medium max-w-[300px] truncate">
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left font-medium text-xs text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <div className="flex flex-col">
                        <span className={product.salePrice ? 'text-xs line-through text-muted-foreground' : 'font-semibold'}>
                          ৳{product.price ? Math.round(product.price) : '0'}
                        </span>
                        {product.salePrice && (
                          <span className="font-bold text-primary">
                            ৳{Math.round(product.salePrice)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <span className={`font-bold text-sm ${(product.stock ?? 0) <= 5 ? 'text-destructive' : 'text-primary'}`}>
                        {product.stock ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <Badge variant={product.isPublished ? 'default' : 'secondary'} className="text-[10px] font-bold">
                        {product.isPublished ? 'Live' : 'Draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-2.5">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm sm:text-base">
              No products found in this showroom.
            </div>
          ) : (
            products.map((product) => {
              const primaryImage = product.images?.[0];
              return (
                <div key={product._id} className="p-3 border rounded-xl bg-card shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Image */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Title & Info */}
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="font-bold text-sm sm:text-base text-foreground line-clamp-1 hover:underline hover:text-primary transition-colors"
                      >
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span>SKU: {product.sku || 'N/A'}</span>
                        <span>•</span>
                        <span className={(product.stock ?? 0) <= 5 ? 'text-destructive font-extrabold' : 'font-semibold text-foreground'}>
                          Stock: {product.stock ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-sm font-black text-primary">
                          ৳{Math.round(product.salePrice || product.price || 0)}
                        </span>
                        {product.salePrice && (
                          <span className="text-xs line-through text-muted-foreground">
                            ৳{Math.round(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side Status Badge */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <Badge variant={product.isPublished ? 'default' : 'secondary'} className="text-xs px-2 py-0.5 font-bold tracking-tight">
                      {product.isPublished ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden p-4">
            {transfersLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingTransfers.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <ClipboardList className="h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm font-medium">No pending stock transfers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTransfers.map((transfer) => (
                  <div key={transfer._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted hidden sm:block">
                        {transfer.product?.images?.[0] ? (
                          <Image
                            src={transfer.product.images[0]}
                            alt={transfer.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
                          {transfer.product?.name || 'Unknown Product'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>SKU: {transfer.product?.sku || 'N/A'}</span>
                          <span>•</span>
                          <span className="font-semibold text-primary">Incoming Qty: {transfer.quantity}</span>
                        </div>
                        {transfer.notes && (
                          <p className="text-[10px] text-muted-foreground italic line-clamp-2">
                            Note: {transfer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:shrink-0 pt-2 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleTransferAction(transfer._id, 'reject')}
                        disabled={processingId === transfer._id}
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleTransferAction(transfer._id, 'approve')}
                        disabled={processingId === transfer._id}
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ShowroomStockPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ShowroomStockContent />
    </Suspense>
  );
}

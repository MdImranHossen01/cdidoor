'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, Suspense } from 'react';
import { Search, Loader2, Calendar, FileText, CheckCircle2, XCircle, Clock, Truck, RefreshCw, Eye, Share2, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import ManualOrderDialog from '@/components/admin/ManualOrderDialog';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';

interface OrderItem {
  _id: string;
  shortId: string;
  createdAt: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
}

function ShowroomOrdersContent() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    placed: 0,
    processing: 0,
    courier: 0,
    completed: 0,
    cancelled: 0,
    hold: 0,
    returned: 0
  });
  const limit = 15;

  // {t('store.showroom.manual_order') || 'Manual Order'} states
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);

  const handleCopyLink = async (orderId: string) => {
    try {
      const shareableLink = `${window.location.origin}/orders/${orderId}`;
      await navigator.clipboard.writeText(shareableLink);
      toast.success('Shareable order link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link.');
    }
  };

  const fetchOrders = async (page = currentPage, status = statusFilter) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: status,
        search,
        from: dateFilter.from,
        to: dateFilter.to
      });

      const response = await fetch(`/api/showroom/orders?${queryParams.toString()}`);
      if (!response.ok) {
        toast.error('Failed to fetch orders');
        return;
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
      setCounts(data.counts || {
        all: 0,
        placed: 0,
        processing: 0,
        courier: 0,
        completed: 0,
        cancelled: 0,
        hold: 0,
        returned: 0
      });
    } catch (error) {
      toast.error('An error occurred while fetching orders.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, statusFilter);
  }, [search, dateFilter.from, dateFilter.to]);

  const handleTabChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
    fetchOrders(1, val);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchOrders(page, statusFilter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Placed':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" /> Placed</Badge>;
      case 'Processing':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'Shipped via Courier':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400"><Truck className="h-3 w-3 mr-1" /> Courier</Badge>;
      case 'Completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t('store.showroom.orders_title') || 'Showroom Orders'}</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            {t('store.showroom.orders_desc') || 'আপনার শো-রুমের মাধ্যমে আসা অর্ডারগুলো ট্র্যাক ও প্রসেস করুন।'}
          </p>
        </div>
        <Button onClick={() => setIsManualOrderOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0">
          <Plus className="mr-2 h-4 w-4" /> {t('store.showroom.manual_order') || 'Manual Order'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-8 h-10">
            <TabsTrigger value="All" className="px-3 text-xs">{t('store.showroom.tab_all') || 'All'} ({counts.all})</TabsTrigger>
            <TabsTrigger value="Order Placed" className="px-3 text-xs">{t('store.showroom.tab_placed') || 'Placed'} ({counts.placed})</TabsTrigger>
            <TabsTrigger value="Processing" className="px-3 text-xs">{t('store.showroom.tab_processing') || 'Processing'} ({counts.processing})</TabsTrigger>
            <TabsTrigger value="Shipped via Courier" className="px-3 text-xs">{t('store.showroom.tab_courier') || 'Courier'} ({counts.courier})</TabsTrigger>
            <TabsTrigger value="Completed" className="px-3 text-xs">{t('store.showroom.tab_completed') || 'Completed'} ({counts.completed})</TabsTrigger>
            <TabsTrigger value="Cancelled" className="px-3 text-xs">{t('store.showroom.tab_cancelled') || 'Cancelled'} ({counts.cancelled})</TabsTrigger>
            <TabsTrigger value="On Hold" className="px-3 text-xs">{t('store.showroom.tab_hold') || 'Hold'} ({counts.hold})</TabsTrigger>
            <TabsTrigger value="Returned" className="px-3 text-xs">{t('store.showroom.tab_returned') || 'Returned'} ({counts.returned})</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('store.showroom.search_orders_placeholder') || 'Search by Order ID, name, phone...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border text-sm w-full md:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground ml-1" />
          <Input
            type="date"
            className="h-8 border-none bg-transparent focus-visible:ring-0 p-1 w-32"
            value={dateFilter.from}
            onChange={(e) => {
              setDateFilter(prev => ({ ...prev, from: e.target.value }));
              setCurrentPage(1);
            }}
          />
          <span className="text-muted-foreground text-xs">{t('store.showroom.date_to') || 'to'}</span>
          <Input
            type="date"
            className="h-8 border-none bg-transparent focus-visible:ring-0 p-1 w-32"
            value={dateFilter.to}
            onChange={(e) => {
              setDateFilter(prev => ({ ...prev, to: e.target.value }));
              setCurrentPage(1);
            }}
          />
          {(dateFilter.from || dateFilter.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilter({ from: '', to: '' });
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table & Mobile list */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table className="block md:table">
            <TableHeader className="hidden md:table-header-group">
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableHead>{t('store.showroom.th_order_id') || 'Order ID'}</TableHead>
                <TableHead>{t('store.showroom.th_customer') || 'Customer'}</TableHead>
                <TableHead>{t('store.showroom.th_date') || 'Date'}</TableHead>
                <TableHead>{t('store.showroom.th_payment') || 'Payment'}</TableHead>
                <TableHead>{t('store.showroom.th_status') || 'Status'}</TableHead>
                <TableHead className="text-right">{t('store.showroom.th_total') || 'Total'}</TableHead>
                <TableHead className="text-right">{t('store.showroom.th_actions') || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
              {loading ? (
                <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell colSpan={7} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell colSpan={7} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center text-muted-foreground">
                    {t('store.showroom.no_orders_found') || 'No orders found.'}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0" key={order._id}>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left font-bold text-xs">#{order.shortId}</TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <div className="font-semibold text-sm">{order.shippingAddress?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{order.shippingAddress?.phone}</div>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-xs text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                      <div className="text-xs font-semibold">{order.paymentMethod}</div>
                      <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-[10px] scale-90 -ml-1">
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right font-extrabold text-sm text-primary">
                      ৳{Math.round(order.totalAmount)}
                    </TableCell>
                    <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => handleCopyLink(order._id)}
                          title={t('store.showroom.copy_link_title') || 'Copy Shareable Invoice/Payment Link'}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }} aria-label="View order details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm sm:text-base">
              {t('store.showroom.no_orders_found') || 'No orders found.'}
            </div>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="p-3 border rounded-xl bg-card shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm sm:text-base text-foreground">#{order.shortId}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '-'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-semibold text-foreground">{order.shippingAddress?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{order.shippingAddress?.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="text-foreground">{order.paymentMethod} • {order.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm sm:text-base font-extrabold text-primary">৳{Math.round(order.totalAmount)}</span>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(order.status)}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => handleCopyLink(order._id)}
                        title={t('store.showroom.copy_link_title_mobile') || 'Copy Shareable Link'}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }} aria-label="View order details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isDetailsOpen && (
        <OrderDetailsDialog
          orderId={selectedOrderId}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onUpdate={() => fetchOrders(currentPage, statusFilter)}
        />
      )}

      <ManualOrderDialog
        open={isManualOrderOpen}
        onOpenChange={setIsManualOrderOpen}
        onCreated={() => fetchOrders(currentPage, statusFilter)}
        allowedStatuses={[
          { value: 'Order Placed', label: 'Order Placed' },
          { value: 'Processing', label: 'Processing' },
          { value: 'Shipped via Courier', label: 'Shipped via Courier' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Cancelled', label: 'Cancelled' },
          { value: 'On Hold', label: 'On Hold' },
          { value: 'Returned', label: 'Returned' }
        ]}
      />

      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default function ShowroomOrdersPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ShowroomOrdersContent />
    </Suspense>
  );
}

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, Suspense } from 'react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  Search, Calendar, FileText, CheckCircle2, XCircle, Clock,
  Truck, RefreshCw, Eye, Share2, Plus, SlidersHorizontal,
  ChevronDown, Filter as FilterIcon, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import ManualOrderDialog from '@/components/admin/ManualOrderDialog';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

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
  items?: any[];
}

const STATUS_TABS = [
  { label: 'All',        value: 'All',                  countKey: 'all' },
  { label: 'Placed',     value: 'Order Placed',          countKey: 'placed' },
  { label: 'Processing', value: 'Processing',            countKey: 'processing' },
  { label: 'Courier',    value: 'Shipped via Courier',   countKey: 'courier' },
  { label: 'Completed',  value: 'Completed',             countKey: 'completed' },
  { label: 'Cancelled',  value: 'Cancelled',             countKey: 'cancelled' },
  { label: 'Hold',       value: 'On Hold',               countKey: 'hold' },
  { label: 'Returned',   value: 'Returned',              countKey: 'returned' },
];

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0, placed: 0, processing: 0, courier: 0,
    completed: 0, cancelled: 0, hold: 0, returned: 0
  });
  const limit = 15;
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);

  const handleCopyLink = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/orders/${orderId}`);
      toast.success('Shareable order link copied!');
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const fetchOrders = async (page = currentPage, status = statusFilter) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(), limit: limit.toString(),
        status, search, from: dateFilter.from, to: dateFilter.to
      });
      const response = await fetch(`/api/showroom/orders?${queryParams}`);
      if (!response.ok) { toast.error('Failed to fetch orders'); return; }
      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
      setCounts(data.counts || {});
    } catch {
      toast.error('An error occurred while fetching orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(1, statusFilter); }, [search, dateFilter.from, dateFilter.to]);

  const handleTabChange = (val: string) => {
    setStatusFilter(val); setCurrentPage(1); fetchOrders(1, val);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const allIds = orders.map(o => o._id);
    const allSelected = allIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter(id => !allIds.includes(id)) : [...new Set([...selectedIds, ...allIds])]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Placed':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Placed</Badge>;
      case 'Processing':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"><RefreshCw className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'Shipped via Courier':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"><Truck className="h-3 w-3 mr-1" />Courier</Badge>;
      case 'Completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasActiveFilters = statusFilter !== 'All' || dateFilter.from || dateFilter.to || search;

  if (loading && orders.length === 0) {
    return <AdminTableSkeleton rowCount={7} columnCount={7} titleWidth="w-48" />;
  }

  return (
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8 w-full max-w-full overflow-x-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t('store.showroom.orders_title') || 'Showroom Orders'}
            </h2>
            <p className="text-muted-foreground text-xs hidden sm:block">
              {t('store.showroom.orders_desc') || 'Track and process showroom orders'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`h-9 px-3 md:hidden flex-1 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            {t('store.showroom.filters') || 'Filters'}
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>

          <Button
            onClick={() => setIsManualOrderOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 shrink-0 flex-[2] md:flex-none"
          >
            <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('store.showroom.manual_order') || 'Manual Order'}
          </Button>
        </div>
      </div>

      {/* ── Desktop Search & Date Filters ── */}
      <div className="hidden md:flex items-center gap-2 w-full">
        <div className="relative w-80 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('store.showroom.search_orders_placeholder') as string || 'Search by name, phone, order ID...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-10"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-md border h-10">
          <Calendar className="h-4 w-4 text-muted-foreground ml-1" />
          <Input type="date" className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs"
            value={dateFilter.from}
            onChange={e => { setDateFilter(p => ({ ...p, from: e.target.value })); setCurrentPage(1); }} />
          <span className="text-muted-foreground text-xs">{t('store.showroom.date_to') || 'to'}</span>
          <Input type="date" className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs"
            value={dateFilter.to}
            onChange={e => { setDateFilter(p => ({ ...p, to: e.target.value })); setCurrentPage(1); }} />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm"
            onClick={() => { setSearch(''); setDateFilter({ from: '', to: '' }); setStatusFilter('All'); setCurrentPage(1); }}
            className="text-xs text-muted-foreground hover:text-primary shrink-0"
          >
            {t('store.showroom.clear_all') || 'Clear All'}
          </Button>
        )}
      </div>

      {/* ── Collapsible Mobile Filter Panel ── */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full ${showMobileFilters
        ? 'grid-rows-[1fr] opacity-100 visible'
        : 'grid-rows-[0fr] opacity-0 invisible h-0 overflow-hidden'}`}>
        <div className="overflow-hidden flex flex-col gap-2.5 p-3 rounded-xl border bg-muted/30">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('store.showroom.search_orders_placeholder') as string || 'Search...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between text-xs">
                <span className="flex items-center">
                  <FilterIcon className="mr-2 h-3.5 w-3.5" />
                  {statusFilter === 'All' ? (t('store.showroom.all_statuses') || 'All Statuses') : statusFilter}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('store.showroom.filter_by_status') || 'Filter by Status'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_TABS.map(s => (
                  <DropdownMenuItem key={s.value}
                    onClick={() => { handleTabChange(s.value); }}
                    className={statusFilter === s.value ? 'bg-accent font-bold' : ''}
                  >
                    <div className="flex items-center justify-between w-full text-xs">
                      <span>{s.label}</span>
                      <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0">
                        {counts[s.countKey] ?? 0}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile date filter */}
          <div className="flex flex-col gap-1.5 text-xs bg-background p-2 rounded-md border">
            <span className="font-bold text-foreground">{t('store.showroom.filter_by_date') || 'Filter by Date'}</span>
            <div className="flex items-center gap-1">
              <Input type="date" className="h-7 w-full border border-input rounded bg-transparent p-1 text-xs focus-visible:ring-0"
                value={dateFilter.from}
                onChange={e => { setDateFilter(p => ({ ...p, from: e.target.value })); setCurrentPage(1); }} />
              <span className="text-muted-foreground text-[10px]">{t('store.showroom.date_to') || 'to'}</span>
              <Input type="date" className="h-7 w-full border border-input rounded bg-transparent p-1 text-xs focus-visible:ring-0"
                value={dateFilter.to}
                onChange={e => { setDateFilter(p => ({ ...p, to: e.target.value })); setCurrentPage(1); }} />
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm"
              onClick={() => { setSearch(''); setDateFilter({ from: '', to: '' }); setStatusFilter('All'); setCurrentPage(1); }}
              className="text-xs text-muted-foreground hover:text-primary h-8"
            >
              {t('store.showroom.clear_all_filters') || 'Clear All Filters'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Desktop Status Tabs ── */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-2 pb-2 border-b">
        {STATUS_TABS.map(s => {
          const isActive = statusFilter === s.value;
          return (
            <button key={s.value}
              onClick={() => handleTabChange(s.value)}
              className={`w-full py-2 text-xs font-semibold rounded-md transition-all duration-200 text-center flex items-center justify-center gap-1.5 ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-muted text-muted-foreground border border-input'}`}
            >
              <span>{s.label}</span>
              <span className={`text-[10px] px-1.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground border'}`}>
                {counts[s.countKey] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table & Cards ── */}
      <div className="rounded-md border bg-background overflow-hidden relative">

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={orders.length > 0 && orders.every(o => selectedIds.includes(o._id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t('store.showroom.th_order_id') || 'Order ID'}</TableHead>
                <TableHead>{t('store.showroom.th_customer') || 'Customer'}</TableHead>
                <TableHead>{t('store.showroom.th_date') || 'Date'}</TableHead>
                <TableHead>{t('store.showroom.th_payment') || 'Payment'}</TableHead>
                <TableHead>{t('store.showroom.th_status') || 'Status'}</TableHead>
                <TableHead className="text-right">{t('store.showroom.th_total') || 'Total'}</TableHead>
                <TableHead className="text-right">{t('store.showroom.th_actions') || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t('store.showroom.no_orders_found') || 'No orders found.'}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map(order => (
                  <TableRow key={order._id} className={selectedIds.includes(order._id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(order._id)} onCheckedChange={() => toggleSelect(order._id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">#{order.shortId}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{order.shippingAddress?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{order.shippingAddress?.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold">{order.paymentMethod}</div>
                      <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-[10px] scale-90 -ml-1">
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-extrabold text-sm text-primary">
                      ৳{Math.round(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"
                          onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>{t('store.showroom.th_actions') || 'Actions'}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleCopyLink(order._id)}>
                                <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> {t('store.showroom.copy_link_title') || 'Copy Link'}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Mobile Cards (Admin Pattern) ── */}
        <div className="block md:hidden divide-y">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              {t('store.showroom.no_orders_found') || 'No orders found.'}
            </div>
          ) : (
            orders.map(order => (
              <div key={order._id}
                className={`p-4 sm:p-5 transition-colors ${selectedIds.includes(order._id) ? 'bg-muted/50' : 'bg-background'}`}
              >
                {/* Card Header: Checkbox + Order ID + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.includes(order._id)}
                      onCheckedChange={() => toggleSelect(order._id)}
                      className="h-5 w-5"
                    />
                    <button type="button"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}
                    >
                      <span className="text-sm font-bold text-primary hover:underline">
                        #{order.shortId}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Customer name + Total */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-base text-foreground">
                    {order.shippingAddress?.fullName || '—'}
                  </span>
                  <span className="font-bold text-lg text-foreground">
                    ৳{Math.round(order.totalAmount)}
                  </span>
                </div>

                {/* Phone + Date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
                  <span className="font-medium">{order.shippingAddress?.phone || '—'}</span>
                  <span>{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, p') : '—'}</span>
                </div>

                {/* Payment info */}
                <div className="flex items-center gap-2 py-2 border-t border-b mb-2.5">
                  <span className="text-xs text-muted-foreground">{order.paymentMethod}</span>
                  <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-[10px]">
                    {order.paymentStatus}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-0.5">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 mr-2"
                    onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    {t('store.showroom.view_details') || 'View Details'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{t('store.showroom.th_actions') || 'Actions'}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleCopyLink(order._id)}>
                          <Share2 className="mr-2 h-4 w-4 text-indigo-600" />
                          {t('store.showroom.copy_link_title_mobile') || 'Copy Shareable Link'}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Details Dialog */}
      {isDetailsOpen && (
        <OrderDetailsDialog
          orderId={selectedOrderId}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onUpdate={() => fetchOrders(currentPage, statusFilter)}
        />
      )}

      {/* Manual Order Dialog */}
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

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={p => { setCurrentPage(p); fetchOrders(p, statusFilter); }}
          />
        </div>
      )}
    </div>
  );
}

export default function ShowroomOrdersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <ShowroomOrdersContent />
    </Suspense>
  );
}

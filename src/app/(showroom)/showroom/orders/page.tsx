'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, Suspense } from 'react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  Search, Calendar, FileText, CheckCircle2, XCircle, Clock,
  Truck, RefreshCw, Eye, Share2, Plus, SlidersHorizontal,
  ChevronDown, Filter as FilterIcon, MoreHorizontal, Copy
} from 'lucide-react';
import { getWhatsAppLink } from '@/lib/utils';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z" />
  </svg>
);

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
    street?: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
  deliveryCharge?: number;
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
      <div className="border-0 md:border md:rounded-md bg-transparent md:bg-background overflow-hidden relative">

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
        <div className="block md:hidden space-y-3">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs bg-background rounded-lg border">
              {t('store.showroom.no_orders_found') || 'No orders found.'}
            </div>
          ) : (
            orders.map(order => {
              const isSelected = selectedIds.includes(order._id);
              const isPaid = order.paymentStatus === 'Paid';
              const totalAmt = Math.round(order.totalAmount || 0);
              const netSale = Math.max(0, Math.round(totalAmt - (order.deliveryCharge || 0)));
              const paidAmt = isPaid ? totalAmt : 0;
              const dueAmt = isPaid ? 0 : totalAmt;

              return (
                <div
                  key={order._id}
                  className={`rounded-lg border bg-card text-card-foreground shadow-xs transition-all overflow-hidden ${
                    isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'
                  }`}
                >
                  {/* Top Action Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(order._id)}
                        className="h-4 w-4"
                      />
                      <button
                        type="button"
                        onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}
                        className="text-xs font-mono font-bold text-primary hover:underline"
                      >
                        #{order.shortId}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Action Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="h-7 bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold px-2 py-0 rounded flex items-center gap-1 shadow-xs"
                          >
                            <span>{t('orders.action_btn') || 'Action'}</span>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{t('store.showroom.th_actions') || 'Actions'}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}>
                              <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> {t('store.showroom.view_details') || 'View Details'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(order._id)}>
                              <Share2 className="mr-2 h-3.5 w-3.5 text-indigo-600" /> {t('store.showroom.copy_link_title_mobile') || 'Copy Link'}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Quick View Button */}
                      <Button
                        size="icon"
                        className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded p-0 shadow-xs"
                        title={t('store.showroom.view_details') || 'View Details'}
                        onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Key-Value Structured Rows */}
                  <div className="px-3 py-1 divide-y divide-border/40 text-xs">

                    {/* Row 1: ইনঃ নং ও স্ট্যাটাস */}
                    <div className="flex items-start justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.inv_status') || 'ইনঃ নং ও স্ট্যাটাস'}
                      </span>
                      <div className="text-right flex flex-col items-end gap-1">
                        <button
                          type="button"
                          className="font-bold text-primary hover:underline font-mono text-xs cursor-pointer"
                          onClick={() => { setSelectedOrderId(order._id); setIsDetailsOpen(true); }}
                        >
                          #{order.shortId}
                        </button>
                        <div>{getStatusBadge(order.status)}</div>
                      </div>
                    </div>

                    {/* Row 2: তারিখ */}
                    <div className="flex items-start justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.date') || 'তারিখ'}
                      </span>
                      <div className="text-right">
                        <span className="font-medium text-foreground block">
                          {order.createdAt ? format(new Date(order.createdAt), 'dd-MMM-yyyy, hh:mm a') : '—'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          By: Showroom
                        </span>
                      </div>
                    </div>

                    {/* Row 3: কাস্টমার */}
                    <div className="flex items-start justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.customer') || 'কাস্টমার'}
                      </span>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-foreground text-xs">
                          {order.shippingAddress?.fullName || '—'}
                        </span>
                        {order.shippingAddress?.phone ? (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-end">
                            <span
                              onClick={() => setSearch(order.shippingAddress.phone)}
                              className="font-medium text-muted-foreground hover:text-primary cursor-pointer hover:underline text-[11px]"
                            >
                              {order.shippingAddress.phone}
                            </span>
                            <a
                              href={getWhatsAppLink(order.shippingAddress.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 p-0.5"
                              title="WhatsApp"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(order.shippingAddress.phone);
                                  toast.success('Phone copied!');
                                } catch {
                                  toast.error('Failed to copy');
                                }
                              }}
                              className="text-muted-foreground hover:text-primary p-0.5"
                              title="Copy Phone"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </div>
                    </div>

                    {/* Row 4: এরিয়া ও ডেলিভারী */}
                    <div className="flex items-start justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.area_delivery') || 'এরিয়া ও ডেলিভারী'}
                      </span>
                      <div className="text-right max-w-[200px]">
                        <span className="text-foreground font-medium block">
                          {[order.shippingAddress?.street, order.shippingAddress?.city].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Row 5: নীট সেল */}
                    <div className="flex items-center justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.net_sale') || 'নীট সেল'}
                      </span>
                      <span className="font-medium text-foreground">
                        ৳{netSale.toLocaleString()}
                      </span>
                    </div>

                    {/* Row 6: ডেলিভারী */}
                    <div className="flex items-center justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.delivery') || 'ডেলিভারী'}
                      </span>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-muted-foreground text-[11px]">
                          {t('orders.delivery_charge_label') || 'চার্জ:'} <span className="font-semibold text-foreground">৳{order.deliveryCharge || 0}</span>
                        </span>
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-[10px] px-1.5 py-0">
                          {order.paymentMethod || 'ডেলিভারী'}
                        </Badge>
                      </div>
                    </div>

                    {/* Row 7: মোট */}
                    <div className="flex items-center justify-between py-2 gap-2 bg-muted/20 -mx-3 px-3">
                      <span className="font-bold text-foreground shrink-0 min-w-[85px]">
                        {t('orders.total') || 'মোট'}
                      </span>
                      <span className="font-extrabold text-foreground text-sm">
                        ৳{totalAmt.toLocaleString()}
                      </span>
                    </div>

                    {/* Row 8: পেইড */}
                    <div className="flex items-center justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.paid_label') || 'পেইড'}
                      </span>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={isPaid ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium text-muted-foreground"}>
                          ৳{paidAmt.toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={isPaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[10px] px-1.5 py-0" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 text-[10px] px-1.5 py-0"}
                        >
                          {order.paymentStatus || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    {/* Row 9: বাকি */}
                    <div className="flex items-start justify-between py-2 gap-2">
                      <span className="font-semibold text-muted-foreground shrink-0 min-w-[85px]">
                        {t('orders.due_label') || 'বাকি'}
                      </span>
                      <span className={dueAmt > 0 ? "font-bold text-red-600 dark:text-red-400" : "font-bold text-emerald-600 dark:text-emerald-400"}>
                        ৳{dueAmt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
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

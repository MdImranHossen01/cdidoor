'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import { getWhatsAppLink } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Trash2,
  XCircle,
  Download,
  MoreHorizontal,
  Printer,
  FileText,
  Filter as FilterIcon,
  SlidersHorizontal,
  Copy,
  Search,
  Share2,
  Plus,
  ChevronDown
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { useLanguage } from '@/contexts/LanguageContext';

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

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    {...props}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z" />
  </svg>
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import { printStickerInvoice } from '@/lib/sticker-generator';
import ManualOrderDialog from '@/components/admin/ManualOrderDialog';


const fraudCache: { [phone: string]: { success_ratio: number; total_parcel: number } | null } = {};
const fraudPendingRequests: { [phone: string]: Promise<any> | null } = {};

function FraudCheckBadge({ phone }: { phone?: string }) {
  const [loading, setLoading] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);

  const cachedData = phone ? fraudCache[phone] : undefined;

  useEffect(() => {
    if (!phone || cachedData !== undefined) return;

    const fetchFraud = async () => {
      setLoading(true);
      try {
        let promise = fraudPendingRequests[phone];
        if (!promise) {
          promise = fetch(`/api/admin/courier/fraud-check?phone=${phone}`).then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed');
          });
          fraudPendingRequests[phone] = promise;
        }

        const json = await promise;
        if (json?.status === 'success' && json?.data?.summary) {
          const summary = json.data.summary;
          fraudCache[phone] = {
            success_ratio: summary.success_ratio,
            total_parcel: summary.total_parcel
          };
        } else {
          fraudCache[phone] = null;
        }
      } catch (e) {
        fraudCache[phone] = null;
      } finally {
        setLoading(false);
        setFetchVersion(v => v + 1);
        delete fraudPendingRequests[phone];
      }
    };

    fetchFraud();
  }, [phone, cachedData]);

  if (loading) {
    return <span className="text-[10px] text-muted-foreground ml-1.5 animate-pulse">Checking...</span>;
  }

  if (!cachedData) return null;

  const ratio = cachedData.success_ratio;
  const colorClass = ratio >= 80 ? 'text-green-600 font-extrabold' : ratio >= 60 ? 'text-yellow-600 font-extrabold' : 'text-red-600 font-extrabold';

  return (
    <span className={`text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 ${colorClass}`} title={`${cachedData.total_parcel} total parcels`}>
      {ratio}% Success
    </span>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));

  const [orders, setOrders] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<any>({
    all: 0,
    placed: 0,
    confirmed: 0,
    paid: 0,
    ready: 0,
    released: 0,
    delivered: 0,
    cancelled: 0,
    credit: 0,
    due: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get('search') || '');
  const prevSearchRef = useRef(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [dateFilter, setDateFilter] = useState(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam || toParam) {
      return { from: fromParam || '', to: toParam || '' };
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    };
  });
  const [filterByDate, setFilterByDate] = useState(() => {
    if (searchParams.get('from') || searchParams.get('to')) {
      return true;
    }
    if (searchParams.get('filterByDate') === 'true') {
      return true;
    }
    if (searchParams.get('filterByDate') === 'false') {
      return false;
    }
    // If no filter or query parameters are present at all (initial fresh navigation), default to true
    return Array.from(searchParams.keys()).length === 0;
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Manual Order states
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== prevSearchRef.current) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
        prevSearchRef.current = searchTerm;
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync state to URL search parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    if (statusFilter !== 'All') {
      params.set('status', statusFilter);
    }
    if (debouncedSearchTerm) {
      params.set('search', debouncedSearchTerm);
    }
    if (filterByDate) {
      if (dateFilter.from) {
        params.set('from', dateFilter.from);
      }
      if (dateFilter.to) {
        params.set('to', dateFilter.to);
      }
    } else {
      params.set('filterByDate', 'false');
    }

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();
    if (currentQuery !== newQuery) {
      router.replace(`/admin/orders?${newQuery}`);
    }
  }, [currentPage, statusFilter, debouncedSearchTerm, filterByDate, dateFilter.from, dateFilter.to]);

  const handleCopyLink = async (orderId: string) => {
    try {
      const shareableLink = `${window.location.origin}/orders/${orderId}`;
      await navigator.clipboard.writeText(shareableLink);
      toast.success('Shareable order link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link.');
    }
  };

  const handleDownloadInvoice = async (order: any) => {
    try {
      toast.info('Generating PDF invoice...');
      await generateInvoicePDF(order, settings);
    } catch (error) {
      toast.error('Failed to generate PDF invoice');
    }
  };

  const handlePrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info(`Generating ${toPrint.length > 1 ? toPrint.length + ' invoices' : 'invoice'}...`);
    await generateInvoicePDF(toPrint, settings, 'print');
  };

  const handlePrintStickers = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info('Preparing sticker invoice...');
    await printStickerInvoice(toPrint, settings);
  };

  const fetchOrders = async (pageVal = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        all: 'true',
        page: pageVal.toString(),
        limit: '20',
        search: debouncedSearchTerm,
        status: statusFilter,
        from: filterByDate ? dateFilter.from : '',
        to: filterByDate ? dateFilter.to : ''
      });
      const res = await fetch(`/api/orders?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load orders: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      if (data.counts) {
        setStatusCounts(data.counts);
      }

      // Also fetch settings for the invoice generator
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use a small timeout to avoid calling setState (setLoading) synchronously 
    // within the effect body, which triggers React's cascading render warning
    const timer = setTimeout(() => {
      fetchOrders(currentPage);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentPage, debouncedSearchTerm, statusFilter, filterByDate, dateFilter.from, dateFilter.to]);

  // Synchronize state when search parameters change (to support browser back/forward navigation)
  // IMPORTANT: Only depend on searchParams — do NOT add state values here or it causes circular updates
  useEffect(() => {
    const timer = setTimeout(() => {
      const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
      setCurrentPage(pageFromParams);

      const statusFromParams = searchParams.get('status') || 'All';
      setStatusFilter(statusFromParams);

      const searchFromParams = searchParams.get('search') || '';
      setSearchTerm(searchFromParams);
      setDebouncedSearchTerm(searchFromParams);
      prevSearchRef.current = searchFromParams;

      const fromFromParams = searchParams.get('from') || '';
      const toFromParams = searchParams.get('to') || '';
      if (fromFromParams || toFromParams) {
        setDateFilter({ from: fromFromParams, to: toFromParams });
        setFilterByDate(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]); // ONLY searchParams — intentional

  const filteredOrders = orders;

  const toggleSelectAll = () => {
    const filteredIds = filteredOrders.map(o => o._id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

    if (areAllSelected) {
      // Unselect only the filtered ones
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add missing filtered ones to selection
      setSelectedIds(prev => [...prev, ...filteredIds.filter(id => !prev.includes(id))]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateStatus = async (id: string, status: string, extraData: any = {}) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extraData }),
      });

      if (res.ok) {
        toast.success(`Order updated successfully`);
        fetchOrders();
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  const handleBulkUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Update?',
      text: `Are you sure you want to update ${selectedIds.length} orders to "${status}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      confirmButtonText: 'Yes, update them!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      if (res.ok) {
        toast.success(`Bulk update completed successfully`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error('Bulk update failed');
      }
    } catch (error) {
      toast.error('Error in bulk update');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Delete?',
      text: `Are you sure you want to permanently delete ${selectedIds.length} orders? This cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete all!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        toast.success(`Orders deleted successfully`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error('Bulk delete failed');
      }
    } catch (error) {
      toast.error('Error in bulk delete');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const ordersToExport = selectedIds.length > 0
      ? orders.filter(o => selectedIds.includes(o._id))
      : filteredOrders;

    if (ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer',
      'Email',
      'Phone',
      'Address',
      'Division/State',
      'Items',
      'Shipping Charge',
      'Discount',
      'Total Amount',
      'Purchase Cost',
      'Profit',
      'Payment Status',
      'Order Status'
    ];

    const rows = ordersToExport.map(o => {
      const shipping = o.shippingAddress || {};
      const fullAddress = `${shipping.street || ''}, ${shipping.city || ''}`;
      const itemsList = o.items.map((i: any) => {
        const variantDesc = [i.color, i.size].filter(Boolean).join('/');
        return `• ${i.quantity} x ${i.name}${variantDesc ? ` [${variantDesc}]` : ''} (@৳${i.price})`;
      }).join('\n');

      // Profit Calculation: Total - COGS - DeliveryCharge
      const totalPurchaseCost = o.items.reduce((acc: number, i: any) => acc + ((i.purchasePrice || 0) * i.quantity), 0);
      const profit = o.totalAmount - totalPurchaseCost - (o.deliveryCharge || 0);

      return [
        o._id.toUpperCase(),
        format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
        shipping.fullName || o.user?.name || 'Guest',
        o.user?.email || 'Guest',
        shipping.phone || 'N/A',
        fullAddress,
        shipping.division || shipping.state || 'N/A',
        itemsList,
        o.deliveryCharge || 0,
        o.couponDiscountAmount || 0,
        o.totalAmount,
        totalPurchaseCost,
        Math.round(profit),
        o.paymentStatus,
        o.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Excel/CSV export started');
  };

  const deleteOrder = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This order will be permanently deleted from the database!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success('Order deleted successfully');
          fetchOrders();
        } else {
          toast.error('Failed to delete order');
        }
      } catch (error) {
        toast.error('Error deleting order');
      }
    }
  };

  const handleSendToSteadfast = async (ids: string[]) => {
    if (ids.length === 0) return;

    const result = await Swal.fire({
      title: 'Send to Steadfast?',
      text: `Are you sure you want to send ${ids.length} order(s) to Steadfast Courier?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Yes, send now!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/courier/steadfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (ids.length > 1) setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch (error) {
      toast.error('Error sending to Steadfast');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: "Are you sure you want to cancel this order?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, cancel it!',
    });

    if (result.isConfirmed) {
      await updateStatus(orderId, 'Cancelled');
    }
  };

  const openDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Placed': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none">Placed</Badge>;
      case 'Confirmed': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">Confirmed</Badge>;
      case 'Paid': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none text-[10px]">Paid</Badge>;
      case 'Ready for Delivery': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-none text-[10px]">Ready</Badge>;
      case 'Released for Delivery': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none text-[10px]">Released</Badge>;
      case 'Delivered': return <Badge variant="default" className="bg-green-600 text-white border-none">Delivered</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <AdminTableSkeleton rowCount={7} columnCount={6} titleWidth="w-56" showStats={true} />;
  }

  return (
    <div className="flex-1 space-y-4 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("orders.title")}</h2>
            <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">{t("orders.subtitle")}</p>
          </div>
          {/* Mobile-only Export Button */}
          <Button 
            onClick={exportToCSV} 
            variant="outline"
            className="md:hidden font-bold text-xs h-9 px-3 shrink-0"
          >
            <Download className="mr-1 h-3.5 w-3.5" /> {t("orders.export")}
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Mobile Filter Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`h-9 px-3 md:hidden flex-1 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            {t("orders.filters")}
            {(statusFilter !== 'All' || dateFilter.from || dateFilter.to || searchTerm) && (
              <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>

          <Button
            onClick={() => setIsManualOrderOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 shrink-0 flex-[2] md:flex-none"
          >
            <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t("orders.manual_order")}
          </Button>
          
          {/* Desktop-only Export Button */}
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="hidden md:flex font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 shrink-0"
          >
            <Download className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t("orders.export")}
          </Button>
        </div>
      </div>

      {/* Desktop Search & Date Filter Bar */}
      <div className="hidden md:flex items-center gap-2 w-full">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("orders.search_placeholder") as string}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full h-10"
          />
        </div>

        {/* Date Filter Checkbox & Date Inputs */}
        <div className="flex items-center gap-1.5 text-xs">
          <label className="flex items-center gap-1 cursor-pointer font-bold text-foreground shrink-0 select-none">
            <input
              type="checkbox"
              checked={filterByDate}
              onChange={(e) => setFilterByDate(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
            />
            {t("orders.filter_by_date")}
          </label>

          <div className={`flex items-center gap-1 bg-muted/50 p-1 rounded-md border w-auto h-10 transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
            <Input
              type="date"
              className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs font-medium"
              value={dateFilter.from}
              onChange={(e) => {
                setDateFilter(prev => ({ ...prev, from: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={!filterByDate}
            />
            <span className="text-muted-foreground text-xs">{t("orders.to")}</span>
            <Input
              type="date"
              className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs font-medium"
              value={dateFilter.to}
              onChange={(e) => {
                setDateFilter(prev => ({ ...prev, to: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={!filterByDate}
            />
          </div>
        </div>

        {((filterByDate && (dateFilter.from || dateFilter.to)) || statusFilter !== 'All' || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setDateFilter({
                from: format(start, 'yyyy-MM-dd'),
                to: format(end, 'yyyy-MM-dd')
              });
              setFilterByDate(false);
              setStatusFilter('All');
              setSearchTerm('');
              setDebouncedSearchTerm('');
              prevSearchRef.current = '';
              setCurrentPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-primary shrink-0"
          >
            {t("orders.clear_all")}
          </Button>
        )}
      </div>

      {/* Collapsible Mobile Filter Controls */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full ${showMobileFilters
        ? 'grid-rows-[1fr] opacity-100 visible'
        : 'grid-rows-[0fr] opacity-0 invisible h-0 overflow-hidden'
        }`}>
        <div className="overflow-hidden flex flex-col gap-2.5 p-3 rounded-xl border bg-muted/30">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("orders.search_placeholder") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full h-9 text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between text-xs">
                <span className="flex items-center">
                  <FilterIcon className="mr-2 h-3.5 w-3.5" />
                  {statusFilter === 'All' ? t("orders.all_statuses") : (t(`orders.status_${statusFilter.toLowerCase().replace(/ /g, '_')}`) || statusFilter)}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("orders.filter_by_status")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { label: 'All', value: 'All', count: statusCounts.all },
                  { label: 'Placed', value: 'Order Placed', count: statusCounts.placed },
                  { label: 'Confirmed', value: 'Confirmed', count: statusCounts.confirmed },
                  { label: 'Paid', value: 'Paid', count: statusCounts.paid },
                  { label: 'Ready', value: 'Ready for Delivery', count: statusCounts.ready },
                  { label: 'Released', value: 'Released for Delivery', count: statusCounts.released },
                  { label: 'Delivered', value: 'Delivered', count: statusCounts.delivered },
                  { label: 'Cancelled', value: 'Cancelled', count: statusCounts.cancelled },
                  { label: 'Credit', value: 'Credit', count: statusCounts.credit },
                  { label: 'Due', value: 'Due', count: statusCounts.due }
                ].map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    onClick={() => {
                      setStatusFilter(status.value);
                      setCurrentPage(1);
                    }}
                    className={statusFilter === status.value ? "bg-accent font-bold" : ""}
                  >
                    <div className="flex items-center justify-between w-full text-xs">
                      <span>{t(`orders.status_${status.label.toLowerCase()}`)}</span>
                      <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0">
                        {status.count ?? 0}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Date Filter */}
          <div className="flex flex-col gap-1.5 text-xs bg-background p-2 rounded-md border">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-foreground select-none">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
              />
              {t("orders.filter_by_date")}
            </label>
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
              <Input
                type="date"
                className="h-7 w-full border border-input rounded bg-transparent focus-visible:ring-0 p-1 text-xs"
                value={dateFilter.from}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, from: e.target.value }));
                  setCurrentPage(1);
                }}
                disabled={!filterByDate}
              />
              <span className="text-muted-foreground text-[10px]">{t("orders.to")}</span>
              <Input
                type="date"
                className="h-7 w-full border border-input rounded bg-transparent focus-visible:ring-0 p-1 text-xs"
                value={dateFilter.to}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, to: e.target.value }));
                  setCurrentPage(1);
                }}
                disabled={!filterByDate}
              />
            </div>
          </div>

          {((filterByDate && (dateFilter.from || dateFilter.to)) || statusFilter !== 'All' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setDateFilter({
                  from: format(start, 'yyyy-MM-dd'),
                  to: format(end, 'yyyy-MM-dd')
                });
                setFilterByDate(false);
                setStatusFilter('All');
                setSearchTerm('');
                setDebouncedSearchTerm('');
                prevSearchRef.current = '';
                setCurrentPage(1);
              }}
              className="text-xs text-muted-foreground hover:text-primary h-8"
            >
              {t("orders.clear_all_filters")}
            </Button>
          )}
        </div>
      </div>

      {/* Status Tabs Row (Desktop only - Full Width Grid) */}
      <div className="hidden md:grid md:grid-cols-5 lg:grid-cols-10 gap-2 pb-2 border-b">
        {[
          { label: 'All', value: 'All', count: statusCounts.all },
          { label: 'Placed', value: 'Order Placed', count: statusCounts.placed },
          { label: 'Confirmed', value: 'Confirmed', count: statusCounts.confirmed },
          { label: 'Paid', value: 'Paid', count: statusCounts.paid },
          { label: 'Ready', value: 'Ready for Delivery', count: statusCounts.ready },
          { label: 'Released', value: 'Released for Delivery', count: statusCounts.released },
          { label: 'Delivered', value: 'Delivered', count: statusCounts.delivered },
          { label: 'Cancelled', value: 'Cancelled', count: statusCounts.cancelled },
          { label: 'Credit', value: 'Credit', count: statusCounts.credit },
          { label: 'Due', value: 'Due', count: statusCounts.due }
        ].map((status) => {
          const isActive = statusFilter === status.value;
          return (
            <button
              key={status.value}
              onClick={() => {
                setStatusFilter(status.value);
                setCurrentPage(1);
              }}
              className={`w-full py-2 text-xs font-semibold rounded-md transition-all duration-200 text-center truncate flex items-center justify-center gap-1.5 ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-muted text-muted-foreground border border-input'
                }`}
              title={`${status.label} (${status.count ?? 0})`}
            >
              <span>{t(`orders.status_${status.label.toLowerCase()}`)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive
                ? 'bg-white/20 text-white'
                : 'bg-muted text-muted-foreground border'
                }`}>
                {status.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background overflow-hidden relative">
        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-20 w-full bg-primary text-primary-foreground px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span>{selectedIds.length} {t("orders.selected")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/10"
                onClick={() => setSelectedIds([])}
              >
                {t("orders.deselect")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90 text-xs py-1 h-8"
                onClick={() => handlePrint(selectedIds)}
              >
                <Printer className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("orders.print_invoices")}</span><span className="sm:hidden">{t("orders.print")}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90 text-xs py-1 h-8"
                onClick={() => handlePrintStickers(selectedIds)}
              >
                <Printer className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("orders.print_stickers")}</span><span className="sm:hidden">{t("orders.stickers")}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-orange-500 text-white hover:bg-orange-600 border-none text-xs py-1 h-8"
                onClick={() => handleSendToSteadfast(selectedIds)}
              >
                <Truck className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("orders.send_to_steadfast")}</span><span className="sm:hidden">{t("orders.steadfast")}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white text-primary hover:bg-white/90 text-xs py-1 h-8">
                    {t("orders.status_dropdown")} <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("orders.change_status_to")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Confirmed')}>{t("orders.status_confirmed")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Paid')}>{t("orders.status_paid")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Ready for Delivery')}>{t("orders.status_ready")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Released for Delivery')}>{t("orders.status_released")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Delivered')}>{t("orders.status_delivered")}</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 h-8 px-2"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
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
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o._id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t("orders.order_info")}</TableHead>
                <TableHead>{t("orders.items")}</TableHead>
                <TableHead>{t("orders.total")}</TableHead>
                <TableHead>{t("orders.payment")}</TableHead>
                <TableHead>{t("orders.status_col")}</TableHead>
                <TableHead className="text-right">{t("orders.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t("orders.no_orders_found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order._id} className={selectedIds.includes(order._id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(order._id)}
                        onCheckedChange={() => toggleSelect(order._id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openDetails(order._id)}
                          >
                            <span className={`font-bold hover:underline ${order.isDuplicate ? 'text-red-500 font-extrabold' : order.isRepeat ? 'text-yellow-600 font-extrabold' : 'text-primary'}`}>
                              #{order._id.slice(-8).toUpperCase()}
                            </span>
                          </button>
                          {order.isDuplicate ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 border-none text-[9px] px-1 py-0 h-4">{t("orders.duplicate")}</Badge>
                          ) : order.isRepeat ? (
                            <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 border-none text-[9px] px-1 py-0 h-4">{t("orders.repeat")}</Badge>
                          ) : null}
                        </div>

                        <div className="flex flex-col text-[11px] text-slate-700 dark:text-zinc-300 mt-1 space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white break-words block">{order.shippingAddress?.fullName || order.user?.name || t("orders.guest_user")}</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => order.shippingAddress?.phone && setSearchTerm(order.shippingAddress.phone)}
                              className="text-muted-foreground hover:text-primary cursor-pointer hover:underline font-medium"
                            >
                              {order.shippingAddress?.phone || t("orders.no_phone")}
                            </span>
                            {order.shippingAddress?.phone && (
                              <>
                                <a
                                  href={getWhatsAppLink(order.shippingAddress.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 transition-colors p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                                  title="Chat on WhatsApp"
                                >
                                  <WhatsAppIcon className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(order.shippingAddress.phone);
                                      toast.success('Phone number copied!');
                                    } catch (err) {
                                      toast.error('Failed to copy phone number.');
                                    }
                                  }}
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded animate-in fade-in duration-200"
                                  title="Copy Phone Number"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                          {order.shippingAddress?.phone && (
                            <div className="mt-0.5">
                              <FraudCheckBadge phone={order.shippingAddress.phone} />
                            </div>
                          )}
                          <span className="text-muted-foreground truncate max-w-[150px]">{order.user?.email || t("orders.no_email")}</span>
                          <span className="text-[10px] text-muted-foreground uppercase mt-0.5">
                            {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, p') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {order.items?.map((item: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0 font-normal truncate max-w-[180px]">
                              {item.quantity}× {item.name}
                              {(item.color || item.size) && (
                                <span className="text-muted-foreground ml-1">
                                  ({[item.color, item.size].filter(Boolean).join('/')})
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {order.internalNote && (
                          <div className="mt-1 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-yellow-200/50 font-medium whitespace-pre-line max-w-[200px]" title={order.internalNote}>
                            {t("orders.note")} {order.internalNote}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">৳{Math.round(order.totalAmount ?? 0)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-none font-bold' : 'bg-yellow-100 text-yellow-700 border-none font-bold'}
                        >
                          {order.paymentStatus}
                        </Badge>
                        {(order.isCreditOrder || order.paymentMethod === 'Credit') && (
                          <div className={`flex flex-col gap-0.5 mt-1 p-1.5 rounded border ${order.paymentStatus === 'Paid' ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20' : 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20'}`}>
                            <span className={`font-extrabold text-[10px] uppercase tracking-wider ${order.paymentStatus === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {order.paymentStatus === 'Paid' ? t("orders.credit_paid") : t("orders.credit_due")}
                            </span>
                            {order.expectedPaymentDate && (
                              <span className={`text-[9px] font-semibold ${order.paymentStatus === 'Paid' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                {t("orders.due_date")} {format(new Date(order.expectedPaymentDate), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        )}
                        {order.paymentMethod === 'Manual' && order.manualPaymentDetails && (
                          <div className="flex flex-col text-[10px] text-muted-foreground bg-slate-50 dark:bg-zinc-900 p-1.5 rounded border border-slate-100 dark:border-zinc-800 font-mono">
                            <span className="font-bold text-primary uppercase text-[9px]">{order.manualPaymentDetails.methodName}</span>
                            {order.manualPaymentDetails.senderNumber && (
                              <span>{t("orders.no")} {order.manualPaymentDetails.senderNumber}</span>
                            )}
                            {order.manualPaymentDetails.transactionId && (
                              <span className="truncate max-w-[120px] font-bold text-slate-800 dark:text-zinc-200" title={order.manualPaymentDetails.transactionId}>
                                {t("orders.trx_id")} {order.manualPaymentDetails.transactionId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.paymentMethod === 'Manual' && order.paymentStatus === 'Pending' && order.status !== 'Cancelled' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Approve Manual Payment"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Approve Payment?',
                                  text: `Are you sure you want to approve manual payment for order #${order._id.slice(-8).toUpperCase()}? This will mark the order as Confirmed & Paid.`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  confirmButtonColor: '#00D1B2',
                                  confirmButtonText: 'Yes, Approve!'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    updateStatus(order._id, 'Confirmed', { paymentStatus: 'Paid' });
                                  }
                                });
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Cancel Order"
                              onClick={() => handleCancelOrder(order._id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openDetails(order._id)}>
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
                              <DropdownMenuLabel>{t("orders.actions")}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleCopyLink(order._id)}>
                                <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> {t("orders.copy_link")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                                <FileText className="mr-2 h-4 w-4 text-primary" /> {t("orders.download_invoice")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint([order._id])}>
                                <Printer className="mr-2 h-4 w-4 text-primary" /> {t("orders.print_invoice")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintStickers([order._id])}>
                                <Printer className="mr-2 h-4 w-4 text-primary" /> {t("orders.print_sticker_invoice")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendToSteadfast([order._id])} disabled={!!order.shippingDetails?.consignmentId}>
                                <Truck className="mr-2 h-4 w-4 text-orange-500" /> {t("orders.send_to_steadfast")}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>{t("orders.change_status")}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Confirmed')}>{t("orders.confirm")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Paid', { paymentStatus: 'Paid' })}>{t("orders.mark_paid")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Ready for Delivery')}>{t("orders.ready_for_delivery")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Released for Delivery')}>{t("orders.release_for_delivery")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Delivered')}>{t("orders.mark_delivered")}</DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order._id)}>{t("orders.cancel_order")}</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive font-bold" onClick={() => deleteOrder(order._id)}>{t("orders.delete_order")}</DropdownMenuItem>
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

        {/* Mobile View */}
        <div className="block md:hidden divide-y">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              {t("orders.no_orders_found")}
            </div>
          ) : (
            filteredOrders.map((order) => (
               <div
                 key={order._id}
                 className={`p-4 sm:p-5 transition-colors ${selectedIds.includes(order._id) ? 'bg-muted/50' : 'bg-background'
                   }`}
               >
                 {/* Header: Checkbox, Order ID, Status, and Actions dropdown */}
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <Checkbox
                       checked={selectedIds.includes(order._id)}
                       onCheckedChange={() => toggleSelect(order._id)}
                       id={`check-${order._id}`}
                       className="h-5 w-5"
                     />
                     <button
                       type="button"
                       className="cursor-pointer hover:opacity-80 transition-opacity text-left"
                       onClick={() => openDetails(order._id)}
                     >
                       <span className={`text-sm md:text-xs font-bold hover:underline ${order.isDuplicate ? 'text-red-500 font-extrabold' : order.isRepeat ? 'text-yellow-600 font-extrabold' : 'text-primary'}`}>
                         #{order._id.slice(-8).toUpperCase()}
                       </span>
                     </button>
                     {order.isDuplicate ? (
                       <Badge className="bg-red-500 text-white hover:bg-red-600 border-none text-[10px] px-1.5 py-0.5 h-4.5">{t("orders.duplicate")}</Badge>
                     ) : order.isRepeat ? (
                       <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 border-none text-[10px] px-1.5 py-0.5 h-4.5">{t("orders.repeat")}</Badge>
                     ) : null}
                   </div>
                   <div className="flex items-center gap-1.5">
                     {getStatusBadge(order.status)}
                   </div>
                 </div>

                 {/* Details */}
                 <div className="space-y-2.5 text-sm md:text-xs">
                   {/* Name and Price */}
                   <div className="flex flex-col gap-1">
                     <div className="font-semibold text-slate-900 dark:text-white text-base md:text-sm flex items-center justify-between">
                       <span>{order.shippingAddress?.fullName || order.user?.name || t("orders.guest_user")}</span>
                       <span className="font-bold text-slate-900 dark:text-white text-lg md:text-base">৳{Math.round(order.totalAmount ?? 0)}</span>
                     </div>

                     {/* Contact details */}
                     <div className="flex items-center flex-wrap gap-2 mt-0.5">
                       <span
                         onClick={() => order.shippingAddress?.phone && setSearchTerm(order.shippingAddress.phone)}
                         className="text-muted-foreground hover:text-primary cursor-pointer hover:underline font-medium text-sm md:text-[11px]"
                       >
                         {order.shippingAddress?.phone || t("orders.no_phone")}
                       </span>
                       {order.shippingAddress?.phone && (
                         <div className="flex items-center gap-1.5">
                           <a
                             href={getWhatsAppLink(order.shippingAddress.phone)}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-green-600 p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                             title="Chat on WhatsApp"
                           >
                             <WhatsAppIcon className="h-4.5 w-4.5" />
                           </a>
                           <button
                             type="button"
                             onClick={async () => {
                               try {
                                 await navigator.clipboard.writeText(order.shippingAddress.phone);
                                 toast.success('Phone number copied!');
                               } catch (err) {
                                 toast.error('Failed to copy phone number.');
                               }
                             }}
                             className="text-muted-foreground p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                             title="Copy Phone"
                           >
                             <Copy className="h-4 w-4" />
                           </button>
                         </div>
                       )}
                       {order.shippingAddress?.phone && (
                         <FraudCheckBadge phone={order.shippingAddress.phone} />
                       )}
                     </div>
                     {order.user?.email && (
                       <span className="text-muted-foreground text-xs md:text-[10px] truncate max-w-[200px]">{order.user.email}</span>
                     )}
                     <span className="text-xs md:text-[9px] text-muted-foreground uppercase mt-0.5">
                       {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy p') : 'N/A'}
                     </span>
                   </div>

                   {/* Payment Details */}
                   <div className="flex flex-wrap items-center gap-2 py-0.5">
                     <Badge
                       variant="outline"
                       className={`text-xs md:text-[9px] ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-none font-bold' : 'bg-yellow-100 text-yellow-700 border-none font-bold'}`}
                     >
                       {order.paymentStatus}
                     </Badge>
                     {(order.isCreditOrder || order.paymentMethod === 'Credit') && (
                       <div className={`flex flex-row items-center gap-1 px-2 py-0.5 rounded border ${order.paymentStatus === 'Paid' ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20' : 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20'}`}>
                         <span className={`font-extrabold text-xs md:text-[9px] uppercase tracking-wider ${order.paymentStatus === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                           {order.paymentStatus === 'Paid' ? t("orders.credit_paid") : t("orders.credit_due")}
                         </span>
                         {order.expectedPaymentDate && (
                           <span className={`text-xs md:text-[9px] font-semibold border-l pl-1.5 ml-0.5 ${order.paymentStatus === 'Paid' ? 'text-green-700 dark:text-green-300 border-green-500/30' : 'text-red-700 dark:text-red-300 border-red-500/30'}`}>
                             {t("orders.due_date")} {format(new Date(order.expectedPaymentDate), 'MMM dd, yyyy')}
                           </span>
                         )}
                       </div>
                     )}
                     {order.paymentMethod === 'Manual' && order.manualPaymentDetails && (
                       <span className="text-xs md:text-[9px] text-muted-foreground font-mono bg-slate-50 dark:bg-zinc-900 px-2 py-0.5 rounded border">
                         {order.manualPaymentDetails.methodName}
                         {order.manualPaymentDetails.senderNumber ? ` (${order.manualPaymentDetails.senderNumber})` : ''}
                       </span>
                     )}
                   </div>

                   {/* Items list */}
                   <div className="flex flex-wrap gap-1.5 pt-0.5">
                     {order.items?.map((item: any, idx: number) => (
                       <Badge key={idx} variant="outline" className="text-xs md:text-[8px] px-2 py-0.5 font-normal truncate max-w-[240px]">
                         {item.quantity}× {item.name}
                         {(item.color || item.size) && (
                           <span className="text-muted-foreground ml-0.5">
                             ({[item.color, item.size].filter(Boolean).join('/')})
                           </span>
                         )}
                       </Badge>
                     ))}
                   </div>

                   {order.internalNote && (
                     <div className="text-xs md:text-[9px] bg-yellow-50 dark:bg-yellow-950/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded border border-yellow-200/50 font-medium whitespace-pre-line">
                       {t("orders.note")} {order.internalNote}
                     </div>
                   )}

                   {/* Footer actions */}
                   <div className="flex items-center justify-between pt-2.5 border-t mt-2">
                     <div className="flex items-center gap-1.5">
                       {order.paymentMethod === 'Manual' && order.paymentStatus === 'Pending' && order.status !== 'Cancelled' && (
                         <>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs px-3 py-1"
                             onClick={() => {
                               Swal.fire({
                                 title: 'Approve Payment?',
                                 text: `Are you sure you want to approve manual payment for order #${order._id.slice(-8).toUpperCase()}? This will mark the order as Confirmed & Paid.`,
                                 icon: 'question',
                                 showCancelButton: true,
                                 confirmButtonColor: '#00D1B2',
                                 confirmButtonText: 'Yes, Approve!'
                               }).then((result) => {
                                 if (result.isConfirmed) {
                                   updateStatus(order._id, 'Confirmed', { paymentStatus: 'Paid' });
                                 }
                               });
                             }}
                           >
                             {t("orders.approve")}
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-8 text-destructive hover:text-red-700 hover:bg-red-50 text-xs px-3 py-1"
                             onClick={() => handleCancelOrder(order._id)}
                           >
                             {t("orders.cancel")}
                           </Button>
                         </>
                       )}
                     </div>

                     <div className="flex items-center gap-1.5 ml-auto">
                       <Button variant="outline" size="sm" className="h-8 text-primary text-xs px-3 py-1 flex items-center gap-1" onClick={() => openDetails(order._id)}>
                         <Eye className="h-3.5 w-3.5" /> {t("orders.view")}
                       </Button>

                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuGroup>
                             <DropdownMenuLabel>{t("orders.actions")}</DropdownMenuLabel>
                             <DropdownMenuItem onClick={() => handleCopyLink(order._id)}>
                               <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> {t("orders.copy_link")}
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                               <FileText className="mr-2 h-4 w-4 text-primary" /> {t("orders.download_invoice")}
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handlePrint([order._id])}>
                               <Printer className="mr-2 h-4 w-4 text-primary" /> {t("orders.print_invoice")}
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handlePrintStickers([order._id])}>
                               <Printer className="mr-2 h-4 w-4 text-primary" /> {t("orders.print_sticker_invoice")}
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleSendToSteadfast([order._id])} disabled={!!order.shippingDetails?.consignmentId}>
                               <Truck className="mr-2 h-4 w-4 text-orange-500" /> {t("orders.send_to_steadfast")}
                             </DropdownMenuItem>
                           </DropdownMenuGroup>
                           <DropdownMenuSeparator />
                           <DropdownMenuGroup>
                             <DropdownMenuLabel>{t("orders.change_status")}</DropdownMenuLabel>
                             <DropdownMenuItem onClick={() => updateStatus(order._id, 'Confirmed')}>{t("orders.confirm")}</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => updateStatus(order._id, 'Paid', { paymentStatus: 'Paid' })}>{t("orders.mark_paid")}</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => updateStatus(order._id, 'Ready for Delivery')}>{t("orders.ready_for_delivery")}</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => updateStatus(order._id, 'Released for Delivery')}>{t("orders.release_for_delivery")}</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => updateStatus(order._id, 'Delivered')}>{t("orders.mark_delivered")}</DropdownMenuItem>
                           </DropdownMenuGroup>
                           <DropdownMenuSeparator />
                           <DropdownMenuGroup>
                             <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order._id)}>{t("orders.cancel_order")}</DropdownMenuItem>
                             <DropdownMenuItem className="text-destructive font-bold" onClick={() => deleteOrder(order._id)}>{t("orders.delete_order")}</DropdownMenuItem>
                           </DropdownMenuGroup>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </div>
                   </div>
                 </div>
               </div>
             ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="py-6 border-t bg-white px-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchOrders(page);
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', page.toString());
                router.push(`?${params.toString()}`);
              }}
            />
          </div>
        )}
      </div>

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={fetchOrders}
      />

      <ManualOrderDialog
        open={isManualOrderOpen}
        onOpenChange={setIsManualOrderOpen}
        onCreated={fetchOrders}
      />

      {bulkActionLoading && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">{t("orders.processing_bulk")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={7} columnCount={6} titleWidth="w-56" showStats={true} />}>
      <OrdersContent />
    </Suspense>
  );
}

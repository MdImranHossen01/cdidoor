'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Plus,
  Trash2,
  Printer,
  Receipt,
  Download,
  DollarSign,
  Users,
  Search,
  CreditCard,
  FileText,
  Package,
  ChevronDown,
  X,
  Eye,
  MapPin,
  Phone,
  User,
  CalendarDays,
  Hash,
  MoreHorizontal,
  Edit,
  SlidersHorizontal,
  Share2,
  Copy
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import { printBillPOS } from '@/lib/bill-pos-generator';
import { getWhatsAppLink } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { useLanguage } from '@/contexts/LanguageContext';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    {...props}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z"/>
  </svg>
);

interface BillItemInput {
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  batchNumber?: string;
}

function ClientBillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    };
  });

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);

  const [settings, setSettings] = useState<any>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterByDate, setFilterByDate] = useState(true);
  const isFiltered = !!((filterByDate && (dateFilter.from || dateFilter.to)) || searchTerm || statusFilter !== 'all');

  // Sync state changes to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }
    router.push(`/admin/bills?${params.toString()}`);
  }, [currentPage, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/bills?${params.toString()}`);
  }, [searchTerm, statusFilter, dateFilter.from, dateFilter.to]);

  // Bill detail view state
  const [selectedBill, setSelectedBill] = useState<any>(null);

  const handleCopyLink = async (invoiceNo: string) => {
    try {
      const shareableLink = `${window.location.origin}/bills/${invoiceNo}`;
      await navigator.clipboard.writeText(shareableLink);
      toast.success('Shareable link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link.');
    }
  };

  useEffect(() => {
    fetchBills();
    fetchSettings();
  }, [statusFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/bills?filter=${statusFilter}&type=bill`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (error) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };



  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };



  const handleUpdateStatus = async (billId: string, currentDue: number) => {
    const { value: paidAmount } = await Swal.fire({
      title: 'Update Payment Cash-in',
      input: 'number',
      inputLabel: 'Amount Paid (৳)',
      inputValue: currentDue,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) < 0) {
          return 'Please enter a valid positive amount';
        }
      }
    });

    if (paidAmount !== undefined) {
      try {
        const amount = Number(paidAmount);
        const bill = bills.find(b => b._id === billId);
        if (!bill) return;

        const newCashIn = (bill.cashIn || 0) + amount;
        const newDue = Math.max(0, bill.gTotal - newCashIn);
        const newStatus = newDue <= 0 ? 'Paid' : 'Due';

        const res = await fetch(`/api/admin/bills/${billId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashIn: newCashIn,
            currentBillDue: newDue,
            status: newStatus
          })
        });

        if (!res.ok) throw new Error('Failed to update bill');
        toast.success('Payment updated successfully');
        fetchBills();
      } catch (error) {
        toast.error('Failed to update payment');
      }
    }
  };

  const handleDeleteBill = async (billId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/bills/${billId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete bill');
        toast.success('Bill deleted successfully');
        fetchBills();
      } catch (error) {
        toast.error('Failed to delete bill');
      }
    }
  };

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clientPhone.includes(searchTerm) ||
      b.invoiceNo.includes(searchTerm);

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(b.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        matchesDate = matchesDate && new Date(b.date) <= new Date(dateFilter.to + 'T23:59:59');
      }
    }

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = b.status?.toLowerCase() === statusFilter.toLowerCase();
    }

    return matchesSearch && matchesDate && matchesStatus;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Metrics
  const totalBilled = bills.reduce((sum, b) => sum + (b.gTotal || 0), 0);
  const totalCollected = bills.reduce((sum, b) => sum + (b.cashIn || 0), 0);
  const accountsReceivable = bills.reduce((sum, b) => sum + (b.currentBillDue || 0), 0);

  return (
    <div className="flex-1 space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold tracking-tight">{t("bills.title")}</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">{t("bills.subtitle")}</p>
        </div>
        <Button asChild className="w-full sm:w-auto rounded-none h-10 font-bold bg-primary text-primary-foreground">
          <Link href="/admin/bills/create" target="_blank">
            <Plus className="mr-2 h-4 w-4 shrink-0" /> {t("bills.create_bill")}
          </Link>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("bills.total_billed")}</CardTitle>
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold">৳{totalBilled.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("bills.client_invoicing")}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("bills.collected")}</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-green-700">৳{totalCollected.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("bills.payments_received")}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("bills.receivable")}</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-orange-700">৳{accountsReceivable.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("bills.outstanding_due")}</p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h3 className="font-semibold text-lg tracking-tight text-foreground md:hidden">{t("bills.all_invoices")}</h3>
          {/* Mobile Filter Toggle Button */}
          <div className="block md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t("bills.filters")}
              {isFiltered && (
                <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
          </div>
        </div>

        {/* Desktop & Collapsible Mobile Filters Wrapper */}
        <div className={`grid transition-all duration-300 ease-in-out md:block w-full ${
          showMobileFilters 
            ? 'grid-rows-[1fr] opacity-100 mt-3 visible' 
            : 'grid-rows-[0fr] opacity-0 invisible md:visible md:opacity-100 md:grid-rows-none'
        }`}>
          <div className="overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full">
            
            {/* Left Side: Search & Date Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="relative w-full md:w-52">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("bills.search_placeholder") as string}
                  className="pl-8 h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  {t("bills.filter_by_date")}
                </label>

                <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    disabled={!filterByDate}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0 font-medium">{t("bills.to")}</span>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    disabled={!filterByDate}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Status Tabs & Clear */}
            <div className="flex items-center justify-end md:justify-start gap-2 w-full md:w-auto">
              {/* Tabs (All, Paid, Due) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${
                    statusFilter === 'all' 
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {t("bills.all")}
                </Button>
                <Button
                  variant={statusFilter === 'Paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Paid')}
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${
                    statusFilter === 'Paid' 
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {t("bills.paid")}
                </Button>
                <Button
                  variant={statusFilter === 'Due' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Due')}
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${
                    statusFilter === 'Due' 
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {t("bills.due")}
                </Button>
              </div>

              {isFiltered && (
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
                    setSearchTerm('');
                    setStatusFilter('all');
                    setFilterByDate(true);
                  }}
                  className="text-xs h-7 text-muted-foreground hover:text-primary shrink-0 font-bold px-2"
                >
                  {t("bills.clear")}
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Bill List Table */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <div className="rounded-md md:border md:bg-background overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 stroke-1" />
            <p>{t("bills.no_bills_found")}</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("bills.bill_no")}</TableHead>
                    <TableHead>{t("bills.date")}</TableHead>
                    <TableHead>{t("bills.client_details")}</TableHead>
                    <TableHead className="text-right">{t("bills.grand_total")}</TableHead>
                    <TableHead className="text-right">{t("bills.paid_cash_in")}</TableHead>
                    <TableHead className="text-right">{t("bills.due")}</TableHead>
                    <TableHead className="text-center">{t("bills.status")}</TableHead>
                    <TableHead className="text-center">{t("bills.expected_date")}</TableHead>
                    <TableHead className="text-right">{t("bills.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBills.map((bill) => (
                    <TableRow key={bill._id}>
                      <TableCell>
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="font-bold text-primary hover:underline underline-offset-2 flex items-center gap-1 group transition-colors"
                          title="View Bill Details"
                        >
                          <Hash className="h-3 w-3" />
                          {bill.invoiceNo}
                          <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell>{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{bill.clientName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          {bill.clientPhone ? (
                            <a
                              href={getWhatsAppLink(bill.clientPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-green-600 font-medium transition-colors"
                              title="Chat on WhatsApp"
                            >
                              {bill.clientPhone}
                            </a>
                          ) : (
                            <span>{bill.clientPhone}</span>
                          )}
                          {bill.clientPhone && (
                            <div className="flex items-center gap-1">
                              <a
                                href={getWhatsAppLink(bill.clientPhone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 transition-colors p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded"
                                title="Chat on WhatsApp"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(bill.clientPhone);
                                    toast.success('Phone number copied!');
                                  } catch (err) {
                                    toast.error('Failed to copy phone number.');
                                  }
                                }}
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded"
                                title="Copy Phone Number"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">৳{bill.gTotal}</TableCell>
                      <TableCell className="text-right text-green-600">৳{bill.cashIn}</TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">৳{bill.currentBillDue}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={bill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => generateBillPDF(bill, settings, 'print')}
                            title="Print Bill (A4)"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => printBillPOS(bill, settings)}
                            title="Print POS Receipt"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                          {bill.status === 'Due' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}
                              title="Collect Cash"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedBill(bill)}>
                                <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/bills/edit/${bill._id}`} target="_blank" className="flex items-center cursor-pointer w-full">
                                  <Edit className="mr-2 h-4 w-4" /> {t("bills.edit_bill")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("bills.download_pdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("bills.print_bill")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => printBillPOS(bill, settings)}>
                                <Receipt className="mr-2 h-4 w-4 text-indigo-600" /> {t("bills.print_pos")}
                              </DropdownMenuItem>
                              {bill.status === 'Due' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}>
                                  <CreditCard className="mr-2 h-4 w-4 text-green-600" /> {t("bills.collect_cash")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleCopyLink(bill.invoiceNo)}>
                                <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> {t("bills.copy_link")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBill(bill._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {t("bills.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden space-y-3">
              {paginatedBills.map((bill) => (
                <div key={bill._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="font-bold text-base text-primary hover:underline"
                    >
                      #{bill.invoiceNo}
                    </button>
                    <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={bill.status === 'Paid' ? 'bg-green-600 text-white border-none text-xs px-2 py-0.5' : 'text-xs px-2 py-0.5'}>
                      {bill.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm md:text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground">{t("bills.client")}:</span>
                      <span className="font-semibold text-foreground">{bill.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-t border-border/30">
                      <span className="text-muted-foreground">{t("bills.phone")}:</span>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        {bill.clientPhone ? (
                          <a
                            href={getWhatsAppLink(bill.clientPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm md:text-[11px] hover:underline hover:text-green-600 font-semibold transition-colors"
                            title="Chat on WhatsApp"
                          >
                            {bill.clientPhone}
                          </a>
                        ) : (
                          <span className="text-sm md:text-[11px]">{bill.clientPhone}</span>
                        )}
                        {bill.clientPhone && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={getWhatsAppLink(bill.clientPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded"
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon className="h-4.5 w-4.5" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(bill.clientPhone);
                                  toast.success('Phone number copied!');
                                } catch (err) {
                                  toast.error('Failed to copy phone number.');
                                }
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded"
                              title="Copy Phone Number"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                      <span className="text-muted-foreground">{t("bills.date")}:</span>
                      <span className="text-foreground font-medium">{format(new Date(bill.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t mt-1">
                      <span className="text-muted-foreground">{t("bills.total")}:</span>
                      <span className="font-bold text-foreground text-base md:text-sm">৳{bill.gTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600 py-0.5">
                      <span>Paid:</span>
                      <span className="font-semibold text-sm">৳{bill.cashIn}</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600 font-semibold py-0.5 border-t border-border/30">
                      <span>Due:</span>
                      <span className="font-extrabold text-base md:text-sm">৳{bill.currentBillDue}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-teal-600 hover:text-teal-700 text-xs px-2.5 py-1 flex items-center gap-1"
                      onClick={() => generateBillPDF(bill, settings, 'print')}
                    >
                      <Printer className="h-3.5 w-3.5 mr-0.5" /> A4
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-indigo-600 hover:text-indigo-700 text-xs px-2.5 py-1 flex items-center gap-1"
                      onClick={() => printBillPOS(bill, settings)}
                    >
                      <Receipt className="h-3.5 w-3.5 mr-0.5" /> POS
                    </Button>
                    {bill.status === 'Due' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs px-3 py-1 flex items-center gap-1"
                        onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Collect
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedBill(bill)}>
                          <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/bills/edit/${bill._id}`} target="_blank" className="flex items-center cursor-pointer w-full">
                            <Edit className="mr-2 h-4 w-4" /> {t("bills.edit_bill")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                          <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("bills.download_pdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                          <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("bills.print_bill")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printBillPOS(bill, settings)}>
                          <Receipt className="mr-2 h-4 w-4 text-indigo-600" /> {t("bills.print_pos")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(bill.invoiceNo)}>
                          <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> {t("bills.copy_link")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteBill(bill._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("bills.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {totalPages > 1 && (
          <div className="py-4 border-t bg-background px-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>
    </div>

      {/* Bill Detail View Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={(open) => { if (!open) setSelectedBill(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-primary" />
                  {t("bills.bill_invoice")}
                  <span className="text-primary font-black">#{selectedBill.invoiceNo}</span>
                  <Badge
                    variant={selectedBill.status === 'Paid' ? 'default' : 'destructive'}
                    className={`ml-auto text-xs ${selectedBill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}`}
                  >
                    {selectedBill.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Client + Bill Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2.5 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("bills.client_details")}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold">{selectedBill.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex items-center gap-1.5">
                        {selectedBill.clientPhone ? (
                          <a
                            href={getWhatsAppLink(selectedBill.clientPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-green-600 font-semibold transition-colors"
                            title="Chat on WhatsApp"
                          >
                            {selectedBill.clientPhone}
                          </a>
                        ) : (
                          <span>{selectedBill.clientPhone}</span>
                        )}
                        {selectedBill.clientPhone && (
                          <div className="flex items-center gap-1">
                            <a
                              href={getWhatsAppLink(selectedBill.clientPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 transition-colors p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(selectedBill.clientPhone);
                                  toast.success('Phone number copied!');
                                } catch (err) {
                                  toast.error('Failed to copy phone number.');
                                }
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"
                              title="Copy Phone Number"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{selectedBill.clientAddress}</span>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2.5 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("bills.bill_info")}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-mono font-bold">{selectedBill.invoiceNo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                      <span>{format(new Date(selectedBill.date), 'dd MMM yyyy, hh:mm a')}</span>
                    </div>
                    {selectedBill.expectedReceivableDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="text-orange-600">{t("bills.due_by")}: {format(new Date(selectedBill.expectedReceivableDate), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product / Order Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary-foreground" />
                    <span className="text-sm font-bold text-primary-foreground">{t("bills.order_items")}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t("bills.product_description")}</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">{t("bills.qty")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">{t("bills.rate")} (৳)</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">{t("bills.amount")} (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedBill.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{item.name}</td>
                          <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">{Math.round(item.price).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{Math.round(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="bg-muted/30 border rounded-lg p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("bills.financial_summary")}</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("bills.subtotal_label")}</span>
                    <span>৳{Math.round(selectedBill.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.delivery_charge_label")}</span>
                      <span>+ ৳{Math.round(selectedBill.deliveryCharge).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.service_fee_label")}</span>
                      <span>+ ৳{Math.round(selectedBill.serviceFee).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        {t("bills.discount")}
                        {selectedBill.discountType === 'percentage'
                          ? ` (${selectedBill.discountValue}%)`
                          : ''}
                      </span>
                      <span>- ৳{Math.round(selectedBill.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">{t("bills.total_bill_label")}</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.total || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.prevDue > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("bills.previous_due_label")}</span>
                      <span>+ ৳{Math.round(selectedBill.prevDue).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold text-base">{t("bills.grand_total_label")}</span>
                    <span className="font-bold text-base text-primary">৳{Math.round(selectedBill.gTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>{t("bills.cash_received")}</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.cashIn || 0).toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-2 font-bold text-base ${selectedBill.currentBillDue > 0 ? 'text-destructive' : 'text-green-600'
                    }`}>
                    <span>{t("bills.remaining_due")}</span>
                    <span>৳{Math.round(selectedBill.currentBillDue || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 font-bold"
                    onClick={() => generateBillPDF(selectedBill, settings, 'download')}
                  >
                    <Download className="h-4 w-4 mr-2" /> {t("bills.download_pdf")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-bold"
                    onClick={() => generateBillPDF(selectedBill, settings, 'print')}
                  >
                    <Printer className="h-4 w-4 mr-2" /> {t("bills.print")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    onClick={() => printBillPOS(selectedBill, settings)}
                  >
                    <Receipt className="h-4 w-4 mr-2" /> {t("bills.print_pos")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientBillsPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={7} columnCount={6} titleWidth="w-48" showStats={true} />}>
      <ClientBillsContent />
    </Suspense>
  );
}

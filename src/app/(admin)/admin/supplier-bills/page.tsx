'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Search, FileText, CalendarDays, Eye, DollarSign, MoreHorizontal, Edit, Download, Printer, Users, Loader2, SlidersHorizontal, Package, Tag } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { Checkbox } from '@/components/ui/checkbox';

interface BillItemInput {
  name: string;
  quantity: number;
  price: number;
  batchNumber?: string;
  variantName?: string;
  productId?: string;
  variantId?: string;
  isProductItem?: boolean;
}

function SupplierBillsContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bills, setBills] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    };
  });

  const initialStatus = (searchParams.get('status') || 'all').toLowerCase();
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [filterByDate, setFilterByDate] = useState(true);

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const isFiltered = !!(
    (filterByDate && (dateFilter.from || dateFilter.to)) ||
    searchTerm ||
    statusFilter !== 'all'
  );

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
    router.push(`/admin/supplier-bills?${params.toString()}`);
  }, [currentPage, statusFilter]);

  const isMounted = useRef(false);
  // Reset page when filters change
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/supplier-bills?${params.toString()}`);
  }, [searchTerm, statusFilter, filterByDate, dateFilter.from, dateFilter.to]);

  // Create Bill State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', quantity: 1, price: 0 }
  ]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'MFS' | 'Credit'>('Cash');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);

  // Product picker state (Dialog-based, like BillForm)
  const [products, setProducts] = useState<any[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});

  // Detail View State
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  const [settings, setSettings] = useState<any>(null);

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

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=500');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/supplier-bills');
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchLedgerAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setLedgerAccounts(data || []);
      }
    } catch (error) {
      console.error('Error fetching ledger accounts:', error);
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingBill(null);
      setSelectedSupplierId('');
      setBillItems([{ name: '', quantity: 1, price: 0 }]);
      setDiscountValue(0);
      setPaidAmount(0);
      setPaymentMethod('Cash');
      setBillDate(format(new Date(), 'yyyy-MM-dd'));
      setIsCreateOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      router.replace(`/admin/supplier-bills${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBills(),
        fetchSuppliers(),
        fetchSettings(),
        fetchLedgerAccounts(),
        fetchProducts()
      ]);
    };
    loadData();
  }, []);


  const handleAddCustomItem = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0, isProductItem: false }]);
  };

  const toggleProductVariant = (productId: string, variantId: string | null) => {
    setSelectedProductVariants(prev => {
      const current = prev[productId];
      if (current === variantId) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: variantId };
    });
  };

  const handleAddSelectedProducts = () => {
    const newItems: BillItemInput[] = [];
    Object.entries(selectedProductVariants).forEach(([productId, variantId]) => {
      const prod = products.find(p => p._id === productId);
      if (!prod) return;
      if (variantId === null) {
        // No variant — use product-level purchase price
        newItems.push({
          productId: prod._id,
          name: prod.name,
          price: prod.purchasePrice || prod.price || 0,
          quantity: 1,
          batchNumber: '',
          variantName: '',
          isProductItem: true,
        });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size, variant.name].filter(Boolean).join(' — ');
        newItems.push({
          productId: prod._id,
          variantId: variant._id,
          name: label,
          price: variant.purchasePrice || variant.price || prod.purchasePrice || prod.price || 0,
          quantity: 1,
          batchNumber: '',
          variantName: [variant.color, variant.size, variant.name].filter(Boolean).join(' / '),
          isProductItem: true,
        });
      }
    });
    if (newItems.length === 0) return;
    if (billItems.length === 1 && billItems[0].name === '' && billItems[0].price === 0) {
      setBillItems(newItems);
    } else {
      setBillItems(prev => [...prev, ...newItems]);
    }
    setSelectedProductVariants({});
    setProductPickerOpen(false);
    setProductSearchTerm('');
  };

  const handleRemoveItem = (index: number) => {
    if (billItems.length === 1) return;
    const newItems = [...billItems];
    newItems.splice(index, 1);
    setBillItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: any) => {
    const newItems = [...billItems];
    if (field === 'quantity') {
      newItems[index].quantity = Math.max(1, parseInt(value) || 0);
    } else if (field === 'price') {
      newItems[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      newItems[index].name = value;
    }
    setBillItems(newItems);
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const total = Math.max(0, subtotal - discountValue);
  const dueAmount = Math.max(0, total - paidAmount);

  const bankAccounts = useMemo(() => {
    return ledgerAccounts.filter(a => 
      a.code !== 'CASH' && (
        a.accountCategory === 'Bank' || 
        a.accountCategory === 'bank' || 
        a.bankAccountType || 
        a.branchName ||
        a.code?.toLowerCase().includes('bank')
      )
    );
  }, [ledgerAccounts]);

  const mfsAccounts = useMemo(() => {
    return ledgerAccounts.filter(a => 
      a.code !== 'CASH' && (
        a.accountCategory === 'MFS' || 
        a.accountCategory === 'mfs' || 
        a.mfsProvider || 
        a.mfsType ||
        a.code?.toLowerCase().includes('mfs')
      )
    );
  }, [ledgerAccounts]);

  const otherAccounts = useMemo(() => {
    return ledgerAccounts.filter(a => 
      a.code !== 'CASH' && 
      !bankAccounts.some(b => b._id === a._id) && 
      !mfsAccounts.some(m => m._id === a._id)
    );
  }, [ledgerAccounts, bankAccounts, mfsAccounts]);

  const openCreateDialog = () => {
    setSelectedSupplierId(suppliers[0]?._id || '');
    setBillDate(format(new Date(), 'yyyy-MM-dd'));
    setBillItems([{ name: '', quantity: 1, price: 0 }]);
    setDiscountValue(0);
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setPaymentAccountId('');
    setExpectedPaymentDate('');
    setEditingBill(null);
    fetchLedgerAccounts();
    setIsCreateOpen(true);
  };

  const handleDeleteBill = async (id: string) => {
    const result = await Swal.fire({
      title: t("supplier_bills.delete_title"),
      text: t("supplier_bills.delete_text"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: t("supplier_bills.yes_delete")
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/supplier-bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t("supplier_bills.bill_deleted") as string);
        fetchBills();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete bill');
      }
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error(t("supplier_bills.error_supplier") as string);
      return;
    }

    const invalidItem = billItems.find(item => !item.name || item.price <= 0);
    if (invalidItem) {
      toast.error(t("supplier_bills.error_items") as string);
      return;
    }

    try {
      setFormLoading(true);
      const url = editingBill ? `/api/admin/supplier-bills/${editingBill._id}` : '/api/admin/supplier-bills';
      const method = editingBill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          date: billDate,
          items: billItems,
          subtotal,
          discount: discountValue,
          total,
          paidAmount,
          paymentMethod,
          paymentAccountId,
          expectedPaymentDate
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save bill');
      }

      toast.success(editingBill ? (t("supplier_bills.bill_updated") as string) : (t("supplier_bills.bill_generated") as string));
      setIsCreateOpen(false);
      setEditingBill(null);
      fetchBills();
    } catch (error: any) {
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.supplier && b.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(b.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        matchesDate = matchesDate && new Date(b.date) <= new Date(dateFilter.to + 'T23:59:59');
      }
    }

    if (!matchesDate) return false;

    if (statusFilter === 'paid') {
      return matchesSearch && b.status === 'Paid';
    }
    if (statusFilter === 'due') {
      return matchesSearch && (b.status === 'Due' || b.status === 'Partially Paid' || (b.dueAmount && b.dueAmount > 0));
    }
    return matchesSearch;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalBilled = bills.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const accountsPayable = bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

  return (
    <div className="flex flex-col gap-0 md:gap-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="hidden sm:flex sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("supplier_bills.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("supplier_bills.subtitle")}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> {t("supplier_bills.record_bill")}
        </Button>
      </div>

      {/* Overview Cards (TallyPay Inspired) */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("supplier_bills.total_purchases")}</CardTitle>
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold">৳{totalBilled.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("supplier_bills.raw_materials")}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("supplier_bills.paid_out")}</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-green-700">৳{totalPaid.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("supplier_bills.payments_made")}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">{t("supplier_bills.payable")}</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-orange-700">৳{accountsPayable.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">{t("supplier_bills.outstanding_due")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h3 className="font-semibold text-lg tracking-tight text-foreground">{t("supplier_bills.all_purchases")}</h3>
          {/* Mobile Filter Toggle Button */}
          <div className="block md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t("supplier_bills.filters")}
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
          <div className="overflow-hidden flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("supplier_bills.search_placeholder") as string}
                className="pl-8 text-xs h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="w-full md:w-28 text-xs h-8">
                  <SelectValue placeholder={t("supplier_bills.all_statuses") as string} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("supplier_bills.all_statuses")}</SelectItem>
                  <SelectItem value="paid">{t("supplier_bills.paid")}</SelectItem>
                  <SelectItem value="due">{t("supplier_bills.due")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter Checkbox & Inputs */}
              <div className="flex items-center gap-1.5 text-xs">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-foreground shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={filterByDate}
                    onChange={(e) => setFilterByDate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                  />
                  {t("supplier_bills.filter_by_date")}
                </label>

                <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter((prev: any) => ({ ...prev, from: e.target.value }))}
                    disabled={!filterByDate}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0 font-medium">{t("supplier_bills.to")}</span>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter((prev: any) => ({ ...prev, to: e.target.value }))}
                    disabled={!filterByDate}
                  />
                </div>
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
                    setFilterByDate(false);
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary shrink-0 h-8"
                >
                  {t("supplier_bills.clear")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 bg-transparent md:border md:bg-card shadow-none md:shadow-sm">
        <CardContent className="p-0">
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("supplier_bills.bill_no")}</TableHead>
                  <TableHead>{t("supplier_bills.supplier")}</TableHead>
                  <TableHead>{t("supplier_bills.date")}</TableHead>
                  <TableHead className="text-right">{t("supplier_bills.total_amount")}</TableHead>
                  <TableHead className="text-right">{t("supplier_bills.paid_amount")}</TableHead>
                  <TableHead className="text-right">{t("supplier_bills.due_amount")}</TableHead>
                  <TableHead className="text-center">{t("supplier_bills.status")}</TableHead>
                  <TableHead className="text-right">{t("supplier_bills.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      {t("supplier_bills.no_bills")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBills.map((bill: any) => (
                    <TableRow key={bill._id}>
                      <TableCell className="font-semibold text-foreground">{bill.billNo}</TableCell>
                      <TableCell>
                        {bill.supplier ? (
                          <div>
                            <div className="font-medium">{bill.supplier.name}</div>
                            {bill.supplier.companyName && (
                              <div className="text-xs text-muted-foreground">{bill.supplier.companyName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t("supplier_bills.deleted_supplier")}</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">৳{(bill.total || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        ৳{(bill.paidAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-semibold">
                        ৳{(bill.dueAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          bill.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                          {bill.status === 'Paid' ? t("supplier_bills.paid") : bill.status === 'Partially Paid' ? t("supplier_bills.partially_paid") : t("supplier_bills.due")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => generateBillPDF(bill, settings, 'print')}
                            title={t("supplier_bills.print_bill") as string}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedBill(bill); setIsDetailOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4 text-indigo-600" /> {t("supplier_bills.view_details")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBill(bill);
                                  setSelectedSupplierId(bill.supplier?._id || bill.supplier || '');
                                  setBillDate(format(new Date(bill.date), 'yyyy-MM-dd'));
                                  setBillItems(bill.items ? bill.items.map((item: any) => ({ ...item })) : []);
                                  setDiscountValue(bill.discount || 0);
                                  setPaidAmount(bill.paidAmount || 0);
                                  setPaymentMethod(bill.paymentMethod || 'Cash');
                                  setIsCreateOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> {t("supplier_bills.edit_bill")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("supplier_bills.download_pdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("supplier_bills.print_bill")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBill(bill._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {t("supplier_bills.delete")}
                              </DropdownMenuItem>
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
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3.5 w-36 rounded" />
                      </div>
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <Skeleton className="h-3.5 w-20 rounded" />
                      <Skeleton className="h-3.5 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">{t("supplier_bills.no_bills")}</div>
            ) : (
              paginatedBills.map((bill: any) => (
                <div key={bill._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-base text-primary">#{bill.billNo}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                      bill.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                      {bill.status === 'Paid' ? t("supplier_bills.paid") : bill.status === 'Partially Paid' ? t("supplier_bills.partially_paid") : t("supplier_bills.due")}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm md:text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground">{t("supplier_bills.supplier")}:</span>
                      <span className="font-semibold text-foreground">
                        {bill.supplier ? bill.supplier.name : t("supplier_bills.deleted_supplier")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                      <span className="text-muted-foreground">{t("supplier_bills.date")}:</span>
                      <span className="text-foreground font-medium">{format(new Date(bill.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t mt-1">
                      <span className="text-muted-foreground">{t("supplier_bills.total")}:</span>
                      <span className="font-bold text-foreground text-base md:text-sm">৳{(bill.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 py-0.5">
                      <span>{t("supplier_bills.paid")}:</span>
                      <span className="font-semibold text-sm">৳{(bill.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-600 font-semibold py-0.5 border-t border-border/30">
                      <span>{t("supplier_bills.due")}:</span>
                      <span className="font-extrabold text-base md:text-sm">৳{(bill.dueAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t mt-1">
                    <Button variant="outline" size="sm" className="h-9 text-teal-600 text-xs px-3 py-1 flex items-center gap-1" onClick={() => generateBillPDF(bill, settings, 'print')}>
                      <Printer className="h-4 w-4 mr-1" /> {t("supplier_bills.print_bill")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedBill(bill); setIsDetailOpen(true); }}>
                          <Eye className="mr-2 h-4 w-4 text-indigo-600" /> {t("supplier_bills.view_details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingBill(bill);
                            setSelectedSupplierId(bill.supplier?._id || bill.supplier || '');
                            setBillDate(format(new Date(bill.date), 'yyyy-MM-dd'));
                            setBillItems(bill.items ? bill.items.map((item: any) => ({ ...item })) : []);
                            setDiscountValue(bill.discount || 0);
                            setPaidAmount(bill.paidAmount || 0);
                            setPaymentMethod(bill.paymentMethod || 'Cash');
                            setPaymentAccountId(bill.paymentAccountId || '');
                            setExpectedPaymentDate(bill.expectedPaymentDate ? format(new Date(bill.expectedPaymentDate), 'yyyy-MM-dd') : '');
                            setIsCreateOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> {t("supplier_bills.edit_bill")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                          <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("supplier_bills.download_pdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                          <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("supplier_bills.print_bill")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteBill(bill._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("supplier_bills.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="py-4 border-t bg-background px-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Purchase Bill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? t("supplier_bills.edit") : t("supplier_bills.create_new")}{t("supplier_bills.edit_create_title")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierSelect">{t("supplier_bills.supplier_label")}</Label>
                <select
                  id="supplierSelect"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.companyName || t("supplier_bills.no_company")})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="billDate">{t("supplier_bills.bill_date")}</Label>
                <Input
                  id="billDate"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Bill items input table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t("supplier_bills.bill_items")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setProductPickerOpen(true); setSelectedProductVariants({}); setProductSearchTerm(''); }}
                    className="text-primary border-primary/40 hover:bg-primary/5 text-xs px-2.5 h-8 md:h-9"
                  >
                    <Package className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCustomItem} className="text-xs px-2.5 h-8 md:h-9">
                    <Plus className="h-4 w-4 mr-1" /> Custom Item
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-2 space-y-2 bg-slate-50/50">
                {billItems.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 p-2 border-b border-muted/50 last:border-0">
                    {/* Row label badge */}
                    {item.isProductItem && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        <Package className="h-2.5 w-2.5" /> Product
                      </span>
                    )}
                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                      <div className="w-full flex-1">
                        <Input
                          placeholder={item.isProductItem ? 'Product name (auto-filled)' : t("supplier_bills.item_name_placeholder") as string}
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="bg-white text-xs md:text-sm h-9"
                          required
                        />
                      </div>
                      <div className="w-full md:w-auto flex gap-2 items-center">
                        <div className="flex-1 md:w-20">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="bg-white text-center text-xs md:text-sm h-9"
                            min="1"
                            required
                          />
                        </div>
                        <div className="flex-1 md:w-28">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.price || ''}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            className="bg-white text-right text-xs md:text-sm h-9"
                            min="0"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={billItems.length === 1}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Batch row for product items */}
                    {item.isProductItem && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Batch Number (optional)"
                          value={item.batchNumber || ''}
                          onChange={(e) => { const n = [...billItems]; n[idx].batchNumber = e.target.value; setBillItems(n); }}
                          className="bg-white h-8 text-xs w-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentAccountSelect">{t("supplier_bills.payment_method") || "Payment Account / Method"}</Label>
                  <select
                    id="paymentAccountSelect"
                    value={
                      paymentMethod === 'Credit'
                        ? 'CREDIT'
                        : paymentAccountId
                          ? `ACCOUNT_${paymentAccountId}`
                          : 'CASH'
                    }
                    onChange={(e: any) => {
                      const val = e.target.value;
                      if (val === 'CASH') {
                        setPaymentMethod('Cash');
                        setPaymentAccountId('');
                      } else if (val === 'CREDIT') {
                        setPaymentMethod('Credit');
                        setPaymentAccountId('');
                      } else if (val.startsWith('ACCOUNT_')) {
                        const accId = val.replace('ACCOUNT_', '');
                        const selectedAcc = ledgerAccounts.find(a => a._id === accId);
                        setPaymentAccountId(accId);
                        if (
                          selectedAcc?.accountCategory === 'MFS' ||
                          selectedAcc?.accountCategory === 'mfs' ||
                          selectedAcc?.mfsProvider
                        ) {
                          setPaymentMethod('MFS');
                        } else {
                          setPaymentMethod('Bank');
                        }
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="CASH">💵 Cash (হাতে নগদ - Cash on Hand)</option>

                    {bankAccounts.length > 0 && (
                      <optgroup label="🏦 Bank Accounts (ব্যাংক একাউন্টসমূহ)">
                        {bankAccounts.map((a) => (
                          <option key={a._id} value={`ACCOUNT_${a._id}`}>
                            {a.name} {a.accountNo ? `(A/C: ${a.accountNo})` : ''} {a.branchName ? `[${a.branchName}]` : ''} - ৳{(a.currentBalance || 0).toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {mfsAccounts.length > 0 && (
                      <optgroup label="📱 MFS Accounts (মোবাইল ব্যাংকিং)">
                        {mfsAccounts.map((a) => (
                          <option key={a._id} value={`ACCOUNT_${a._id}`}>
                            {a.mfsProvider ? `${a.mfsProvider} ` : ''}{a.name} {a.accountNo ? `(${a.accountNo})` : ''} {a.mfsType ? `[${a.mfsType}]` : ''} - ৳{(a.currentBalance || 0).toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {otherAccounts.length > 0 && (
                      <optgroup label="📂 Other Accounts (অন্যান্য একাউন্ট)">
                        {otherAccounts.map((a) => (
                          <option key={a._id} value={`ACCOUNT_${a._id}`}>
                            {a.name} {a.accountNo ? `(${a.accountNo})` : ''} - ৳{(a.currentBalance || 0).toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option value="CREDIT">📋 Credit / Due (সম্পূর্ণ বা আংশিক বাকি)</option>
                  </select>
                </div>

                {paymentMethod === 'Credit' && (
                  <div>
                    <Label htmlFor="expectedPaymentDate">Expected Payment Date (পরিশোধের সম্ভাব্য তারিখ)</Label>
                    <Input
                      id="expectedPaymentDate"
                      type="date"
                      value={expectedPaymentDate}
                      onChange={(e) => setExpectedPaymentDate(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="paidAmount">{t("supplier_bills.upfront_payment")}</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={t("supplier_bills.amount_paid_now") as string}
                    className="font-medium text-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-md text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("supplier_bills.subtotal")}</span>
                  <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">{t("supplier_bills.discount_fixed")}</span>
                  <Input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 text-right h-8 bg-white"
                  />
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                  <span>{t("supplier_bills.total_bill")}</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>{t("supplier_bills.due_to_supplier")}</span>
                  <span>৳{dueAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={formLoading}>
                {t("supplier_bills.cancel")}
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? t("supplier_bills.saving") : (editingBill ? t("supplier_bills.update_bill") : t("supplier_bills.create_bill"))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Select Products to Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                className="pl-8"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>
            <div className="border rounded-md overflow-hidden max-h-[55vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(p => p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                    .map((prod) => {
                      const hasVariants = prod.variants && prod.variants.length > 0;
                      return (
                        <TableRow key={prod._id}>
                          <TableCell>
                            {!hasVariants && (
                              <Checkbox
                                checked={selectedProductVariants[prod._id] === null}
                                onCheckedChange={() => toggleProductVariant(prod._id, null)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{prod.name}{prod.sku && <span className="text-xs text-muted-foreground ml-2">SKU: {prod.sku}</span>}</TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-1.5 py-1">
                                {prod.variants.map((v: any) => {
                                  const label = [v.color, v.size, v.name].filter(Boolean).join(' / ');
                                  const isSelected = selectedProductVariants[prod._id] === v._id;
                                  return (
                                    <Button
                                      key={v._id}
                                      type="button"
                                      variant={isSelected ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => toggleProductVariant(prod._id, v._id)}
                                      className="text-xs py-0.5 px-2 h-7"
                                    >
                                      {label} (৳{v.purchasePrice || v.price || 0})
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : <span className="text-xs text-muted-foreground">No variants</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {!hasVariants && `৳${(prod.purchasePrice || prod.price || 0).toLocaleString()}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">{Object.keys(selectedProductVariants).length} product(s) selected</span>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleAddSelectedProducts} disabled={Object.keys(selectedProductVariants).length === 0}>
                  Add Selected ({Object.keys(selectedProductVariants).length})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("supplier_bills.bill_details_title")}</DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-6 mt-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg">{selectedBill.billNo}</h3>
                  <p className="text-xs text-muted-foreground">
                    Date: {format(new Date(selectedBill.date), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${selectedBill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                    selectedBill.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                    {selectedBill.status === 'Paid' ? t("supplier_bills.paid") : selectedBill.status === 'Partially Paid' ? t("supplier_bills.partially_paid") : t("supplier_bills.due")}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">{t("supplier_bills.supplier_details")}</Label>
                <div className="mt-1 font-semibold text-foreground">
                  {selectedBill.supplier?.name}
                  {selectedBill.supplier?.companyName && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({selectedBill.supplier.companyName})
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{selectedBill.supplier?.phone}</div>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">{t("supplier_bills.purchased_items")}</Label>
                <div className="border rounded-md mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>{t("supplier_bills.item_name")}</TableHead>
                        <TableHead className="text-center">{t("supplier_bills.quantity")}</TableHead>
                        <TableHead className="text-right">{t("supplier_bills.price")}</TableHead>
                        <TableHead className="text-right">{t("supplier_bills.total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">৳{(item.price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">৳{((item.quantity || 0) * (item.price || 0)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm max-w-xs ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("supplier_bills.subtotal")}</span>
                  <span>৳{(selectedBill.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("supplier_bills.discount")}</span>
                  <span>-৳{(selectedBill.discount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>{t("supplier_bills.total_amount")}:</span>
                  <span>৳{(selectedBill.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>{t("supplier_bills.paid_amount")}:</span>
                  <span>৳{(selectedBill.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t pt-1">
                  <span>{t("supplier_bills.remaining_due")}</span>
                  <span>৳{(selectedBill.dueAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SupplierBillsPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={6} titleWidth="w-52" />}>
      <SupplierBillsContent />
    </Suspense>
  );
}

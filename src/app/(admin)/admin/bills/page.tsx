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
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
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
  const [products, setProducts] = useState<any[]>([]);
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
  const [editingBill, setEditingBill] = useState<any>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', quantity: 1, price: 0, batchNumber: 'auto' }
  ]);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [prevDue, setPrevDue] = useState<number>(0);
  const [cashIn, setCashIn] = useState<number>(0);
  const [expectedReceivableDate, setExpectedReceivableDate] = useState('');

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  // Map of productId → variantId (null = base product, string = variant _id)
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState('');

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
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
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

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;
  const total = Math.max(0, subtotal + deliveryCharge + serviceFee - discount);
  const gTotal = total + prevDue;
  const currentBillDue = Math.max(0, gTotal - cashIn);
  const calculatedStatus = currentBillDue <= 0 ? 'Paid' : 'Due';

  const validatePhone = (phone: string) => {
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!bdPhoneRegex.test(phone.replace(/\s/g, ''))) {
      setPhoneError('Enter a valid BD number (e.g. 017XXXXXXXX)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const toggleProductVariant = (productId: string, variantId: string | null) => {
    setSelectedProductVariants(prev => {
      const current = prev[productId];
      // Clicking the same selection again → deselect
      if (current === variantId) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: variantId };
    });
  };

  const selectedCount = Object.keys(selectedProductVariants).length;

  const handleAddSelectedProducts = () => {
    const newItems: BillItemInput[] = [];

    Object.entries(selectedProductVariants).forEach(([productId, variantId]) => {
      const prod = products.find(p => p._id === productId);
      if (!prod) return;

      if (variantId === null) {
        // Base product (no variant chosen)
        newItems.push({ productId: prod._id, name: prod.name, price: prod.salePrice || prod.price || 0, quantity: 1, batchNumber: 'auto' });
      } else {
        // Specific variant
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        newItems.push({ productId: prod._id, variantId: variant._id, name: label, price: variant.salePrice || variant.price || 0, quantity: 1, batchNumber: 'auto' });
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

  const handleAddItemRow = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0, batchNumber: 'auto' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (billItems.length === 1) {
      setBillItems([{ name: '', quantity: 1, price: 0, batchNumber: 'auto' }]);
    } else {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: any) => {
    const updated = [...billItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price') {
      updated[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index].name = value;
    }
    setBillItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientAddress.trim()) {
      toast.error('Client details are required');
      return;
    }
    if (!validatePhone(clientPhone)) {
      toast.error('Please enter a valid Bangladesh phone number');
      return;
    }

    const validItems = billItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('At least one item with a name is required');
      return;
    }

    if (calculatedStatus === 'Due' && !expectedReceivableDate) {
      toast.error('Expected receivable date is required for due bills');
      return;
    }

    try {
      setFormLoading(true);
      const billData = {
        clientName,
        clientPhone,
        clientAddress,
        items: validItems,
        subtotal,
        deliveryCharge,
        serviceFee,
        discountType,
        discountValue,
        discount,
        total,
        prevDue,
        gTotal,
        cashIn,
        currentBillDue,
        status: calculatedStatus,
        expectedReceivableDate: calculatedStatus === 'Due' ? expectedReceivableDate : undefined,
        documentType: 'bill'
      };

      const url = editingBill ? `/api/admin/bills/${editingBill._id}` : '/api/admin/bills';
      const method = editingBill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${editingBill ? 'update' : 'create'} bill`);
      }

      const createdBill = await res.json();
      toast.success(editingBill ? 'Bill updated successfully!' : 'Bill generated successfully!');

      setIsCreateOpen(false);
      resetForm();
      fetchBills();
    } catch (error: any) {
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setPhoneError('');
    setClientAddress('');
    setBillItems([{ name: '', quantity: 1, price: 0 }]);
    setDeliveryCharge(0);
    setServiceFee(0);
    setDiscountType('fixed');
    setDiscountValue(0);
    setPrevDue(0);
    setCashIn(0);
    setExpectedReceivableDate('');
    setSelectedProductVariants({});
    setProductSearchTerm('');
    setProductPickerOpen(false);
    setEditingBill(null);
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
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("bills.title")}</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">{t("bills.subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto font-bold bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4 shrink-0" /> {t("bills.create_bill")}
        </Button>
      </div>

      {/* Metrics Cards */}
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

      {/* Filter and Search */}
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

      {/* Bill List Table */}
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
                          <span>{bill.clientPhone}</span>
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
                            title="Print Bill"
                          >
                            <Printer className="h-4 w-4" />
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBill(bill);
                                  setClientName(bill.clientName);
                                  setClientPhone(bill.clientPhone);
                                  setClientAddress(bill.clientAddress);
                                  setBillItems(bill.items);
                                  setDeliveryCharge(bill.deliveryCharge);
                                  setServiceFee(bill.serviceFee || 0);
                                  setDiscountType(bill.discountType || 'fixed');
                                  setDiscountValue(bill.discountValue || 0);
                                  setPrevDue(bill.prevDue || 0);
                                  setCashIn(bill.cashIn || 0);
                                  setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                                  setIsCreateOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> {t("bills.edit_bill")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("bills.download_pdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("bills.print_bill")}
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
            <div className="block md:hidden space-y-2 p-1">
              {paginatedBills.map((bill) => (
                <div key={bill._id} className="p-2.5 border rounded-lg bg-background shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="font-bold text-sm text-primary hover:underline"
                    >
                      #{bill.invoiceNo}
                    </button>
                    <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={bill.status === 'Paid' ? 'bg-green-600 text-white border-none text-[10px]' : 'text-[10px]'}>
                      {bill.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.client")}:</span>
                      <span className="font-semibold text-foreground">{bill.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("bills.phone")}:</span>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span>{bill.clientPhone}</span>
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
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.date")}:</span>
                      <span className="text-foreground">{format(new Date(bill.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">{t("bills.total")}:</span>
                      <span className="font-bold text-foreground">৳{bill.gTotal}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>৳{bill.cashIn}</span>
                    </div>
                    <div className="flex justify-between text-orange-600 font-semibold">
                      <span>Due:</span>
                      <span>৳{bill.currentBillDue}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-teal-600 hover:text-teal-700 text-xs px-2.5"
                      onClick={() => generateBillPDF(bill, settings, 'print')}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" /> {t("bills.print")}
                    </Button>
                    {bill.status === 'Due' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs px-2.5"
                        onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Collect
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedBill(bill)}>
                          <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingBill(bill);
                            setClientName(bill.clientName);
                            setClientPhone(bill.clientPhone);
                            setClientAddress(bill.clientAddress);
                            setBillItems(bill.items);
                            setDeliveryCharge(bill.deliveryCharge);
                            setServiceFee(bill.serviceFee || 0);
                            setDiscountType(bill.discountType || 'fixed');
                            setDiscountValue(bill.discountValue || 0);
                            setPrevDue(bill.prevDue || 0);
                            setCashIn(bill.cashIn || 0);
                            setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                            setIsCreateOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> {t("bills.edit_bill")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                          <Download className="mr-2 h-4 w-4 text-blue-600" /> {t("bills.download_pdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                          <Printer className="mr-2 h-4 w-4 text-teal-600" /> {t("bills.print_bill")}
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

      {/* Create Bill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? t("bills.edit_bill_title") : t("bills.generate_bill")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-semibold">{t("bills.client_name")}</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Rahim Khan"
                  className="h-11 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-sm font-semibold">{t("bills.client_phone")}</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    if (phoneError) validatePhone(e.target.value);
                  }}
                  onBlur={(e) => validatePhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className={`h-11 text-base ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
                {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress" className="text-sm font-semibold">{t("bills.client_address")}</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Nawabpur, Dhaka"
                  className="h-11 text-base"
                  required
                />
              </div>
            </div>

            {/* Bill Items header with Product Selection Button */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm">{t("bills.bill_items")}</h4>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPickerOpen(true)}
                    className="font-bold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> {t("bills.select_products")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold">
                    <Plus className="h-3 w-3 mr-1" /> {t("bills.add_custom_item")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {billItems.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border p-2 sm:p-0 sm:border-none rounded-md">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Input
                        placeholder={t("bills.item_description") as string}
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="flex-1"
                        required
                      />
                      {item.productId && (
                        <Select
                          value={item.batchNumber || 'auto'}
                          onValueChange={(val) => handleItemChange(index, 'batchNumber', val)}
                        >
                          <SelectTrigger className="w-[120px] h-10">
                            <SelectValue placeholder="Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">FIFO (Auto)</SelectItem>
                            {(() => {
                              const prod = products.find(p => p._id === item.productId);
                              if (!prod) return null;
                              let availableBatches = prod.batches || [];
                              if (item.variantId) {
                                const v = prod.variants?.find((va: any) => va._id === item.variantId);
                                if (v && v.batches && v.batches.length > 0) availableBatches = v.batches;
                              }
                              return availableBatches.map((b: any, bIdx: number) => (
                                <SelectItem key={bIdx} value={b.batchNumber}>
                                  {b.batchNumber} (Qty: {b.stock})
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                          type="number"
                          placeholder={t("bills.qty") as string}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="flex-1 sm:w-20"
                          min="1"
                          required
                        />
                        <Input
                          type="number"
                          placeholder={t("bills.rate") as string}
                          value={item.price || ''}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="flex-1 sm:w-28"
                          min="0"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItemRow(index)}
                          className="text-destructive hover:bg-destructive/10 shrink-0 h-10 w-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Adjustments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCharge">{t("bills.delivery_charge")}</Label>
                    <Input
                      id="deliveryCharge"
                      type="number"
                      value={deliveryCharge || ''}
                      onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prevDue">{t("bills.previous_due")}</Label>
                    <Input
                      id="prevDue"
                      type="number"
                      value={prevDue || ''}
                      onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceFee">{t("bills.service_fee")} <span className="text-muted-foreground font-normal text-xs">— Optional</span></Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    value={serviceFee || ''}
                    placeholder="0"
                    onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-2 col-span-1">
                    <Label>{t("bills.discount_type")}</Label>
                    <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">{t("bills.fixed")}</SelectItem>
                        <SelectItem value="percentage">{t("bills.percent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>{t("bills.discount_value")}</Label>
                    <Input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder={discountType === 'percentage' ? '%' : '৳'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashIn">{t("bills.cash_in_label_input")}</Label>
                    <Input
                      id="cashIn"
                      type="number"
                      value={cashIn || ''}
                      onChange={(e) => setCashIn(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("bills.status")}</Label>
                    <div className="pt-2">
                      <Badge variant={calculatedStatus === 'Paid' ? 'default' : 'destructive'} className={calculatedStatus === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                        {calculatedStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {calculatedStatus === 'Due' && (
                  <div className="space-y-2">
                    <Label htmlFor="expectedReceivableDate">{t("bills.expected_receivable_date")}</Label>
                    <Input
                      id="expectedReceivableDate"
                      type="date"
                      value={expectedReceivableDate}
                      onChange={(e) => setExpectedReceivableDate(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Summary calculations view */}
              <div className="bg-muted/40 p-4 rounded-lg space-y-3 border h-fit text-sm">
                <h4 className="font-bold border-b pb-2 mb-2 text-base">{t("bills.bill_summary")}</h4>
                <div className="flex justify-between">
                  <span>{t("bills.subtotal_label")}:</span>
                  <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>{t("bills.delivery_charge_label")}:</span>
                    <span>+ ৳{deliveryCharge.toLocaleString()}</span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span>{t("bills.service_fee_label")}:</span>
                    <span>+ ৳{serviceFee.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>{t("bills.discount")} {discountType === 'percentage' && `(${discountValue}%)`}:</span>
                    <span>- ৳{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>{t("bills.total_bill_label")}:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
                {prevDue > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("bills.previous_due_label")}:</span>
                    <span>+ ৳{prevDue.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary">
                  <span>{t("bills.grand_total_label")}:</span>
                  <span>৳{gTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700 border-t pt-2">
                  <span>{t("bills.cash_in_label")}:</span>
                  <span>৳{cashIn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base text-destructive">
                  <span>{t("bills.remaining_due_label")}:</span>
                  <span>৳{currentBillDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t("bills.cancel")}</Button>
              <Button type="submit" disabled={formLoading} className="font-bold">
                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingBill ? t("bills.update_bill_button") : t("bills.generate_bill_button"))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>
            <div className="border rounded-md overflow-hidden max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Options / Variants</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
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
                          <TableCell className="font-medium">{prod.name}</TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-2 py-1">
                                {prod.variants.map((v: any) => {
                                  const label = [v.color, v.size].filter(Boolean).join(' / ');
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
                                      {label} (৳{v.salePrice || v.price})
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Standard Item</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!hasVariants && `৳${prod.salePrice || prod.price}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">{selectedCount} items selected</span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddSelectedProducts} className="bg-primary text-primary-foreground">Add Selected</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                        <span>{selectedBill.clientPhone}</span>
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

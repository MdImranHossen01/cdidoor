'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
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
  Ticket,
  Coins,
  ShoppingBag,
  CalendarDays,
  Hash,
  MoreHorizontal,
  Edit,
  SlidersHorizontal,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import { printBillPOS } from '@/lib/bill-pos-generator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { getWhatsAppLink } from '@/lib/utils';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={{ fill: 'currentColor', stroke: 'none' }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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

function ShowroomBillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const parsedPage = parseInt(searchParams.get('page') || '1');
  const initialPage = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
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
    router.push(`/showroom/bills?${params.toString()}`);
  }, [currentPage, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/showroom/bills?${params.toString()}`);
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

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Customer selection & suggestion state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<any[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameAbortControllerRef = useRef<AbortController | null>(null);

  // Print states with persistent localStorage sync
  const [printMode, setPrintMode] = useState<'none' | 'pos' | 'a4'>('none');

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('default_bill_print_mode') as 'none' | 'pos' | 'a4';
      if (savedMode === 'none' || savedMode === 'pos' || savedMode === 'a4') {
        setPrintMode(savedMode);
      }
    } catch (e) {}
  }, []);

  const handlePrintModeSelect = (mode: 'none' | 'pos' | 'a4') => {
    setPrintMode(mode);
    try {
      localStorage.setItem('default_bill_print_mode', mode);
    } catch (e) {}
  };

  // Token adjustment state
  const [useTokens, setUseTokens] = useState<boolean>(false);
  const [tokensToUse, setTokensToUse] = useState<number>(0);
  const [customerTokens, setCustomerTokens] = useState<number>(0);

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  // Map of productId → variantId (null = base product, string = variant _id)
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setShowNameDropdown(false);
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) setShowPhoneDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
      if (phoneTimeoutRef.current) clearTimeout(phoneTimeoutRef.current);
      if (nameAbortControllerRef.current) nameAbortControllerRef.current.abort();
    };
  }, []);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setClientName(customer.clientName || '');
    setClientPhone(customer.clientPhone || '');
    setClientAddress(customer.clientAddress || '');
    setCustomerTokens(customer.walletBalance || 0);
    if (customer.totalDue && customer.totalDue > 0 && prevDue === 0) {
      setPrevDue(customer.totalDue);
    }
    setShowNameDropdown(false);
    setShowPhoneDropdown(false);
  };

  const handleNameChange = (val: string) => {
    setClientName(val);
    setCustomerTokens(0);

    if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
    if (nameAbortControllerRef.current) nameAbortControllerRef.current.abort();

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      const controller = new AbortController();
      nameAbortControllerRef.current = controller;

      nameTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(trimmed)}`, {
            signal: controller.signal
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.customers || [];
            setNameSuggestions(list);
            setShowNameDropdown(list.length > 0);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error fetching suggestions:', err);
          }
        }
      }, 200);
    } else {
      setNameSuggestions([]);
      setShowNameDropdown(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    setClientPhone(val);
    setCustomerTokens(0);
    if (phoneError) validatePhone(val);

    if (phoneTimeoutRef.current) clearTimeout(phoneTimeoutRef.current);

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      phoneTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            const data = await res.json();
            const list = data.customers || [];
            setPhoneSuggestions(list);
            setShowPhoneDropdown(list.length > 0);
          }
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      }, 200);
    } else {
      setPhoneSuggestions([]);
      setShowPhoneDropdown(false);
    }
  };

  const handleCopyLink = async (invoiceNo: string) => {
    try {
      const shareableLink = `${window.location.origin}/bills/${invoiceNo}`;
      await navigator.clipboard.writeText(shareableLink);
      toast.success('Shareable link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link.');
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/showroom/bills?filter=${statusFilter.toLowerCase()}&type=bill`);
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

  useEffect(() => {
    fetchBills();
    fetchProducts();
    fetchSettings();
  }, [statusFilter]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), totalAmount: subtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount,
        });
        toast.success(`Coupon "${data.code}" applied! (-৳${data.discountAmount})`);
        setCouponInput('');
      } else {
        toast.error(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      toast.error('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed');
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const manualDiscount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;

  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscountAmount = Math.floor(subtotal * (appliedCoupon.discountValue / 100));
    } else {
      couponDiscountAmount = appliedCoupon.discountValue;
    }
    couponDiscountAmount = Math.min(couponDiscountAmount, Math.max(0, subtotal - manualDiscount));
  }

  const totalDiscount = manualDiscount + couponDiscountAmount;
  const totalBeforeTokens = Math.max(0, subtotal + deliveryCharge + serviceFee - totalDiscount);

  const availableCustomerTokens = customerTokens;
  const effectiveTokensUsed = useTokens
    ? Math.min(
      availableCustomerTokens,
      totalBeforeTokens,
      tokensToUse > 0 ? tokensToUse : availableCustomerTokens
    )
    : 0;

  const total = Math.max(0, totalBeforeTokens - effectiveTokensUsed);
  const gTotal = total + prevDue;
  const currentBillDue = Math.max(0, gTotal - cashIn);
  const changeReturn = Math.max(0, cashIn - gTotal);
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

      const price = selectedCustomer?.role === 'wholesaler'
        ? (prod.wholesaleSalePrice || prod.wholesalePrice || prod.salePrice || prod.price || 0)
        : (prod.salePrice || prod.price || 0);

      if (variantId === null) {
        newItems.push({ productId: prod._id, name: prod.name, price, quantity: 1, batchNumber: 'auto' });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const vPrice = selectedCustomer?.role === 'wholesaler'
          ? (variant.wholesaleSalePrice || variant.wholesalePrice || variant.salePrice || variant.price || price)
          : (variant.salePrice || variant.price || 0);
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        newItems.push({ productId: prod._id, variantId: variant._id, name: label, price: vPrice, quantity: 1, batchNumber: 'auto' });
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
    const updated = billItems.map((item, idx) => {
      if (idx === index) {
        const cloned = { ...item };
        if (field === 'quantity') {
          cloned.quantity = Math.max(1, parseInt(value) || 1);
        } else if (field === 'price') {
          cloned.price = Math.max(0, parseFloat(value) || 0);
        } else {
          cloned[field] = value;
        }
        return cloned;
      }
      return item;
    });
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

    let printTab: Window | null = null;
    if (!editingBill && printMode === 'pos') {
      printTab = window.open('about:blank', '_blank');
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
        discount: totalDiscount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: couponDiscountAmount,
        walletAmountUsed: effectiveTokensUsed,
        total,
        prevDue,
        gTotal,
        cashIn,
        changeReturn,
        currentBillDue,
        status: calculatedStatus,
        expectedReceivableDate: calculatedStatus === 'Due' ? expectedReceivableDate : undefined,
        documentType: 'bill'
      };

      const url = editingBill ? `/api/showroom/bills/${editingBill._id}` : '/api/showroom/bills';
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

      const savedBill = await res.json();

      toast.success(editingBill ? 'Bill updated successfully!' : 'Bill generated successfully!');

      if (!editingBill && printMode === 'pos' && printTab) {
        await printBillPOS(savedBill, settings, printTab);
      } else if (printTab) {
        printTab.close();
      }

      if (!editingBill && printMode === 'a4') {
        await generateBillPDF(savedBill, settings, 'print');
      }

      setIsCreateOpen(false);
      resetForm();
      fetchBills();
    } catch (error: any) {
      if (printTab) printTab.close();
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
    setSelectedCustomer(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setUseTokens(false);
    setTokensToUse(0);
    setCustomerTokens(0);
    setBillItems([{ name: '', quantity: 1, price: 0, batchNumber: 'auto' }]);
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

        const res = await fetch(`/api/showroom/bills/${billId}`, {
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
        const res = await fetch(`/api/showroom/bills/${billId}`, {
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
    const matchesSearch = (b.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.clientPhone || '').includes(searchTerm) ||
      (b.invoiceNo || '').includes(searchTerm);

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

  if (loading && bills.length === 0) {
    return <AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" showStats={true} />;
  }

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-[1px]">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold tracking-tight">Showroom Billing Manager</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage client bills, offer discounts and track collections for your showroom.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto font-bold bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4 shrink-0" /> Create Bill
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">Total Billed</CardTitle>
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold">৳{totalBilled.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">Client invoicing</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">Collected</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-green-700">৳{totalCollected.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">Payments received</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium truncate">Receivable</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xs sm:text-lg md:text-2xl font-bold text-orange-700">৳{accountsReceivable.toLocaleString()}</div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden xs:block">Outstanding due</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0 w-full md:w-auto">
          <h3 className="font-semibold text-lg tracking-tight text-foreground md:hidden">All Invoices</h3>
          {/* Mobile Filter Toggle Button */}
          <div className="block md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {isFiltered && (
                <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
          </div>
        </div>

        {/* Desktop & Collapsible Mobile Filters Wrapper */}
        <div className={`grid transition-all duration-300 ease-in-out md:block w-full ${showMobileFilters
            ? 'grid-rows-[1fr] opacity-100 mt-3 visible'
            : 'grid-rows-[0fr] opacity-0 invisible md:visible md:opacity-100 md:grid-rows-none'
          }`}>
          <div className="overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full">

            {/* Left Side: Search & Date Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="relative w-full md:w-52">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone or bill..."
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
                  Filter by Date
                </label>

                <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    disabled={!filterByDate}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0 font-medium">to</span>
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
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${statusFilter === 'all'
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted border-border text-foreground'
                    }`}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'Paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Paid')}
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${statusFilter === 'Paid'
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted border-border text-foreground'
                    }`}
                >
                  Paid
                </Button>
                <Button
                  variant={statusFilter === 'Due' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Due')}
                  className={`font-bold h-7 px-3 text-xs rounded-lg transition-all duration-200 border cursor-pointer ${statusFilter === 'Due'
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted border-border text-foreground'
                    }`}
                >
                  Due
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
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bill List Table */}
      <div className="rounded-md md:border md:bg-background overflow-hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 stroke-1" />
            <p>No bills found</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table className="block md:table">
                <TableHeader className="hidden md:table-header-group">
                  <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                    <TableHead>Bill No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client Details</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Paid (Cash-in)</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Expected Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
                  {paginatedBills.map((bill) => (
                    <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0" key={bill._id}>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="font-bold text-primary hover:underline underline-offset-2 flex items-center gap-1 group transition-colors"
                        >
                          <Hash className="h-3 w-3" />
                          {bill.invoiceNo}
                          <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                        <div className="font-medium">{bill.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill.clientPhone ? (
                            <a
                              href={getWhatsAppLink(bill.clientPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-green-600 font-medium transition-colors inline-flex items-center gap-1"
                              title="Chat on WhatsApp"
                            >
                              <span>{bill.clientPhone}</span>
                              <WhatsAppIcon className="h-3 w-3 text-green-600" />
                            </a>
                          ) : (
                            <span>{bill.clientPhone || '—'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right font-semibold">৳{bill.gTotal}</TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right text-green-600">৳{bill.cashIn}</TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right text-orange-600 font-semibold">৳{bill.currentBillDue}</TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-center">
                        <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={bill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-center text-xs text-muted-foreground">
                        {bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right">
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
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBill(bill);
                                  setClientName(bill.clientName);
                                  setClientPhone(bill.clientPhone);
                                  setClientAddress(bill.clientAddress);
                                  setBillItems(bill.items.map((item: any) => ({ ...item })));
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Bill
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4 text-blue-600" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4 text-teal-600" /> Print Bill (A4)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => printBillPOS(bill, settings)}>
                                <Receipt className="mr-2 h-4 w-4 text-indigo-600" /> Print POS Receipt
                              </DropdownMenuItem>
                              {bill.status === 'Due' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}>
                                  <CreditCard className="mr-2 h-4 w-4 text-green-600" /> Collect Cash
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleCopyLink(bill.invoiceNo)}>
                                <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBill(bill._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-semibold text-foreground">{bill.clientName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Phone:</span>
                      {bill.clientPhone ? (
                        <a
                          href={getWhatsAppLink(bill.clientPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:underline hover:text-green-600 inline-flex items-center gap-1"
                          title="Chat on WhatsApp"
                        >
                          <span>{bill.clientPhone}</span>
                          <WhatsAppIcon className="h-3 w-3 text-green-600" />
                        </a>
                      ) : (
                        <span className="text-foreground">{bill.clientPhone || '—'}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="text-foreground">{format(new Date(bill.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Total:</span>
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
                      className="h-8 text-teal-600 hover:text-teal-700 text-xs px-2"
                      onClick={() => generateBillPDF(bill, settings, 'print')}
                    >
                      <Printer className="h-3.5 w-3.5 mr-0.5" /> A4
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-indigo-600 hover:text-indigo-700 text-xs px-2"
                      onClick={() => printBillPOS(bill, settings)}
                    >
                      <Receipt className="h-3.5 w-3.5 mr-0.5" /> POS
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
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingBill(bill);
                            setClientName(bill.clientName);
                            setClientPhone(bill.clientPhone);
                            setClientAddress(bill.clientAddress);
                            setBillItems(bill.items.map((item: any) => ({ ...item })));
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
                          <Edit className="mr-2 h-4 w-4" /> Edit Bill
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                          <Download className="mr-2 h-4 w-4 text-blue-600" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                          <Printer className="mr-2 h-4 w-4 text-teal-600" /> Print Bill (A4)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printBillPOS(bill, settings)}>
                          <Receipt className="mr-2 h-4 w-4 text-indigo-600" /> Print POS Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(bill.invoiceNo)}>
                          <Share2 className="mr-2 h-4 w-4 text-indigo-600" /> Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteBill(bill._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            <DialogTitle>{editingBill ? 'Edit' : 'Generate'} Client Bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Info */}
            <div className="relative space-y-4 bg-gray-50/50 p-4 sm:p-5 rounded-2xl border border-gray-100/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Customer Details</h3>
                {selectedCustomer && (
                  <div className="flex flex-wrap items-center gap-2 bg-white/95 border border-primary/25 rounded-xl px-3 py-1.5 shadow-xs text-xs">
                    {selectedCustomer.role === 'wholesaler' ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold px-2 py-0.5 text-[11px] uppercase tracking-wide hover:bg-purple-100 shadow-none">
                        Wholesaler
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2 py-0.5 text-[11px] uppercase tracking-wide hover:bg-slate-100">
                        Regular Customer
                      </Badge>
                    )}
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                      <span>Orders: <strong className="text-slate-900 font-bold">{selectedCustomer.totalOrders || 0}</strong></span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span>Tokens: <strong className="text-amber-600 font-bold">৳{selectedCustomer.walletBalance || 0}</strong></span>
                    </div>
                    {(selectedCustomer.totalDue || 0) > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1 font-semibold text-red-600">
                          <span>Due: <strong className="font-bold">৳{(selectedCustomer.totalDue || 0).toLocaleString()}</strong></span>
                        </div>
                      </>
                    )}
                    {(selectedCustomer.totalSpent || 0) > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1 font-semibold text-emerald-700">
                          <span>Spent: <strong className="font-bold">৳{(selectedCustomer.totalSpent || 0).toLocaleString()}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Customer Name */}
                <div className="space-y-2" ref={nameRef}>
                  <Label htmlFor="clientName" className="text-sm font-semibold">Client Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => { if (clientName.trim() && nameSuggestions.length > 0) setShowNameDropdown(true); }}
                      placeholder="e.g. Rahim Khan"
                      className="h-11 text-base"
                      autoComplete="off"
                      required
                    />
                    {showNameDropdown && nameSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {nameSuggestions.map((c, i) => (
                          <div
                            key={i}
                            className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-left"
                            onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-medium text-sm text-foreground">{c.clientName}</span>
                              <div className="flex items-center gap-1">
                                {c.role === 'wholesaler' && (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded-sm">
                                    Wholesaler
                                  </span>
                                )}
                                {c.walletBalance !== undefined && c.walletBalance > 0 && (
                                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                    ৳{c.walletBalance} Tokens
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{c.clientPhone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Phone */}
                <div className="space-y-2" ref={phoneRef}>
                  <Label htmlFor="clientPhone" className="text-sm font-semibold">Client Phone <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="clientPhone"
                      value={clientPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onFocus={() => { if (clientPhone.trim() && phoneSuggestions.length > 0) setShowPhoneDropdown(true); }}
                      onBlur={(e) => validatePhone(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className={`h-11 text-base ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      autoComplete="off"
                      required
                    />
                    {showPhoneDropdown && phoneSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {phoneSuggestions.map((c, i) => (
                          <div
                            key={i}
                            className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-left"
                            onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-medium text-sm text-foreground">{c.clientPhone}</span>
                              <div className="flex items-center gap-1">
                                {c.role === 'wholesaler' && (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded-sm">
                                    Wholesaler
                                  </span>
                                )}
                                {c.walletBalance !== undefined && c.walletBalance > 0 && (
                                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                    ৳{c.walletBalance} Tokens
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{c.clientName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                </div>

                {/* Customer Address */}
                <div className="space-y-2">
                  <Label htmlFor="clientAddress" className="text-sm font-semibold">Client Address <span className="text-destructive">*</span></Label>
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
            </div>

            {/* Bill Items selection */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm">Bill Items</h4>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPickerOpen(true)}
                    className="font-bold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Select Products
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold">
                    <Plus className="h-3 w-3 mr-1" /> Add Custom Item
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {billItems.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border p-2 sm:p-0 sm:border-none rounded-md">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Input
                        placeholder="Item Description"
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
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="flex-1 sm:w-20"
                          min="1"
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Rate"
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
                    <Label htmlFor="deliveryCharge">Delivery Charge (৳)</Label>
                    <Input
                      id="deliveryCharge"
                      type="number"
                      value={deliveryCharge || ''}
                      onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceFee">Service Fee (৳) <span className="text-muted-foreground font-normal text-xs">— Optional</span></Label>
                    <Input
                      id="serviceFee"
                      type="number"
                      value={serviceFee || ''}
                      placeholder="0"
                      onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-2 col-span-1">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (৳)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder={discountType === 'percentage' ? '%' : '৳'}
                    />
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div className="p-3.5 bg-card rounded-xl border border-border space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-primary" /> Apply Coupon Code
                  </Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono font-bold tracking-wider text-xs">
                          {appliedCoupon.code}
                        </Badge>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                          -৳{couponDiscountAmount.toLocaleString()} ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : 'Fixed'})
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code (e.g. SAVE10)"
                        className="uppercase font-mono font-semibold text-sm"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                      />
                      <Button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()} className="font-bold shrink-0">
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Token Balance Redemption Section */}
                {availableCustomerTokens > 0 && (
                  <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="useTokensShowroom"
                          checked={useTokens}
                          onChange={(e) => {
                            setUseTokens(e.target.checked);
                            if (e.target.checked && tokensToUse <= 0) {
                              setTokensToUse(Math.min(availableCustomerTokens, totalBeforeTokens));
                            }
                          }}
                          className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <Label htmlFor="useTokensShowroom" className="font-bold text-sm cursor-pointer flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                          <Coins className="h-4 w-4 text-amber-500" />
                          Redeem Token Balance
                        </Label>
                      </div>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-300">
                        Available: ৳{availableCustomerTokens.toLocaleString()}
                      </span>
                    </div>
                    {useTokens && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tokens to use:</span>
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">৳</span>
                          <Input
                            type="number"
                            value={tokensToUse || ''}
                            onChange={(e) => setTokensToUse(Math.min(availableCustomerTokens, Math.max(0, parseFloat(e.target.value) || 0)))}
                            placeholder={String(Math.min(availableCustomerTokens, totalBeforeTokens))}
                            className="h-8 pl-6 pr-2 text-right font-bold text-xs bg-background"
                            min="0"
                            max={availableCustomerTokens}
                          />
                        </div>
                        <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                          -৳{effectiveTokensUsed.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {calculatedStatus === 'Due' && (
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="expectedReceivableDate">Expected Date of Receivable *</Label>
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

              {/* Calculations summary */}
              <div className="bg-muted/40 p-4 rounded-lg space-y-3 border h-fit text-sm">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="font-bold text-base">Bill Summary</h4>
                  <Badge variant={calculatedStatus === 'Paid' ? 'default' : 'destructive'} className={calculatedStatus === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                    {calculatedStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>+ ৳{deliveryCharge.toLocaleString()}</span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span>+ ৳{serviceFee.toLocaleString()}</span>
                  </div>
                )}
                {manualDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount {discountType === 'percentage' && `(${discountValue}%)`}:</span>
                    <span>- ৳{manualDiscount.toLocaleString()}</span>
                  </div>
                )}
                {appliedCoupon && couponDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      Coupon ({appliedCoupon.code}):
                    </span>
                    <span>- ৳{couponDiscountAmount.toLocaleString()}</span>
                  </div>
                )}
                {effectiveTokensUsed > 0 && (
                  <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5" />
                      Tokens Redeemed:
                    </span>
                    <span>- ৳{effectiveTokensUsed.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Total Bill:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>

                {/* Interactive Previous Due Row */}
                <div className="flex items-center justify-between border-t pt-2.5 gap-3">
                  <Label htmlFor="prevDue" className="font-semibold text-muted-foreground text-sm whitespace-nowrap cursor-pointer">
                    Previous Due:
                  </Label>
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">৳</span>
                    <Input
                      id="prevDue"
                      type="number"
                      value={prevDue || ''}
                      onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="h-9 pl-7 pr-3 text-right font-semibold text-sm bg-background border-slate-200 focus-visible:ring-primary"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary">
                  <span>Grand Total:</span>
                  <span>৳{gTotal.toLocaleString()}</span>
                </div>

                {/* Interactive Cash-in Row */}
                <div className="flex items-center justify-between border-t pt-2.5 gap-3">
                  <Label htmlFor="cashIn" className="font-bold text-green-700 text-sm whitespace-nowrap cursor-pointer">
                    Cash-in:
                  </Label>
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">৳</span>
                    <Input
                      id="cashIn"
                      type="number"
                      value={cashIn || ''}
                      onChange={(e) => setCashIn(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="h-9 pl-7 pr-3 text-right font-bold text-green-700 text-base bg-background border-green-600/40 focus-visible:ring-green-500"
                      min="0"
                    />
                  </div>
                </div>

                {/* Change Return Alert when cashIn > gTotal */}
                {cashIn > gTotal && (
                  <div className="flex items-center justify-between border-t pt-2 font-bold text-base text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800">
                    <span>Change Return (ফেরত):</span>
                    <span className="text-lg font-extrabold text-emerald-700">৳{(cashIn - gTotal).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between border-t pt-2 font-bold text-base text-destructive">
                  <span>Remaining Due:</span>
                  <span>৳{currentBillDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              {!editingBill && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printMode === 'none'}
                      onChange={() => handlePrintModeSelect('none')}
                      className="h-4 w-4 rounded border-slate-300 text-[#ec4899] focus:ring-[#ec4899] accent-[#ec4899] cursor-pointer"
                    />
                    None
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printMode === 'pos'}
                      onChange={() => handlePrintModeSelect('pos')}
                      className="h-4 w-4 rounded border-slate-300 text-[#ec4899] focus:ring-[#ec4899] accent-[#ec4899] cursor-pointer"
                    />
                    Print POS Invoice
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printMode === 'a4'}
                      onChange={() => handlePrintModeSelect('a4')}
                      className="h-4 w-4 rounded border-slate-300 text-[#ec4899] focus:ring-[#ec4899] accent-[#ec4899] cursor-pointer"
                    />
                    Print A4 Invoice
                  </label>
                </div>
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={formLoading} className="font-bold">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingBill ? 'Update Bill' : 'Generate Bill')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
            <div className="border rounded-md max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overflow-x-auto w-full">
              <Table className="min-w-[600px] sm:min-w-0">
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
                      const basePrice = selectedCustomer?.role === 'wholesaler'
                        ? (prod.wholesaleSalePrice || prod.wholesalePrice || prod.salePrice || prod.price)
                        : (prod.salePrice || prod.price);

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
                          <TableCell className="font-medium">
                            <div>{prod.name}</div>
                            {selectedCustomer?.role === 'wholesaler' && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded-sm">
                                Wholesale
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-2 py-1">
                                {prod.variants.map((v: any) => {
                                  const label = [v.color, v.size].filter(Boolean).join(' / ');
                                  const isSelected = selectedProductVariants[prod._id] === v._id;
                                  const vPrice = selectedCustomer?.role === 'wholesaler'
                                    ? (v.wholesaleSalePrice || v.wholesalePrice || v.salePrice || v.price || basePrice)
                                    : (v.salePrice || v.price);
                                  return (
                                    <Button
                                      key={v._id}
                                      type="button"
                                      variant={isSelected ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => toggleProductVariant(prod._id, v._id)}
                                      className="text-xs py-0.5 px-2 h-7"
                                    >
                                      {label} (৳{vPrice})
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Standard Item</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {!hasVariants && `৳${basePrice}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-2">
              <span className="text-sm text-muted-foreground font-medium">{selectedCount} items selected</span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
                <Button type="button" className="flex-1 sm:flex-none bg-primary text-primary-foreground" onClick={handleAddSelectedProducts}>Add Selected</Button>
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
                  Bill Invoice
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2.5 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Details</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold">{selectedBill.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      {selectedBill.clientPhone ? (
                        <a
                          href={getWhatsAppLink(selectedBill.clientPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-green-600 font-semibold inline-flex items-center gap-1"
                          title="Chat on WhatsApp"
                        >
                          <span>{selectedBill.clientPhone}</span>
                          <WhatsAppIcon className="h-3.5 w-3.5 text-green-600" />
                        </a>
                      ) : (
                        <span>{selectedBill.clientPhone}</span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{selectedBill.clientAddress}</span>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2.5 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill Info</p>
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
                        <span className="text-orange-600">Due by: {format(new Date(selectedBill.expectedReceivableDate), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary-foreground" />
                    <span className="text-sm font-bold text-primary-foreground">Order Items</span>
                  </div>
                  <table className="block md:table w-full text-sm">
                    <thead className="hidden md:table-header-group">
                      <tr className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 bg-muted/60 border-b">
                        <th className="font-bold text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                        <th className="font-bold text-left px-4 py-2.5 font-semibold text-muted-foreground">Product / Description</th>
                        <th className="font-bold text-center px-4 py-2.5 font-semibold text-muted-foreground">Qty</th>
                        <th className="font-bold text-right px-4 py-2.5 font-semibold text-muted-foreground">Rate (৳)</th>
                        <th className="font-bold text-right px-4 py-2.5 font-semibold text-muted-foreground">Amount (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0 divide-y">
                      {(selectedBill.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className={`block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 mb-3 md:mb-0 shadow-sm md:shadow-none ${idx % 2 === 0 ? 'bg-white md:bg-background' : 'bg-white md:bg-muted/20'}`}>
                          <td className="block md:table-cell py-1.5 md:py-4 text-left px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                          <td className="block md:table-cell py-1.5 md:py-4 text-left px-4 py-2.5 font-medium">{item.name}</td>
                          <td className="block md:table-cell py-1.5 md:py-4 text-left px-4 py-2.5 text-center">{item.quantity}</td>
                          <td className="block md:table-cell py-1.5 md:py-4 text-left px-4 py-2.5 text-right">{Math.round(item.price).toLocaleString()}</td>
                          <td className="block md:table-cell py-1.5 md:py-4 text-left px-4 py-2.5 text-right font-semibold">{Math.round(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-muted/30 border rounded-lg p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>৳{Math.round(selectedBill.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Charge</span>
                      <span>+ ৳{Math.round(selectedBill.deliveryCharge).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span>+ ৳{Math.round(selectedBill.serviceFee).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount
                        {selectedBill.discountType === 'percentage'
                          ? ` (${selectedBill.discountValue}%)`
                          : ''}
                      </span>
                      <span>- ৳{Math.round(selectedBill.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Bill</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.total || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.prevDue > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Previous Due</span>
                      <span>+ ৳{Math.round(selectedBill.prevDue).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold text-base">Grand Total</span>
                    <span className="font-bold text-base text-primary">৳{Math.round(selectedBill.gTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Cash Received</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.cashIn || 0).toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-2 font-bold text-base ${selectedBill.currentBillDue > 0 ? 'text-destructive' : 'text-green-600'
                    }`}>
                    <span>Remaining Due</span>
                    <span>৳{Math.round(selectedBill.currentBillDue || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 font-bold"
                    onClick={() => generateBillPDF(selectedBill, settings, 'download')}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-bold"
                    onClick={() => generateBillPDF(selectedBill, settings, 'print')}
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print
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

export default function ShowroomBillsPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ShowroomBillsContent />
    </Suspense>
  );
}

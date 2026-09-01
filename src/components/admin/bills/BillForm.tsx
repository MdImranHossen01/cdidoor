'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Search, Loader2, ShoppingBag, Coins, Ticket, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { divisions, bdDivisions, bdLocations } from '@/lib/bd-locations';
import { generateBillPDF } from '@/lib/bill-invoice-generator';

interface BillItemInput {
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  batchNumber?: string;
}

export function BillForm({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  const { t } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || '');
  const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || '');
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
  const [clientDivision, setClientDivision] = useState(initialData?.clientDivision || '');
  const [clientDistrict, setClientDistrict] = useState(initialData?.clientDistrict || '');
  const [clientThana, setClientThana] = useState(initialData?.clientThana || '');
  const [clientArea, setClientArea] = useState(initialData?.clientArea || '');
  const [clientImage, setClientImage] = useState(initialData?.clientImage || '');
  const [areas, setAreas] = useState<any[]>([]);
  const [clientTokens, setClientTokens] = useState<number>(0);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const [billItems, setBillItems] = useState<BillItemInput[]>(
    initialData?.items || [{ name: '', quantity: 1, price: 0, batchNumber: 'auto' }]
  );
  const [deliveryCharge, setDeliveryCharge] = useState<number>(initialData?.deliveryCharge || 0);
  const [serviceFee, setServiceFee] = useState<number>(initialData?.serviceFee || 0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(initialData?.discountType || 'fixed');
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue || 0);
  const [prevDue, setPrevDue] = useState<number>(initialData?.prevDue || 0);
  const [cashIn, setCashIn] = useState<number>(initialData?.cashIn || 0);
  const [expectedReceivableDate, setExpectedReceivableDate] = useState(
    initialData?.expectedReceivableDate ? new Date(initialData.expectedReceivableDate).toISOString().split('T')[0] : ''
  );

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    discountAmount: number;
  } | null>(initialData?.couponCode ? {
    code: initialData.couponCode,
    discountType: 'fixed',
    discountValue: initialData.couponDiscount || 0,
    discountAmount: initialData.couponDiscount || 0,
  } : null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Token adjustment state
  const [useTokens, setUseTokens] = useState<boolean>(initialData?.walletAmountUsed ? true : false);
  const [tokensToUse, setTokensToUse] = useState<number>(initialData?.walletAmountUsed || 0);

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [printMode, setPrintMode] = useState<'none' | 'pos' | 'a4'>('none');
  const [settings, setSettings] = useState<any>(null);

  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('default_bill_print_mode') as 'none' | 'pos' | 'a4';
      if (savedMode === 'none' || savedMode === 'pos' || savedMode === 'a4') {
        setPrintMode(savedMode);
      }
    } catch (e) {}

    return () => {
      if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
      if (phoneTimeoutRef.current) clearTimeout(phoneTimeoutRef.current);
      if (nameAbortControllerRef.current) nameAbortControllerRef.current.abort();
    };
  }, []);

  const handlePrintModeSelect = (mode: 'none' | 'pos' | 'a4') => {
    setPrintMode(mode);
    try {
      localStorage.setItem('default_bill_print_mode', mode);
    } catch (e) {}
  };

  // Customer auto-suggestion state
  const [pastCustomers, setPastCustomers] = useState<{
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    clientEmail: string;
    clientDivision: string;
    clientDistrict: string;
    clientThana: string;
    clientArea: string;
    walletBalance?: number;
    role?: string;
    totalOrders?: number;
    totalSpent?: number;
    totalDue?: number;
  }[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<typeof pastCustomers>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<typeof pastCustomers>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

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

  const fetchPastCustomers = async () => {
    try {
      const res = await fetch('/api/admin/bills?limit=500');
      if (res.ok) {
        const data = await res.json();
        const bills: any[] = data.bills || [];
        const seen = new Set<string>();
        const unique: any[] = [];
        for (const b of bills) {
          const key = `${b.clientName}__${b.clientPhone}`;
          if (b.clientName && b.clientPhone && !seen.has(key)) {
            seen.add(key);
            unique.push({
              clientName: b.clientName,
              clientPhone: b.clientPhone,
              clientAddress: b.clientAddress || '',
              clientEmail: b.clientEmail || '',
              clientDivision: b.clientDivision || '',
              clientDistrict: b.clientDistrict || '',
              clientThana: b.clientThana || '',
              clientArea: b.clientArea || '',
              walletBalance: 0,
            });
          }
        }
        setPastCustomers(unique);
      }
    } catch (err) {
      console.error('Error fetching past customers:', err);
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

  const fetchAreas = async () => {
    try {
      const res = await fetch('/api/admin/areas');
      if (res.ok) {
        const data = await res.json();
        setAreas(data || []);
      }
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPastCustomers();
    fetchSettings();
    fetchAreas();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setShowNameDropdown(false);
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) setShowPhoneDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setClientName(customer.clientName);
    setClientPhone(customer.clientPhone);
    setClientAddress(customer.clientAddress || '');
    setClientEmail(customer.clientEmail || '');
    setClientDivision(customer.clientDivision || '');
    setClientDistrict(customer.clientDistrict || '');
    setClientThana(customer.clientThana || '');
    setClientArea(customer.clientArea || '');
    setClientImage(customer.clientImage || '');
    setClientTokens(customer.walletBalance || 0);
    if (customer.totalDue && customer.totalDue > 0 && prevDue === 0) {
      setPrevDue(customer.totalDue);
    }
    setShowNameDropdown(false);
    setShowPhoneDropdown(false);
  };

  const handleNameChange = (val: string) => {
    setClientName(val);
    setClientTokens(0);
    
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }
    if (nameAbortControllerRef.current) {
      nameAbortControllerRef.current.abort();
    }

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
    setClientTokens(0);
    if (phoneError) validatePhone(val);

    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }

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

  const availableCustomerTokens = selectedCustomer?.walletBalance || 0;
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

      const isWholesaler = selectedCustomer?.role === 'wholesaler';

      if (variantId === null) {
        const itemPrice = isWholesaler
          ? (prod.wholesaleSalePrice || prod.wholesalePrice || prod.salePrice || prod.price || 0)
          : (prod.salePrice || prod.price || 0);
        newItems.push({ productId: prod._id, name: prod.name, price: itemPrice, quantity: 1, batchNumber: 'auto' });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        const itemPrice = isWholesaler
          ? (variant.wholesaleSalePrice || variant.wholesalePrice || variant.salePrice || variant.price || prod.wholesaleSalePrice || prod.wholesalePrice || prod.salePrice || prod.price || 0)
          : (variant.salePrice || variant.price || 0);
        newItems.push({ productId: prod._id, variantId: variant._id, name: label, price: itemPrice, quantity: 1, batchNumber: 'auto' });
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
    if (!clientName.trim()) {
      toast.error('Client name is required');
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

    // Pre-open tabs synchronously to bypass browser pop-up block
    let printTab: Window | null = null;
    if (!initialData) {
      if (printMode === 'pos') {
        printTab = window.open('', '_blank');
        if (printTab) {
          printTab.document.write('<html><head><title>POS Receipt</title></head><body style="font-family: sans-serif; padding: 20px; text-align: center;"><h3>Generating POS Invoice Receipt...</h3></body></html>');
          printTab.document.close();
        }
      }
    }

    try {
      setFormLoading(true);
      const billData = {
        clientName,
        clientPhone,
        clientAddress,
        clientEmail,
        clientDivision,
        clientDistrict,
        clientThana,
        clientArea,
        clientImage,
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

      const url = initialData ? `/api/admin/bills/${initialData._id}` : '/api/admin/bills';
      const method = initialData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${initialData ? 'update' : 'create'} bill`);
      }

      const savedBill = await res.json();

      toast.success(initialData ? 'Bill updated successfully!' : 'Bill generated successfully!');

      if (!initialData && printMode === 'pos' && printTab) {
        // Print POS invoice
        const { printBillPOS } = await import('@/lib/bill-pos-generator');
        await printBillPOS(savedBill, settings, printTab);
      } else if (printTab) {
        printTab.close();
      }

      if (!initialData && printMode === 'a4') {
        // Print A4 Invoice
        await generateBillPDF(savedBill, settings, 'print');
      }

      // Close the tab and maybe refresh parent if possible, but simplest is just redirect
      setTimeout(() => {
        // Fallback if window.close() is blocked, redirect instead
        router.push('/admin/bills');
        window.close();
      }, 1500);

    } catch (error: any) {
      if (printTab) printTab.close();
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="px-[1px] md:px-0">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer Name with auto-suggestion */}
            <div className="space-y-2" ref={nameRef}>
              <div className="flex justify-between items-center">
                <Label htmlFor="clientName" className="text-sm font-semibold">{t("bills.client_name")} <span className="text-destructive">*</span></Label>
              </div>
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

            {/* Customer Phone with auto-suggestion and Add More button */}
            <div className="space-y-2" ref={phoneRef}>
              <Label htmlFor="clientPhone" className="text-sm font-semibold">{t("bills.client_phone")} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2 items-center">
                {clientImage && (
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border border-primary/20 shadow-xs shrink-0 bg-muted flex items-center justify-center">
                    <Image src={clientImage} alt="Client Avatar" width={44} height={44} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative flex-1">
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
                <Button
                  type="button"
                  className="h-11 px-4 text-xs font-bold rounded-lg shrink-0 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowMoreFields(true)}
                >
                  + Add Details
                </Button>
              </div>
              {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
            </div>
          </div>

          <Dialog open={showMoreFields} onOpenChange={setShowMoreFields}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>Customer Additional Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* Profile Photo Uploader */}
                <div className="flex flex-col items-center justify-center pb-2">
                  <ImageUpload
                    aspect="circle"
                    value={clientImage}
                    onUpload={(url) => setClientImage(url)}
                    label="Customer Photo"
                  />
                </div>

                {/* Row 0: Name & Mobile Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div className="space-y-2">
                    <Label htmlFor="dlgClientName" className="text-sm font-semibold">{t("bills.client_name")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="dlgClientName"
                      value={clientName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Rahim Khan"
                      className="h-11 text-base"
                      required
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="dlgClientPhone" className="text-sm font-semibold">{t("bills.client_phone")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="dlgClientPhone"
                      value={clientPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={(e) => validatePhone(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className={`h-11 text-base ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                  </div>
                </div>

                {/* Row 1: Email and Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Email */}
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="e.g. rahim@example.com"
                      className="h-11 text-base"
                    />
                  </div>

                  {/* Customer Street Address */}
                  <div className="space-y-2">
                    <Label htmlFor="clientAddress" className="text-sm font-semibold">{t("bills.client_address")}</Label>
                    <Input
                      id="clientAddress"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="e.g. Nawabpur, Dhaka"
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                {/* Row 2: Location Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Division */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("settings.division")}</Label>
                    <Select
                      value={clientDivision}
                      onValueChange={(val) => {
                        setClientDivision(val || '');
                        setClientDistrict('');
                        setClientThana('');
                        setClientArea('');
                      }}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder={t("settings.select_division") as string} />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions.map((div) => (
                          <SelectItem key={div} value={div}>
                            {div}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* District */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("settings.district")}</Label>
                    <Select
                      disabled={!clientDivision}
                      value={clientDistrict}
                      onValueChange={(val) => {
                        setClientDistrict(val || '');
                        setClientThana('');
                        setClientArea('');
                      }}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder={t("settings.select_district") as string} />
                      </SelectTrigger>
                      <SelectContent>
                        {(bdDivisions[clientDivision] || []).map((dist) => (
                          <SelectItem key={dist} value={dist}>
                            {dist}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Thana */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("settings.thana")}</Label>
                    <Select
                      disabled={!clientDistrict}
                      value={clientThana}
                      onValueChange={(val) => {
                        setClientThana(val || '');
                        setClientArea('');
                      }}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder={t("settings.select_thana") as string} />
                      </SelectTrigger>
                      <SelectContent>
                        {(bdLocations[clientDistrict] || []).map((th) => (
                          <SelectItem key={th} value={th}>
                            {th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Area</Label>
                    <Select
                      disabled={!clientDivision}
                      value={clientArea}
                      onValueChange={(val) => setClientArea(val || '')}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select Area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas
                          .filter((a) => {
                            if (!clientDivision) return false;
                            if (a.division !== clientDivision) return false;
                            if (clientDistrict && a.district && a.district !== clientDistrict) return false;
                            if (clientThana && a.thana && a.thana !== clientThana) return false;
                            return true;
                          })
                          .map((area) => (
                            <SelectItem key={area._id} value={area.name}>
                              {area.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t mt-4">
                <Button type="button" size="lg" className="w-full sm:w-auto font-semibold" onClick={() => setShowMoreFields(false)}>
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bill Items header with Product Selection Button */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <h4 className="font-bold text-sm">{t("bills.bill_items")}</h4>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setProductPickerOpen(true)} className="font-bold">
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("bills.select_products")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold">
                <Plus className="h-3 w-3 mr-1" /> {t("bills.add_custom_item")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {billItems.map((item, index) => (
              <div key={index} className="relative flex flex-col md:flex-row gap-3 items-stretch md:items-center border p-4 md:p-2 rounded-xl bg-card hover:shadow-xs transition-all">
                <div className="flex flex-col md:flex-row gap-2.5 w-full pr-8 md:pr-0">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground md:hidden">Item Description</Label>
                    <Input placeholder={t("bills.item_description") as string} value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="h-10 text-sm" required />
                  </div>
                  {item.productId && (
                    <div className="w-full md:w-[130px] space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground md:hidden">Batch</Label>
                      <Select value={item.batchNumber || 'auto'} onValueChange={(val) => handleItemChange(index, 'batchNumber', val)}>
                        <SelectTrigger className="w-full h-10"><SelectValue placeholder="Batch" /></SelectTrigger>
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
                              <SelectItem key={bIdx} value={b.batchNumber}>{b.batchNumber} (Qty: {b.stock})</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5 items-end md:flex md:items-center md:gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <div className="space-y-1 w-full md:w-20">
                      <Label className="text-xs font-semibold text-muted-foreground md:hidden">Qty</Label>
                      <Input type="number" placeholder={t("bills.qty") as string} value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="h-10 text-sm" min="1" required />
                    </div>
                    <div className="space-y-1 w-full md:w-28">
                      <Label className="text-xs font-semibold text-muted-foreground md:hidden">Rate</Label>
                      <Input type="number" placeholder={t("bills.rate") as string} value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="h-10 text-sm" min="0" required />
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-2 md:relative md:top-auto md:right-auto md:mt-0 flex items-center justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItemRow(index)} className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 rounded-lg md:h-10 md:w-10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Adjustments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t mt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryCharge">{t("bills.delivery_charge")}</Label>
                <Input id="deliveryCharge" type="number" value={deliveryCharge || ''} onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceFee">{t("bills.service_fee")} <span className="text-muted-foreground font-normal text-xs">— Optional</span></Label>
                <Input id="serviceFee" type="number" value={serviceFee || ''} placeholder="0" onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="space-y-2 col-span-1">
                <Label>{t("bills.discount_type")}</Label>
                <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t("bills.fixed")}</SelectItem>
                    <SelectItem value="percentage">{t("bills.percent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t("bills.discount_value")}</Label>
                <Input type="number" value={discountValue || ''} onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} placeholder={discountType === 'percentage' ? '%' : '৳'} />
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
                      id="useTokens"
                      checked={useTokens}
                      onChange={(e) => {
                        setUseTokens(e.target.checked);
                        if (e.target.checked && tokensToUse <= 0) {
                          setTokensToUse(Math.min(availableCustomerTokens, totalBeforeTokens));
                        }
                      }}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <Label htmlFor="useTokens" className="font-bold text-sm cursor-pointer flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
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
                <Label htmlFor="expectedReceivableDate">{t("bills.expected_receivable_date")}</Label>
                <Input id="expectedReceivableDate" type="date" value={expectedReceivableDate} onChange={(e) => setExpectedReceivableDate(e.target.value)} required />
              </div>
            )}
          </div>

          {/* Summary calculations view */}
          <div className="bg-muted/40 p-5 rounded-lg space-y-3 border h-fit text-sm shadow-inner">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <h4 className="font-bold text-base">{t("bills.bill_summary")}</h4>
              <Badge variant={calculatedStatus === 'Paid' ? 'default' : 'destructive'} className={calculatedStatus === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                {calculatedStatus}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>{t("bills.subtotal_label")}:</span>
              <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
            </div>
            {deliveryCharge > 0 && <div className="flex justify-between"><span>{t("bills.delivery_charge_label")}:</span><span>+ ৳{deliveryCharge.toLocaleString()}</span></div>}
            {serviceFee > 0 && <div className="flex justify-between"><span>{t("bills.service_fee_label")}:</span><span>+ ৳{serviceFee.toLocaleString()}</span></div>}
            {manualDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>{t("bills.discount")} {discountType === 'percentage' && `(${discountValue}%)`}:</span>
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
            <div className="flex justify-between border-t pt-2 font-bold text-base"><span>{t("bills.total_bill_label")}:</span><span>৳{total.toLocaleString()}</span></div>
            
            {/* Interactive Previous Due Input Row */}
            <div className="flex items-center justify-between border-t pt-2.5 gap-3">
              <Label htmlFor="prevDue" className="font-semibold text-muted-foreground text-sm whitespace-nowrap cursor-pointer">
                {t("bills.previous_due_label") || "Previous Due"}:
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

            <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary"><span>{t("bills.grand_total_label")}:</span><span>৳{gTotal.toLocaleString()}</span></div>
            
            {/* Interactive Cash-in (Paid) Input Row */}
            <div className="flex items-center justify-between border-t pt-2.5 gap-3">
              <Label htmlFor="cashIn" className="font-bold text-green-700 text-sm whitespace-nowrap cursor-pointer">
                {t("bills.cash_in_label") || "Cash-in"}:
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
              <span>{t("bills.remaining_due_label")}:</span>
              <span>৳{currentBillDue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t">
          {!initialData && (
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
          <div className="flex gap-3 sm:ml-auto">
            <Button type="button" variant="outline" className="min-w-24" onClick={() => { window.close(); setTimeout(() => router.push('/admin/bills'), 500); }}>{t("bills.cancel")}</Button>
            <Button type="submit" disabled={formLoading} className="font-bold min-w-32">
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialData ? t("bills.update_bill_button") : t("bills.generate_bill_button"))}
            </Button>
          </div>
        </div>
      </form>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{t("bills.select_products")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-8" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} />
            </div>
            <div className="border rounded-md max-h-[50vh] sm:max-h-[60vh] overflow-y-auto overflow-x-auto w-full">
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
                  {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map((prod) => {
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    return (
                      <TableRow key={prod._id}>
                        <TableCell>
                          {!hasVariants && <Checkbox checked={selectedProductVariants[prod._id] === null} onCheckedChange={() => toggleProductVariant(prod._id, null)} />}
                        </TableCell>
                        <TableCell className="font-medium">{prod.name}</TableCell>
                        <TableCell>
                          {hasVariants ? (
                            <div className="flex flex-wrap gap-2 py-1">
                              {prod.variants.map((v: any) => {
                                const label = [v.color, v.size].filter(Boolean).join(' / ');
                                const isSelected = selectedProductVariants[prod._id] === v._id;
                                return (
                                  <Button key={v._id} type="button" variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleProductVariant(prod._id, v._id)} className="text-xs py-0.5 px-2 h-7">
                                    {label} (৳{v.salePrice || v.price})
                                  </Button>
                                );
                              })}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Standard Item</span>}
                        </TableCell>
                        <TableCell className="text-right">{!hasVariants && `৳${prod.salePrice || prod.price}`}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-2">
              <span className="text-sm text-muted-foreground font-medium">{Object.keys(selectedProductVariants).length} {t("chalans.items_selected")}</span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setProductPickerOpen(false)}>{t("bills.cancel")}</Button>
                <Button type="button" className="flex-1 sm:flex-none" onClick={handleAddSelectedProducts}>{t("chalans.add_selected")}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

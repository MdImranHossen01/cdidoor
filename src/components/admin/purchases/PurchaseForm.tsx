'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  Building2, 
  Phone, 
  X, 
  Menu, 
  Calendar as CalendarIcon, 
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { generateBillPDF } from '@/lib/bill-invoice-generator';

interface PurchaseItemInput {
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  itemDiscount?: number;
  unit?: string;
  partNo?: string;
  batchNumber?: string;
}

export function PurchaseForm({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  const { t } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Supplier details
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierName, setSupplierName] = useState(initialData?.supplier?.name || initialData?.supplierName || '');
  const [supplierPhone, setSupplierPhone] = useState(initialData?.supplier?.phone || initialData?.supplierPhone || '');
  const [supplierCompany, setSupplierCompany] = useState(initialData?.supplier?.companyName || '');
  const [supplierAddress, setSupplierAddress] = useState(initialData?.supplier?.address || '');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Supplier Autocomplete
  const [supplierSuggestions, setSupplierSuggestions] = useState<any[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Header options state
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [selectedStaff, setSelectedStaff] = useState<string>(initialData?.staffId || 'none');
  const [purchaseStatus, setPurchaseStatus] = useState<string>(initialData?.status === 'Paid' ? 'final' : (initialData?.purchaseStatus || 'final'));

  // Mobile product live search autocomplete
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState<any[]>([]);
  const [showMobileSearchDropdown, setShowMobileSearchDropdown] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Items
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemInput[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [{ name: '', quantity: 1, price: 0, unit: 'pcs' }]
  );

  // Financial fields
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(initialData?.discountType || 'fixed');
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discount || initialData?.discountValue || 0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(initialData?.deliveryCharge || 0);
  const [serviceFee, setServiceFee] = useState<number>(initialData?.serviceFee || 0);
  const [prevDue, setPrevDue] = useState<number>(initialData?.prevDue || (initialData?.supplier?.currentBalance || 0));
  const [paidAmount, setPaidAmount] = useState<number>(initialData?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'MFS' | 'Credit'>(initialData?.paymentMethod || 'Cash');
  const [paymentAccountId, setPaymentAccountId] = useState<string>(initialData?.paymentAccountId || '');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<string>(
    initialData?.expectedPaymentDate ? new Date(initialData.expectedPaymentDate).toISOString().split('T')[0] : ''
  );

  // Product Selection Modal
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});

  // Print Mode
  const [printMode, setPrintMode] = useState<'none' | 'pos' | 'a4'>('none');

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('default_purchase_print_mode') as 'none' | 'pos' | 'a4';
      if (savedMode === 'none' || savedMode === 'pos' || savedMode === 'a4') {
        setPrintMode(savedMode);
      }
    } catch (e) {}

    const fetchData = async () => {
      try {
        const [prodRes, supRes, empRes, accRes, setRes] = await Promise.all([
          fetch('/api/products?limit=500'),
          fetch('/api/admin/suppliers'),
          fetch('/api/admin/employees'),
          fetch('/api/accounts'),
          fetch('/api/settings')
        ]);

        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data.products || (Array.isArray(data) ? data : []));
        }
        if (supRes.ok) {
          const data = await supRes.json();
          const supList = data.suppliers || (Array.isArray(data) ? data : []);
          setSuppliers(supList);
          if (initialData?.supplier) {
            const found = supList.find((s: any) => s._id === (initialData.supplier._id || initialData.supplier));
            if (found) {
              setSelectedSupplier(found);
              setPrevDue(found.currentBalance || 0);
            }
          }
        }
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployees(data.employees || (Array.isArray(data) ? data : []));
        }
        if (accRes.ok) {
          const data = await accRes.json();
          setAccounts(data.accounts || (Array.isArray(data) ? data : []));
        }
        if (setRes.ok) {
          const data = await setRes.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Error loading purchase dependencies:', err);
      }
    };

    fetchData();
  }, [initialData]);

  // Click outside listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowMobileSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Supplier search autocomplete
  const handleSupplierSearch = (val: string) => {
    setSupplierName(val);
    if (!val.trim()) {
      setSupplierSuggestions([]);
      setShowSupplierDropdown(false);
      setSelectedSupplier(null);
      return;
    }
    const filtered = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(val.toLowerCase()) ||
        s.phone?.includes(val) ||
        s.companyName?.toLowerCase().includes(val.toLowerCase())
    );
    setSupplierSuggestions(filtered);
    setShowSupplierDropdown(filtered.length > 0);
  };

  const handleSelectSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone || '');
    setSupplierCompany(supplier.companyName || '');
    setSupplierAddress(supplier.address || '');
    setPrevDue(supplier.currentBalance || 0);
    setShowSupplierDropdown(false);
  };

  // Add new supplier inline
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !newSupplierPhone.trim()) {
      toast.error('নাম এবং ফোন নম্বর আবশ্যক');
      return;
    }
    try {
      setSavingSupplier(true);
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          companyName: newSupplierCompany,
          phone: newSupplierPhone,
          address: newSupplierAddress
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create supplier');
      }

      const created = await res.json();
      setSuppliers(prev => [created, ...prev]);
      handleSelectSupplier(created);
      setShowSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierCompany('');
      setNewSupplierPhone('');
      setNewSupplierAddress('');
      toast.success('সাপ্লায়ার সফলভাবে যোগ করা হয়েছে');
    } catch (err: any) {
      toast.error(err.message || 'সাপ্লায়ার তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Mobile product live search
  const handleMobileProductSearch = (query: string) => {
    setMobileSearchQuery(query);
    if (!query.trim()) {
      setMobileSearchResults([]);
      setShowMobileSearchDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    const results: any[] = [];
    products.forEach((p) => {
      const pPurchasePrice = p.purchasePrice || p.buyingPrice || p.price || 0;
      if (p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.partNo && p.partNo.toLowerCase().includes(q))) {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            const vLabel = [v.color, v.size].filter(Boolean).join(' / ') || 'Variant';
            const vPurchasePrice = v.purchasePrice || v.buyingPrice || pPurchasePrice;
            results.push({
              productId: p._id,
              variantId: v._id,
              displayName: `${p.name} - ${vLabel}`,
              name: `${p.name} (${vLabel})`,
              price: vPurchasePrice,
              stock: v.stock ?? p.stock ?? 0,
              unit: p.unit || 'pcs',
              partNo: p.partNo || '0'
            });
          });
        } else {
          results.push({
            productId: p._id,
            displayName: p.name,
            name: p.name,
            price: pPurchasePrice,
            stock: p.stock ?? 0,
            unit: p.unit || 'pcs',
            partNo: p.partNo || '0'
          });
        }
      }
    });
    setMobileSearchResults(results.slice(0, 15));
    setShowMobileSearchDropdown(results.length > 0);
  };

  const handleSelectSearchedProduct = (res: any) => {
    const existingIndex = purchaseItems.findIndex(
      (item) => item.productId === res.productId && (!res.variantId || item.variantId === res.variantId)
    );
    if (existingIndex > -1) {
      const updated = [...purchaseItems];
      updated[existingIndex].quantity += 1;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems(prev => [
        ...prev.filter(i => i.name.trim() !== ''),
        {
          productId: res.productId,
          variantId: res.variantId,
          name: res.name,
          quantity: 1,
          price: res.price,
          unit: res.unit || 'pcs',
          partNo: res.partNo || '0'
        }
      ]);
    }
    setMobileSearchQuery('');
    setShowMobileSearchDropdown(false);
  };

  const handleAddItemRow = () => {
    setPurchaseItems(prev => [...prev, { name: '', quantity: 1, price: 0, unit: 'pcs' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: any) => {
    const updated = [...purchaseItems];
    if (field === 'quantity') {
      updated[index][field] = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price' || field === 'itemDiscount') {
      updated[index][field] = Math.max(0, parseFloat(value) || 0);
    } else {
      (updated[index] as any)[field] = value;
    }
    setPurchaseItems(updated);
  };

  // Product Selection Modal Toggle
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
    const newItems: PurchaseItemInput[] = [];
    Object.entries(selectedProductVariants).forEach(([productId, variantId]) => {
      const prod = products.find(p => p._id === productId);
      if (!prod) return;
      const prodPurchasePrice = prod.purchasePrice || prod.buyingPrice || prod.price || 0;
      if (variantId) {
        const variant = prod.variants?.find((v: any) => v._id === variantId);
        const vLabel = variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : '';
        const vPrice = variant?.purchasePrice || variant?.buyingPrice || prodPurchasePrice;
        newItems.push({
          productId: prod._id,
          variantId: variantId,
          name: `${prod.name}${vLabel ? ` (${vLabel})` : ''}`,
          quantity: 1,
          price: vPrice,
          unit: prod.unit || 'pcs',
          partNo: prod.partNo || '0'
        });
      } else {
        newItems.push({
          productId: prod._id,
          name: prod.name,
          quantity: 1,
          price: prodPurchasePrice,
          unit: prod.unit || 'pcs',
          partNo: prod.partNo || '0'
        });
      }
    });

    if (newItems.length > 0) {
      setPurchaseItems(prev => [
        ...prev.filter(i => i.name.trim() !== ''),
        ...newItems
      ]);
    }
    setSelectedProductVariants({});
    setProductPickerOpen(false);
  };

  // Financial Calculations
  const rawSubtotal = purchaseItems.reduce((acc, item) => {
    const itemTotal = (item.price * item.quantity) - (item.itemDiscount || 0);
    return acc + Math.max(0, itemTotal);
  }, 0);
  const subtotal = Math.max(0, rawSubtotal);

  const calculatedDiscount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;
  const totalDiscount = Math.min(subtotal, calculatedDiscount);

  const billTotal = Math.max(0, subtotal - totalDiscount + deliveryCharge + serviceFee);
  const grandTotal = Math.max(0, billTotal + prevDue);
  const remainingDue = Math.max(0, grandTotal - paidAmount);
  const calculatedStatus = remainingDue <= 0 ? 'Paid' : 'Due';

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetSupplierId = selectedSupplier?._id;
    if (!targetSupplierId) {
      const matched = suppliers.find(
        s => (supplierPhone && s.phone === supplierPhone) || s.name.toLowerCase() === supplierName.trim().toLowerCase()
      );
      if (matched) {
        targetSupplierId = matched._id;
      }
    }

    if (!targetSupplierId && !supplierName.trim()) {
      toast.error('সাপ্লায়ার সিলেক্ট করুন অথবা নাম লিখুন');
      return;
    }

    const validItems = purchaseItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('কমপক্ষে একটি পণ্যের বিবরণ আবশ্যক');
      return;
    }

    // Auto-create supplier if doesn't exist
    if (!targetSupplierId) {
      try {
        setFormLoading(true);
        const supRes = await fetch('/api/admin/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: supplierName.trim(),
            companyName: supplierCompany,
            phone: supplierPhone.trim() || '01700000000',
            address: supplierAddress
          })
        });
        if (supRes.ok) {
          const newSup = await supRes.json();
          targetSupplierId = newSup._id;
        }
      } catch (err) {
        console.error('Error auto-creating supplier:', err);
      }
    }

    let printTab: Window | null = null;
    if (!initialData && printMode === 'pos') {
      printTab = window.open('', '_blank');
      if (printTab) {
        printTab.document.write('<html><head><title>Purchase Receipt</title></head><body style="font-family: sans-serif; padding: 20px; text-align: center;"><h3>Generating Purchase Receipt...</h3></body></html>');
        printTab.document.close();
      }
    }

    try {
      setFormLoading(true);
      const payload = {
        supplierId: targetSupplierId,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        date: purchaseDate,
        staffId: selectedStaff !== 'none' ? selectedStaff : undefined,
        purchaseStatus,
        items: validItems,
        subtotal,
        discount: totalDiscount,
        discountType,
        discountValue,
        deliveryCharge,
        serviceFee,
        prevDue,
        total: billTotal,
        paidAmount,
        paymentMethod,
        paymentAccountId: paymentAccountId || undefined,
        expectedPaymentDate: calculatedStatus === 'Due' ? expectedPaymentDate : undefined
      };

      const url = initialData ? `/api/admin/supplier-bills/${initialData._id}` : '/api/admin/supplier-bills';
      const method = initialData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save purchase bill');
      }

      const savedBill = await res.json();
      toast.success(initialData ? 'ক্রয় রশিদ সফলভাবে আপডেট হয়েছে!' : 'ক্রয় রশিদ সফলভাবে তৈরি হয়েছে!');

      if (!initialData && printMode === 'pos' && printTab) {
        const { printBillPOS } = await import('@/lib/bill-pos-generator');
        await printBillPOS(savedBill, settings, printTab);
      } else if (printTab) {
        printTab.close();
      }

      if (!initialData && printMode === 'a4') {
        await generateBillPDF(savedBill, settings, 'print');
      }

      setTimeout(() => {
        router.push('/admin/supplier-bills');
      }, 1000);
    } catch (error: any) {
      if (printTab) printTab.close();
      toast.error(error.message || 'ক্রয় সংরক্ষণ করতে ত্রুটি হয়েছে');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="w-full pb-24 md:pb-6 font-sans">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        
        {/* ======================================================== */}
        {/* MOBILE VIEW (DSB POS Reference Layout for Purchases) */}
        {/* ======================================================== */}
        <div className="md:hidden space-y-3 px-1">
          {/* ROW 1, 2, 3: Header Controls with 2px Gap */}
          <div className="space-y-[2px]">
            {/* ROW 1: Supplier (with teal +) & Date Picker */}
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <div className="col-span-7 relative" ref={supplierRef}>
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <Input
                      value={supplierName ? `${supplierName}${supplierPhone ? ` (${supplierPhone})` : ''}` : ''}
                      onChange={(e) => handleSupplierSearch(e.target.value)}
                      onFocus={() => { if (supplierSuggestions.length > 0) setShowSupplierDropdown(true); }}
                      placeholder="সার্চ সাপ্লায়ার"
                      className="h-10 text-xs font-medium border-slate-300 rounded-md bg-white dark:bg-slate-950"
                    />
                    {showSupplierDropdown && supplierSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {supplierSuggestions.map((s, i) => (
                          <div
                            key={i}
                            className="flex flex-col px-3 py-2 border-b border-border/40 last:border-none cursor-pointer hover:bg-muted transition-colors text-left"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectSupplier(s); }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">{s.name}</span>
                              {s.companyName && (
                                <span className="text-[10px] text-muted-foreground">{s.companyName}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">{s.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="h-10 w-10 shrink-0 p-0 bg-[#009688] hover:bg-[#00796b] text-white rounded-md shadow-xs"
                    title="নতুন সাপ্লায়ার যোগ করুন"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Date Selector */}
              <div className="col-span-5 relative">
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-10 text-xs font-semibold border-slate-300 rounded-md bg-white dark:bg-slate-950 pl-2 pr-1"
                />
              </div>
            </div>

            {/* ROW 2: Staff Select (50% width), Status (50% width) */}
            <div className="grid grid-cols-12 gap-1.5">
              <div className="col-span-6">
                <Select value={selectedStaff} onValueChange={(val: any) => setSelectedStaff(val || 'none')}>
                  <SelectTrigger className="w-full h-10 text-xs font-semibold border-slate-300 bg-white dark:bg-slate-950 rounded-md px-2.5 shadow-xs">
                    <SelectValue placeholder="স্টাফ সিলেক্ট" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">স্টাফ: কোনোটি নয়</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-6">
                <Select value={purchaseStatus} onValueChange={(val: any) => setPurchaseStatus(val || 'final')}>
                  <SelectTrigger className="w-full h-10 text-xs font-semibold border-slate-300 bg-white dark:bg-slate-950 rounded-md px-2.5 shadow-xs capitalize">
                    <SelectValue placeholder="ফাইনাল" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="final">ফাইনাল</SelectItem>
                    <SelectItem value="pending">পেন্ডিং</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 3: Barcode / Product Search Bar */}
            <div className="relative" ref={mobileSearchRef}>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    value={mobileSearchQuery}
                    onChange={(e) => handleMobileProductSearch(e.target.value)}
                    placeholder="বারকোড / নাম দিয়ে আইটেম সার্চ করুন"
                    className="h-10 text-xs pl-3 pr-3 border-slate-300 rounded-md bg-white dark:bg-slate-950 shadow-xs"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => setProductPickerOpen(true)}
                  className="h-10 w-10 shrink-0 p-0 bg-[#009688] hover:bg-[#00796b] text-white rounded-md shadow-xs"
                  title="পণ্য তালিকা"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  onClick={handleAddItemRow}
                  className="h-10 w-10 shrink-0 p-0 bg-[#007bff] hover:bg-[#0069d9] text-white rounded-md shadow-xs"
                  title="কাস্টম আইটেম যোগ করুন"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Live Search Autocomplete */}
              {showMobileSearchDropdown && mobileSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {mobileSearchResults.map((res, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-3 py-2.5 border-b border-border/50 cursor-pointer hover:bg-muted transition-colors text-left"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectSearchedProduct(res); }}
                    >
                      <div>
                        <p className="font-semibold text-xs text-foreground leading-tight">{res.displayName}</p>
                        <p className="text-[10px] text-muted-foreground">বর্তমান স্টক: {res.stock} {res.unit}</p>
                      </div>
                      <span className="font-bold text-xs text-[#009688]">৳{res.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MOBILE ROW 4: Selected Items List */}
          <div className="space-y-2.5 pt-1">
            {purchaseItems.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center bg-slate-50 dark:bg-slate-900/30">
                <p className="text-xs text-muted-foreground">কোনো পণ্য যোগ করা হয়নি। উপরের সার্চ বার দিয়ে পণ্য যোগ করুন।</p>
              </div>
            ) : (
              purchaseItems.map((item, index) => {
                const itemSubtotal = Math.max(0, (item.price * item.quantity) - (item.itemDiscount || 0));
                return (
                  <div 
                    key={index}
                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-1.5 gap-2">
                      <div className="flex-1 min-w-0">
                        {!item.productId ? (
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="কাস্টম পণ্যের বিবরণ / নাম লিখুন *"
                            className="h-8 text-xs font-bold text-[#007bff] bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 focus-visible:ring-blue-400 placeholder:text-blue-300"
                            required
                          />
                        ) : (
                          <div className="font-semibold text-xs leading-tight truncate">
                            <span className="text-[#007bff] font-bold">{item.name}</span>
                            <span className="text-red-500 text-[11px] ml-1.5">| পার্ট নং: {item.partNo || '0'}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="text-red-500 hover:text-red-700 p-1 shrink-0 rounded hover:bg-red-50"
                        title="রিমুভ"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 items-end text-center">
                      <div className="space-y-0.5 text-left">
                        <Label className="text-[10px] text-muted-foreground font-medium block">ক্রয় মূল্য</Label>
                        <Input
                          type="number"
                          value={item.price || ''}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="h-8 text-xs font-semibold px-1.5 text-center border-slate-300 rounded"
                          min="0"
                        />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <Label className="text-[10px] text-muted-foreground font-medium block truncate">পরিমাণ: {item.unit || 'pcs'}</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="h-8 text-xs font-semibold px-1.5 text-center border-slate-300 rounded"
                          min="1"
                        />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <Label className="text-[10px] text-muted-foreground font-medium block">ডিসকাউন্ট</Label>
                        <Input
                          type="number"
                          value={item.itemDiscount || ''}
                          placeholder="0"
                          onChange={(e) => handleItemChange(index, 'itemDiscount', e.target.value)}
                          className="h-8 text-xs font-semibold px-1.5 text-center border-slate-300 rounded"
                          min="0"
                        />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <Label className="text-[10px] text-muted-foreground font-medium block">সাব টোটাল</Label>
                        <Input
                          type="text"
                          readOnly
                          value={itemSubtotal.toLocaleString()}
                          className="h-8 text-xs font-bold px-1.5 text-center bg-slate-100 dark:bg-slate-900 border-slate-200 rounded text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* MOBILE TOTALS, DISCOUNTS & CALCULATION SUMMARY */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2 text-sm">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm pb-1">
                মোট আইটেম: <span className="font-extrabold text-slate-950 dark:text-white">{purchaseItems.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">মোট (TK.)</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-200">ডিসকাউন্ট (TK.)</span>
                <div className="flex items-center gap-1.5 w-36">
                  <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                    <SelectTrigger className="h-8 w-14 text-[10px] px-1 font-semibold border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">৳</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="h-8 text-right font-semibold text-sm border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-200">ডেলিভারী চার্জ (TK.)</span>
                <Input
                  type="number"
                  value={deliveryCharge || ''}
                  onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="h-8 w-36 text-right font-semibold text-sm border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">অন্যান্য ফি (TK.)</span>
                <Input
                  type="number"
                  value={serviceFee || ''}
                  onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="h-8 w-36 text-right font-semibold text-xs border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">পূর্বের বাকি (TK.)</span>
                <Input
                  type="number"
                  value={prevDue || ''}
                  onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="h-8 w-36 text-right font-semibold text-xs border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="font-bold text-slate-800 dark:text-slate-100">পেয়াবল (TK.)</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-800 dark:text-slate-100">পেইড এমাউন্ট (TK.)</span>
                <Input
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="h-8 w-36 text-right font-bold text-green-700 text-sm border-green-600/40 rounded focus-visible:ring-green-500"
                />
              </div>

              {/* Payment Account Selection when Paid Amount > 0 */}
              {paidAmount > 0 && (
                <div className="space-y-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">পেমেন্ট মেথড:</span>
                    <Select value={paymentMethod} onValueChange={(val: any) => { setPaymentMethod(val); setPaymentAccountId(''); }}>
                      <SelectTrigger className="h-8 w-36 text-xs font-semibold bg-white dark:bg-slate-950 border-emerald-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">ক্যাশ (Cash)</SelectItem>
                        <SelectItem value="Bank">ব্যাংক (Bank)</SelectItem>
                        <SelectItem value="MFS">এমএফএস (bKash/Nagad)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(paymentMethod === 'Bank' || paymentMethod === 'MFS') && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">অ্যাকাউন্ট সিলেক্ট *:</span>
                      <Select value={paymentAccountId} onValueChange={(val: any) => setPaymentAccountId(val)}>
                        <SelectTrigger className="h-8 w-44 text-xs font-semibold bg-white dark:bg-slate-950 border-emerald-300">
                          <SelectValue placeholder="অ্যাকাউন্ট সিলেক্ট করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter(a => paymentMethod === 'Bank' ? a.accountCategory === 'Bank' : a.accountCategory === 'MFS')
                            .map((acc) => (
                              <SelectItem key={acc._id} value={acc._id}>
                                {acc.name} ({acc.accountNo || acc.mfsProvider || acc.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-destructive font-bold">
                <span>বকেয়া (Due TK.)</span>
                <span className="text-base font-extrabold">
                  {remainingDue.toLocaleString()}
                </span>
              </div>

              {calculatedStatus === 'Due' && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">সম্ভাব্য পরিশোধের তারিখ:</span>
                  <Input
                    type="date"
                    value={expectedPaymentDate}
                    onChange={(e) => setExpectedPaymentDate(e.target.value)}
                    className="h-8 w-36 text-xs font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP VIEW (Full Desktop Interface) */}
        {/* ======================================================== */}
        <div className="hidden md:block space-y-6">
          {/* Supplier Details Card */}
          <div className="relative space-y-4 bg-gray-50/50 p-4 sm:p-5 rounded-2xl border border-gray-100/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Supplier Details</h3>
              {selectedSupplier && (
                <div className="flex flex-wrap items-center gap-2 bg-white/95 border border-primary/25 rounded-xl px-3 py-1.5 shadow-xs text-xs">
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2 py-0.5 text-[11px]">
                    {selectedSupplier.companyName || 'Supplier'}
                  </Badge>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1 font-semibold text-red-600">
                    <span>Due Balance: <strong className="font-bold">৳{(selectedSupplier.currentBalance || 0).toLocaleString()}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2" ref={supplierRef}>
                <Label className="text-sm font-semibold">সাপ্লায়ার নাম / প্রতিষ্ঠান <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    value={supplierName}
                    onChange={(e) => handleSupplierSearch(e.target.value)}
                    onFocus={() => { if (supplierSuggestions.length > 0) setShowSupplierDropdown(true); }}
                    placeholder="সাপ্লায়ার সার্চ করুন..."
                    className="h-11 text-base"
                    required
                  />
                  {showSupplierDropdown && supplierSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {supplierSuggestions.map((s, i) => (
                        <div
                          key={i}
                          className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-left"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectSupplier(s); }}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-sm text-foreground">{s.name}</span>
                            {s.companyName && <span className="text-xs text-muted-foreground">{s.companyName}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{s.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">সাপ্লায়ার ফোন নম্বর</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="01712345678"
                    className="h-11 text-base"
                  />
                  <Button
                    type="button"
                    className="h-11 px-4 text-xs font-bold rounded-lg shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setShowSupplierModal(true)}
                  >
                    + নতুন সাপ্লায়ার
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Items Desktop */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h4 className="font-bold text-sm">ক্রয়কৃত আইটেম সমূহ</h4>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setProductPickerOpen(true)} className="font-bold">
                  <Plus className="mr-1 h-3.5 w-3.5" /> পণ্য তালিকা থেকে সিলেক্ট করুন
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold">
                  <Plus className="h-3 w-3 mr-1" /> কাস্টম আইটেম যোগ করুন
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {purchaseItems.map((item, index) => (
                <div key={index} className="relative flex flex-col md:flex-row gap-3 items-stretch md:items-center border p-4 md:p-2 rounded-xl bg-card hover:shadow-xs transition-all">
                  <div className="flex flex-col md:flex-row gap-2.5 w-full pr-8 md:pr-0">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground md:hidden">Item Description</Label>
                      <Input placeholder="পণ্যের বিবরণ / নাম" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="h-10 text-sm" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 items-end md:flex md:items-center md:gap-2 w-full md:w-auto mt-1 md:mt-0">
                      <div className="space-y-1 w-full md:w-24">
                        <Label className="text-xs font-semibold text-muted-foreground md:hidden">পরিমাণ</Label>
                        <Input type="number" placeholder="পরিমাণ" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="h-10 text-sm text-center" min="1" required />
                      </div>
                      <div className="space-y-1 w-full md:w-32">
                        <Label className="text-xs font-semibold text-muted-foreground md:hidden">ক্রয় মূল্য</Label>
                        <Input type="number" placeholder="ক্রয় মূল্য" value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="h-10 text-sm text-right" min="0" required />
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

          {/* Desktop Summary Calculations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ডেলিভারী চার্জ (TK.)</Label>
                  <Input type="number" value={deliveryCharge || ''} onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>অন্যান্য চার্জ (TK.)</Label>
                  <Input type="number" value={serviceFee || ''} placeholder="0" onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-2 col-span-1">
                  <Label>ডিসকাউন্ট টাইপ</Label>
                  <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">ফিক্সড (৳)</SelectItem>
                      <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>ডিসকাউন্ট</Label>
                  <Input type="number" value={discountValue || ''} onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} placeholder={discountType === 'percentage' ? '%' : '৳'} />
                </div>
              </div>

              {calculatedStatus === 'Due' && (
                <div className="space-y-2 pt-1">
                  <Label>সম্ভাব্য পরিশোধের তারিখ</Label>
                  <Input type="date" value={expectedPaymentDate} onChange={(e) => setExpectedPaymentDate(e.target.value)} />
                </div>
              )}
            </div>

            <div className="bg-muted/40 p-5 rounded-lg space-y-3 border h-fit text-sm shadow-inner">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h4 className="font-bold text-base">ক্রয় সামারি</h4>
                <Badge variant={calculatedStatus === 'Paid' ? 'default' : 'destructive'} className={calculatedStatus === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                  {calculatedStatus === 'Paid' ? 'পেইড' : 'বকেয়া'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>মোট সাব-টোটাল:</span>
                <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>ডিসকাউন্ট:</span>
                  <span>- ৳{totalDiscount.toLocaleString()}</span>
                </div>
              )}
              {deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span>ডেলিভারী চার্জ:</span>
                  <span>+ ৳{deliveryCharge.toLocaleString()}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <span>অন্যান্য ফি:</span>
                  <span>+ ৳{serviceFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>বিল মোট:</span>
                <span>৳{billTotal.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between border-t pt-2.5 gap-3">
                <Label className="font-semibold text-muted-foreground text-sm whitespace-nowrap">পূর্বের বাকি:</Label>
                <div className="relative w-36 sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">৳</span>
                  <Input
                    type="number"
                    value={prevDue || ''}
                    onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="h-9 pl-7 pr-3 text-right font-semibold text-sm bg-background border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary">
                <span>সর্বমোট (Grand Total):</span>
                <span>৳{grandTotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between border-t pt-2.5 gap-3">
                <Label className="font-bold text-green-700 text-sm whitespace-nowrap">পেইড এমাউন্ট (Paid):</Label>
                <div className="relative w-36 sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">৳</span>
                  <Input
                    type="number"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="h-9 pl-7 pr-3 text-right font-bold text-green-700 text-base bg-background border-green-600/40"
                  />
                </div>
              </div>

              {/* Desktop Payment Method & Account Selector */}
              {paidAmount > 0 && (
                <div className="space-y-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">পেমেন্ট মেথড:</Label>
                    <Select value={paymentMethod} onValueChange={(val: any) => { setPaymentMethod(val); setPaymentAccountId(''); }}>
                      <SelectTrigger className="h-9 w-44 text-xs font-semibold bg-white dark:bg-slate-950 border-emerald-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">ক্যাশ (Cash)</SelectItem>
                        <SelectItem value="Bank">ব্যাংক (Bank)</SelectItem>
                        <SelectItem value="MFS">এমএফএস (bKash/Nagad)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(paymentMethod === 'Bank' || paymentMethod === 'MFS') && (
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-emerald-200/60">
                      <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">অ্যাকাউন্ট সিলেক্ট *:</Label>
                      <Select value={paymentAccountId} onValueChange={(val: any) => setPaymentAccountId(val)}>
                        <SelectTrigger className="h-9 w-44 text-xs font-semibold bg-white dark:bg-slate-950 border-emerald-300">
                          <SelectValue placeholder="অ্যাকাউন্ট সিলেক্ট করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter(a => paymentMethod === 'Bank' ? a.accountCategory === 'Bank' : a.accountCategory === 'MFS')
                            .map((acc) => (
                              <SelectItem key={acc._id} value={acc._id}>
                                {acc.name} ({acc.accountNo || acc.mfsProvider || acc.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between border-t pt-2 font-bold text-base text-destructive">
                <span>অবশিষ্ট বকেয়া (Due):</span>
                <span>৳{remainingDue.toLocaleString()}</span>
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
                    onChange={() => setPrintMode('none')}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  None
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printMode === 'pos'}
                    onChange={() => setPrintMode('pos')}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  Print POS
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printMode === 'a4'}
                    onChange={() => setPrintMode('a4')}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  Print A4
                </label>
              </div>
            )}
            <div className="flex gap-3 sm:ml-auto">
              <Button type="button" variant="outline" className="min-w-24" onClick={() => router.push('/admin/supplier-bills')}>
                বাতিল
              </Button>
              <Button type="submit" disabled={formLoading} className="font-bold min-w-32 bg-primary hover:bg-primary/90 text-primary-foreground">
                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialData ? 'আপডেট করুন' : 'ক্রয় সম্পন্ন করুন')}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile View Bottom Actions */}
        <div className="md:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
          {!initialData && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printMode === 'none'}
                  onChange={() => setPrintMode('none')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                None
              </label>
              <label className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printMode === 'pos'}
                  onChange={() => setPrintMode('pos')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                POS রসিদ
              </label>
              <label className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printMode === 'a4'}
                  onChange={() => setPrintMode('a4')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                A4 ইনভয়েস
              </label>
            </div>
          )}
          <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none min-w-24 font-semibold" onClick={() => router.push('/admin/supplier-bills')}>
              বাতিল
            </Button>
            <Button type="submit" disabled={formLoading} className="flex-1 sm:flex-none font-bold min-w-36 bg-primary hover:bg-primary/90 text-primary-foreground">
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialData ? 'আপডেট করুন' : 'ক্রয় সম্পন্ন করুন')}
            </Button>
          </div>
        </div>

      </form>

      {/* Supplier Create Dialog */}
      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>নতুন সাপ্লায়ার যোগ করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>সাপ্লায়ারের নাম <span className="text-destructive">*</span></Label>
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="নাম লিখুন"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>প্রতিষ্ঠানের নাম (Company)</Label>
              <Input
                value={newSupplierCompany}
                onChange={(e) => setNewSupplierCompany(e.target.value)}
                placeholder="কোম্পানি / শপের নাম"
              />
            </div>
            <div className="space-y-2">
              <Label>ফোন নম্বর <span className="text-destructive">*</span></Label>
              <Input
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="01712345678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>ঠিকানা</Label>
              <Input
                value={newSupplierAddress}
                onChange={(e) => setNewSupplierAddress(e.target.value)}
                placeholder="ঠিকানা লিখুন"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowSupplierModal(false)}>
                বাতিল
              </Button>
              <Button type="submit" disabled={savingSupplier} className="bg-primary text-primary-foreground font-bold">
                {savingSupplier ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                সংরক্ষণ করুন
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold">ক্রয়ের জন্য পণ্য নির্বাচন করুন</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col pt-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="পণ্য সার্চ করুন..."
                className="pl-8 h-9 sm:h-10 text-xs sm:text-sm"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[52vh]">
              {products
                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                .map((prod) => {
                  const hasVariants = prod.variants && prod.variants.length > 0;
                  const isMainSelected = selectedProductVariants[prod._id] === null;
                  const itemPrice = prod.purchasePrice || prod.buyingPrice || prod.price || 0;

                  return (
                    <div
                      key={prod._id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isMainSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {!hasVariants && (
                            <Checkbox
                              checked={isMainSelected}
                              onCheckedChange={() => toggleProductVariant(prod._id, null)}
                              className="mt-0.5 h-4 w-4 rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-foreground leading-tight">{prod.name}</p>
                            {prod.partNo && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">পার্ট নং: {prod.partNo}</p>
                            )}
                          </div>
                        </div>

                        {!hasVariants && (
                          <span className="font-bold text-xs text-primary shrink-0">
                            ৳{itemPrice}
                          </span>
                        )}
                      </div>

                      {hasVariants && (
                        <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                          {prod.variants.map((v: any) => {
                            const label = [v.color, v.size].filter(Boolean).join(' / ') || 'Variant';
                            const isSelected = selectedProductVariants[prod._id] === v._id;
                            const vPrice = v.purchasePrice || v.buyingPrice || itemPrice;

                            return (
                              <Button
                                key={v._id}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleProductVariant(prod._id, v._id)}
                                className={`text-[11px] h-7 px-2 font-medium flex items-center gap-1 ${
                                  isSelected ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'border-slate-200 bg-background'
                                }`}
                              >
                                <span>{label}</span>
                                <span className="opacity-90 font-bold">(৳{vPrice})</span>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-md max-h-[50vh] sm:max-h-[58vh] overflow-y-auto overflow-x-auto w-full">
              <Table className="min-w-[600px] sm:min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Options / Variants</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map((prod) => {
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    const prodPrice = prod.purchasePrice || prod.buyingPrice || prod.price || 0;
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
                                const vPrice = v.purchasePrice || v.buyingPrice || prodPrice;
                                return (
                                  <Button key={v._id} type="button" variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleProductVariant(prod._id, v._id)} className="text-xs py-0.5 px-2 h-7">
                                    {label} (৳{vPrice})
                                  </Button>
                                );
                              })}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Standard Item</span>}
                        </TableCell>
                        <TableCell className="text-right">{!hasVariants && `৳${prodPrice}`}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5 pt-3 border-t mt-auto">
              <span className="text-xs sm:text-sm text-muted-foreground font-semibold">
                {Object.keys(selectedProductVariants).length} টি আইটেম নির্বাচিত
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none h-9 text-xs sm:text-sm font-semibold" onClick={() => setProductPickerOpen(false)}>
                  বাতিল
                </Button>
                <Button type="button" className="flex-1 sm:flex-none h-9 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90" onClick={handleAddSelectedProducts}>
                  আইটেম যোগ করুন
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
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
  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || '');
  const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || '');
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

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Customer auto-suggestion state
  const [pastCustomers, setPastCustomers] = useState<{clientName: string; clientPhone: string; clientAddress: string}[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<typeof pastCustomers>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<typeof pastCustomers>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchPastCustomers();
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
        const unique: {clientName: string; clientPhone: string; clientAddress: string}[] = [];
        for (const b of bills) {
          const key = `${b.clientName}__${b.clientPhone}`;
          if (b.clientName && b.clientPhone && !seen.has(key)) {
            seen.add(key);
            unique.push({ clientName: b.clientName, clientPhone: b.clientPhone, clientAddress: b.clientAddress || '' });
          }
        }
        setPastCustomers(unique);
      }
    } catch (err) {
      console.error('Error fetching past customers:', err);
    }
  };

  const handleCustomerSelect = (customer: {clientName: string; clientPhone: string; clientAddress: string}) => {
    setClientName(customer.clientName);
    setClientPhone(customer.clientPhone);
    setClientAddress(customer.clientAddress);
    setShowNameDropdown(false);
    setShowPhoneDropdown(false);
  };

  const handleNameChange = (val: string) => {
    setClientName(val);
    if (val.trim().length > 0) {
      const filtered = pastCustomers.filter(c => c.clientName.toLowerCase().includes(val.toLowerCase()));
      setNameSuggestions(filtered);
      setShowNameDropdown(filtered.length > 0);
    } else {
      setShowNameDropdown(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    setClientPhone(val);
    if (phoneError) validatePhone(val);
    if (val.trim().length > 0) {
      const filtered = pastCustomers.filter(c => c.clientPhone.includes(val));
      setPhoneSuggestions(filtered);
      setShowPhoneDropdown(filtered.length > 0);
    } else {
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

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;
  const total = Math.max(0, subtotal + deliveryCharge + serviceFee - discount);
  const gTotal = total + prevDue;
  const currentBillDue = Math.max(0, gTotal - cashIn);
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

      if (variantId === null) {
        newItems.push({ productId: prod._id, name: prod.name, price: prod.salePrice || prod.price || 0, quantity: 1, batchNumber: 'auto' });
      } else {
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

        toast.success(initialData ? 'Bill updated successfully!' : 'Bill generated successfully!');

      // Close the tab and maybe refresh parent if possible, but simplest is just redirect
      setTimeout(() => {
          // Fallback if window.close() is blocked, redirect instead
          router.push('/admin/bills');
        window.close();
      }, 500);

    } catch (error: any) {
          toast.error(error.message || 'Error saving bill');
    } finally {
          setFormLoading(false);
    }
  };

      return (
    <div className="container px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Customer Name with auto-suggestion */}
          <div className="space-y-2" ref={nameRef}>
            <Label htmlFor="clientName" className="text-sm font-semibold">{t("bills.client_name")}</Label>
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
              {showNameDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {nameSuggestions.map((c, i) => (
                    <div
                      key={i}
                      className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                    >
                      <span className="font-medium text-sm">{c.clientName}</span>
                      <span className="text-xs text-muted-foreground">{c.clientPhone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer Phone with auto-suggestion */}
          <div className="space-y-2" ref={phoneRef}>
            <Label htmlFor="clientPhone" className="text-sm font-semibold">{t("bills.client_phone")}</Label>
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
              {showPhoneDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {phoneSuggestions.map((c, i) => (
                    <div
                      key={i}
                      className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                    >
                      <span className="font-medium text-sm">{c.clientPhone}</span>
                      <span className="text-xs text-muted-foreground">{c.clientName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientAddress" className="text-sm font-semibold">{t("bills.client_address")}</Label>
            <Input id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="e.g. Nawabpur, Dhaka" className="h-11 text-base" required />
          </div>
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
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border p-3 sm:p-1 rounded-md bg-muted/20 sm:bg-transparent">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Input placeholder={t("bills.item_description") as string} value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="flex-1" required />
                  {item.productId && (
                    <Select value={item.batchNumber || 'auto'} onValueChange={(val) => handleItemChange(index, 'batchNumber', val)}>
                      <SelectTrigger className="w-full sm:w-[120px] h-10"><SelectValue placeholder="Batch" /></SelectTrigger>
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
                  )}
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Input type="number" placeholder={t("bills.qty") as string} value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="flex-1 sm:w-20" min="1" required />
                    <Input type="number" placeholder={t("bills.rate") as string} value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className="flex-1 sm:w-28" min="0" required />
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItemRow(index)} className="text-destructive hover:bg-destructive/10 shrink-0 h-10 w-10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                <Label htmlFor="prevDue">{t("bills.previous_due")}</Label>
                <Input id="prevDue" type="number" value={prevDue || ''} onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceFee">{t("bills.service_fee")} <span className="text-muted-foreground font-normal text-xs">— Optional</span></Label>
              <Input id="serviceFee" type="number" value={serviceFee || ''} placeholder="0" onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cashIn">{t("bills.cash_in_label_input")}</Label>
                <Input id="cashIn" type="number" value={cashIn || ''} onChange={(e) => setCashIn(Math.max(0, parseFloat(e.target.value) || 0))} />
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
                <Input id="expectedReceivableDate" type="date" value={expectedReceivableDate} onChange={(e) => setExpectedReceivableDate(e.target.value)} required />
              </div>
            )}
          </div>

          {/* Summary calculations view */}
          <div className="bg-muted/40 p-5 rounded-lg space-y-3 border h-fit text-sm shadow-inner">
            <h4 className="font-bold border-b pb-2 mb-2 text-base">{t("bills.bill_summary")}</h4>
            <div className="flex justify-between">
              <span>{t("bills.subtotal_label")}:</span>
              <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
            </div>
            {deliveryCharge > 0 && <div className="flex justify-between"><span>{t("bills.delivery_charge_label")}:</span><span>+ ৳{deliveryCharge.toLocaleString()}</span></div>}
            {serviceFee > 0 && <div className="flex justify-between"><span>{t("bills.service_fee_label")}:</span><span>+ ৳{serviceFee.toLocaleString()}</span></div>}
            {discount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>{t("bills.discount")} {discountType === 'percentage' && `(${discountValue}%)`}:</span><span>- ৳{discount.toLocaleString()}</span></div>}
            <div className="flex justify-between border-t pt-2 font-bold text-base"><span>{t("bills.total_bill_label")}:</span><span>৳{total.toLocaleString()}</span></div>
            {prevDue > 0 && <div className="flex justify-between text-muted-foreground"><span>{t("bills.previous_due_label")}:</span><span>+ ৳{prevDue.toLocaleString()}</span></div>}
            <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary"><span>{t("bills.grand_total_label")}:</span><span>৳{gTotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-green-700 border-t pt-2"><span>{t("bills.cash_in_label")}:</span><span>৳{cashIn.toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold text-base text-destructive"><span>{t("bills.remaining_due_label")}:</span><span>৳{currentBillDue.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" className="min-w-24" onClick={() => { window.close(); setTimeout(() => router.push('/admin/bills'), 500); }}>{t("bills.cancel")}</Button>
          <Button type="submit" disabled={formLoading} className="font-bold min-w-32">
            {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialData ? t("bills.update_bill_button") : t("bills.generate_bill_button"))}
          </Button>
        </div>
      </form>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Select Products</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-8" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} />
            </div>
            <div className="border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
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
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">{Object.keys(selectedProductVariants).length} products selected</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSelectedProducts}>Add Selected</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

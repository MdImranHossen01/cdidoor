'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewReturnPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [invoiceNo, setInvoiceNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [bill, setBill] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [refundAccount, setRefundAccount] = useState<string>('CASH');
  
  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAccounts(data || []))
      .catch(err => console.error('Failed to load accounts', err));
  }, []);
  
  // State for tracking return quantities and refund
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [customRefund, setCustomRefund] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleInputChange = async (val: string) => {
    setInvoiceNo(val);
    if (val.trim().length >= 2) {
      setLoadingSuggestions(true);
      try {
        const cleanedVal = val.trim();
        const billsPromise = fetch(`/api/admin/bills?search=${cleanedVal}`).then(res => res.ok ? res.json() : []);
        const ordersPromise = fetch(`/api/orders?all=true&search=${cleanedVal}`).then(res => res.ok ? res.json() : ({} as any));

        const [billsData, ordersData] = await Promise.all([billsPromise, ordersPromise]);

        const formattedBills = (billsData || []).slice(0, 5).map((b: any) => ({
          id: b.invoiceNo,
          label: `${b.invoiceNo} (Bill - ${b.clientName})`,
          type: 'bill'
        }));

        const ordersList = (ordersData as any).orders || ordersData || [];
        const formattedOrders = (Array.isArray(ordersList) ? ordersList : []).slice(0, 5).map((o: any) => ({
          id: o.shortId || o._id,
          label: `Order #${o.shortId || (o._id ? o._id.slice(-6) : '')} [${o.status}] (${o.shippingAddress?.fullName || 'Online Order'})`,
          type: 'order',
          status: o.status
        }));

        setSuggestions([...formattedBills, ...formattedOrders]);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      } finally {
        setLoadingSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const searchBill = async (searchNo?: string) => {
    const targetNo = searchNo || invoiceNo;
    if (!targetNo.trim()) {
      toast.error('Please enter an Invoice or Order number');
      return;
    }
    setSearching(true);
    setBill(null);
    setOrder(null);
    try {
      // 1. Try to search client bills
      const billRes = await fetch(`/api/admin/bills?invoiceNo=${targetNo.trim()}`);
      if (billRes.ok) {
        const billData = await billRes.json();
        if (billData && billData.length > 0) {
          const foundBill = billData[0];
          setBill(foundBill);
          const initialReturnItems = foundBill.items.map((item: any) => ({
            ...item,
            returnQty: 0
          }));
          setReturnItems(initialReturnItems);
          toast.success('Client bill found');
          setSearching(false);
          return;
        }
      }

      // 2. Try online orders
      const orderRes = await fetch(`/api/orders?all=true&search=${targetNo.trim()}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const ordersList = orderData.orders || orderData;
        if (ordersList && ordersList.length > 0) {
          const foundOrder = ordersList[0];

          // Check if order is Delivered
          if (foundOrder.status !== 'Delivered') {
            if (foundOrder.status === 'Cancelled') {
              toast.error(`Order #${foundOrder.shortId || foundOrder._id?.slice(-6)} is already Cancelled.`);
            } else {
              toast.error(`Only "Delivered" orders can be returned. Current status is "${foundOrder.status}". For undelivered orders, please cancel the order from the Orders list.`);
            }
            setSearching(false);
            return;
          }

          setOrder(foundOrder);
          const mappedItems = foundOrder.items.map((item: any) => ({
            ...item,
            productId: item.product,
            price: item.price,
            quantity: item.quantity,
            returnQty: 0,
            color: item.color,
            size: item.size
          }));
          setReturnItems(mappedItems);
          toast.success('Delivered online order found');
          setSearching(false);
          return;
        }
      }

      toast.error('No bill or delivered order found with this number');
    } catch (error) {
      toast.error('Error finding invoice');
    } finally {
      setSearching(false);
    }
  };

  const handleQtyChange = (index: number, val: string) => {
    const newItems = [...returnItems];
    const maxQty = newItems[index].quantity;
    
    if (val === '') {
      newItems[index].returnQty = 0;
      setReturnItems(newItems);
      return;
    }

    let qty = parseInt(val);
    if (isNaN(qty) || qty < 0) qty = 0;
    if (qty > maxQty) qty = maxQty;
    
    newItems[index].returnQty = qty;
    setReturnItems(newItems);
  };

  const calculateSuggestedRefund = () => {
    return returnItems.reduce((acc, item) => acc + (item.price * item.returnQty), 0);
  };

  const suggestedRefund = calculateSuggestedRefund();

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
    
    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        billId: bill ? bill._id : undefined,
        orderId: order ? order._id : undefined,
        reason,
        refundAmount: customRefund !== '' ? Number(customRefund) : suggestedRefund,
        refundAccount,
        items: itemsToReturn.map(i => {
          const batchNumber = (i.batchesUsed && i.batchesUsed.length > 0) 
            ? i.batchesUsed[0].batchNumber 
            : undefined;

          return {
            productId: i.productId?._id || i.productId,
            variantId: i.variantId,
            color: i.color,
            size: i.size,
            batchNumber: batchNumber,
            quantity: i.returnQty,
            price: i.price
          }
        })
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to process return');
      }

      toast.success('Return processed successfully!');
      router.push('/admin/returns');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-0 md:gap-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-5xl overflow-x-hidden">
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          {t("sidebar.new_return") || "New Return"}
        </h1>
      </div>

      <div className="flex flex-col gap-4 p-6 border rounded-xl bg-card shadow-sm px-0 md:px-6 !mt-[1px] md:!mt-6">
        <Label className="text-lg">{t("returns.search_title")}</Label>
        <div className="flex gap-2 max-w-md relative">
          <div className="relative flex-1">
            <Input 
              placeholder={t("returns.search_placeholder")} 
              value={invoiceNo}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBill()}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setInvoiceNo(s.id);
                      setShowSuggestions(false);
                      searchBill(s.id);
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground border-b last:border-b-0 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium">{s.label}</span>
                    <Badge variant={s.type === 'bill' ? 'default' : 'secondary'} className="text-xs">
                      {s.type === 'bill' ? 'Bill' : 'Order'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => searchBill()} disabled={searching}>
            {searching ? t("returns.searching") : <><Search className="w-4 h-4 mr-2" /> {t("returns.search_button")}</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          {t("returns.note")}
        </p>
      </div>

      {(bill || order) && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-semibold">{bill ? bill.clientName : order.shippingAddress?.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold">{bill ? bill.clientPhone : order.shippingAddress?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice / Order Date</p>
              <p className="font-semibold">{new Date(bill ? bill.createdAt : order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold text-primary">৳ {(bill ? bill.gTotal : order.totalAmount).toLocaleString()}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-100 dark:bg-slate-800">
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Sold Qty</TableHead>
                  <TableHead className="w-40">Return Qty</TableHead>
                  <TableHead className="text-right">Refund Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.name}
                      {(item.color || item.size) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Variant: {[item.color, item.size].filter(Boolean).join(' / ')}
                        </div>
                      )}
                      {item.batchesUsed && item.batchesUsed.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Batches: {item.batchesUsed.map((b:any)=>b.batchNumber).join(', ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>৳ {item.price}</TableCell>
                    <TableCell><Badge variant="outline">{item.quantity}</Badge></TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="0" 
                        max={item.quantity}
                        placeholder="0"
                        value={item.returnQty === 0 ? '' : item.returnQty}
                        onChange={(e) => handleQtyChange(index, e.target.value)}
                        className="w-24 font-bold text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-500">
                      ৳ {(item.price * item.returnQty).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Return <span className="text-red-500">*</span></Label>
                <Textarea 
                  placeholder="e.g., Damaged product, changed mind..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            
            <div className="space-y-4 p-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-lg border-b pb-2">Refund Summary</h3>
              
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Suggested Refund:</span>
                <span>৳ {suggestedRefund.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center gap-4 pt-2">
                <Label className="whitespace-nowrap font-bold">Final Refund Amount (৳):</Label>
                <Input 
                  type="number" 
                  min="0"
                  placeholder={suggestedRefund.toString()}
                  value={customRefund}
                  onChange={(e) => setCustomRefund(e.target.value)}
                  className="w-32 text-right font-bold text-lg"
                />
              </div>

              <div className="flex justify-between items-center gap-4 pt-2">
                <Label className="whitespace-nowrap font-semibold text-sm">Deduct Account:</Label>
                <select
                  value={refundAccount}
                  onChange={(e: any) => setRefundAccount(e.target.value)}
                  className="h-9 min-w-44 bg-background text-xs border rounded-md px-2 outline-none cursor-pointer font-semibold text-right"
                >
                  {accounts.length === 0 ? (
                    <option value="CASH">Cash Account</option>
                  ) : (
                    accounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.name} (৳{acc.currentBalance?.toLocaleString() || 0})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <p className="text-xs text-muted-foreground">
                This amount will be recorded as a Credit Deduction in the selected Account Ledger.
              </p>

              <Button 
                className="w-full mt-4" 
                size="lg" 
                onClick={handleSubmit}
                disabled={submitting || suggestedRefund === 0}
              >
                {submitting ? 'Processing...' : 'Process Return'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

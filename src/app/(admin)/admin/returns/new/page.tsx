'use client';

import { useState } from 'react';
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
  
  // State for tracking return quantities and refund
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [customRefund, setCustomRefund] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchBill = async () => {
    if (!invoiceNo.trim()) {
      toast.error('Please enter an Invoice Number');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/bills?invoiceNo=${invoiceNo.trim()}`);
      if (!res.ok) throw new Error('Failed to fetch bill');
      const data = await res.json();
      
      if (data && data.length > 0) {
        setBill(data[0]);
        // Initialize return items tracking
        const initialReturnItems = data[0].items.map((item: any) => ({
          ...item,
          returnQty: 0
        }));
        setReturnItems(initialReturnItems);
        toast.success('Bill found');
      } else {
        toast.error('No bill found with this Invoice Number');
        setBill(null);
      }
    } catch (error) {
      toast.error('Error finding bill');
    } finally {
      setSearching(false);
    }
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newItems = [...returnItems];
    const maxQty = newItems[index].quantity;
    
    if (qty < 0) qty = 0;
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
        billId: bill._id,
        reason,
        refundAmount: customRefund !== '' ? Number(customRefund) : suggestedRefund,
        items: itemsToReturn.map(i => {
          // If the bill tracked batches used, try to return to the first batch used. 
          // For multi-batch items, a more complex UI would be needed, but this is a solid default.
          const batchNumber = (i.batchesUsed && i.batchesUsed.length > 0) 
            ? i.batchesUsed[0].batchNumber 
            : undefined;

          return {
            productId: i.productId?._id || i.productId,
            variantId: i.variantId,
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
    <div className="flex flex-col gap-6 pt-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          {t("sidebar.new_return") || "New Return"}
        </h1>
      </div>

      <div className="flex flex-col gap-4 p-6 border rounded-xl bg-card shadow-sm">
        <Label className="text-lg">Search Client Bill</Label>
        <div className="flex gap-2 max-w-md">
          <Input 
            placeholder="Enter Invoice No (e.g., INV-12345)" 
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchBill()}
          />
          <Button onClick={searchBill} disabled={searching}>
            {searching ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Note: Only products sold through a Client Bill can be returned.
        </p>
      </div>

      {bill && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-semibold">{bill.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold">{bill.clientPhone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-semibold">{new Date(bill.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bill Amount</p>
              <p className="font-semibold text-primary">৳ {bill.gTotal.toLocaleString()}</p>
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
                        value={item.returnQty}
                        onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
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

              <p className="text-xs text-muted-foreground">
                This amount will be recorded as a Cash Deduction in the Accounts Ledger.
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

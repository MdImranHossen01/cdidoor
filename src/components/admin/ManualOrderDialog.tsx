/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Trash2, Loader2 } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface StatusOption {
  value: string;
  label: string;
}

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  allowedStatuses?: StatusOption[];
}

const DEFAULT_STATUSES: StatusOption[] = [
  { value: 'Order Placed', label: 'Placed' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Hold', label: 'Hold' },
  { value: 'Ready for Delivery', label: 'Ready' },
  { value: 'Released for Delivery', label: 'Released' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function generateGuestEmail(phone: string) {
  const domain = process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'guest.local';
  return `${phone || Date.now()}@${domain}`;
}

export default function ManualOrderDialog({
  open,
  onOpenChange,
  onCreated,
  allowedStatuses = DEFAULT_STATUSES,
}: ManualOrderDialogProps) {
  const [manualOrderLoading, setManualOrderLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [manualCustomer, setManualCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    division: '',
    zipCode: '',
    country: 'Bangladesh',
  });
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualDeliveryCharge, setManualDeliveryCharge] = useState(120);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('COD');
  const [manualPaymentStatus, setManualPaymentStatus] = useState('Pending');
  const [manualStatus, setManualStatus] = useState(() => {
    if (allowedStatuses && allowedStatuses.length > 0) {
      const exists = allowedStatuses.some(s => s.value === 'Order Placed');
      return exists ? 'Order Placed' : allowedStatuses[0].value;
    }
    return 'Order Placed';
  });
  const [manualInternalNote, setManualInternalNote] = useState('');

  // Debounce product search inside manual order dialog
  useEffect(() => {
    if (!productSearch.trim()) {
      const delayClear = setTimeout(() => {
        setProductSearchResults([]);
      }, 0);
      return () => clearTimeout(delayClear);
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setProductSearchResults(data.products || []);
        }
      } catch (err) {
        console.error('Error searching products:', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [productSearch]);

  // Adjust manualStatus during render if allowedStatuses changes and current status is invalid
  const [prevAllowedStatuses, setPrevAllowedStatuses] = useState(allowedStatuses);
  if (allowedStatuses !== prevAllowedStatuses) {
    setPrevAllowedStatuses(allowedStatuses);
    if (allowedStatuses.length > 0 && !allowedStatuses.some(s => s.value === manualStatus)) {
      setManualStatus(allowedStatuses[0].value);
    }
  }

  const handleAddProductToManualOrder = (product: any) => {
    const colors = Array.from(new Set(product.variants?.map((v: any) => v.color).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(product.variants?.map((v: any) => v.size).filter(Boolean))) as string[];

    let defaultColor = '';
    let defaultSize = '';
    let defaultPrice = product.salePrice || product.price;
    let defaultStock = product.stock || 0;

    if (product.variants && product.variants.length > 0) {
      const defaultVariant = product.variants[0];
      defaultColor = defaultVariant.color || '';
      defaultSize = defaultVariant.size || '';
      defaultPrice = defaultVariant.salePrice || defaultVariant.price || defaultPrice;
      defaultStock = defaultVariant.stock !== undefined ? defaultVariant.stock : defaultStock;
    }

    const existingIndex = manualItems.findIndex(
      (item) =>
        item.product === product._id &&
        item.color === defaultColor &&
        item.size === defaultSize
    );

    if (existingIndex > -1) {
      const updated = [...manualItems];
      if (updated[existingIndex].quantity < defaultStock) {
        updated[existingIndex].quantity += 1;
        setManualItems(updated);
        toast.success(`Incremented quantity for ${product.name}`);
      } else {
        toast.error(`Cannot exceed available stock (${defaultStock})`);
      }
    } else {
      setManualItems((prev) => [
        ...prev,
        {
          product: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          quantity: defaultStock <= 0 ? 0 : 1,
          price: defaultPrice,
          color: defaultColor,
          size: defaultSize,
          stock: defaultStock,
          colorsList: colors,
          sizesList: sizes,
          allVariants: product.variants || [],
        },
      ]);
      toast.success(`Added ${product.name} to order`);
    }

    setProductSearch('');
    setProductSearchResults([]);
  };

  const handleUpdateManualItem = (index: number, fields: Partial<any>) => {
    setManualItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], ...fields };

      if (Object.prototype.hasOwnProperty.call(fields, 'color') || Object.prototype.hasOwnProperty.call(fields, 'size')) {
        const variant = item.allVariants?.find(
          (v: any) =>
            (!item.color || v.color === item.color) &&
            (!item.size || v.size === item.size)
        );
        if (variant) {
          item.price = variant.salePrice || variant.price || item.price;
          item.stock = variant.stock !== undefined ? variant.stock : item.stock;
          if (item.quantity > item.stock) {
            item.quantity = Math.max(0, item.stock);
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualItems.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    setManualOrderLoading(true);
    try {
      const cleanedPhone = normalizePhoneNumber(manualCustomer.phone);

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            ...manualCustomer,
            phone: cleanedPhone || manualCustomer.phone,
            email: manualCustomer.email || generateGuestEmail(cleanedPhone),
          },
          items: manualItems.map((item) => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            color: item.color || undefined,
            size: item.size || undefined,
          })),
          paymentMethod: manualPaymentMethod,
          paymentStatus: manualPaymentStatus,
          status: manualStatus,
          deliveryCharge: Number(manualDeliveryCharge) || 0,
          couponDiscountAmount: Number(manualDiscount) || 0,
          internalNote: manualInternalNote,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Manual order created successfully!');
        onOpenChange(false);
        setManualCustomer({
          fullName: '',
          phone: '',
          email: '',
          street: '',
          city: '',
          state: '',
          division: '',
          zipCode: '',
          country: 'Bangladesh',
        });
        setManualItems([]);
        setManualDeliveryCharge(120);
        setManualDiscount(0);
        setManualPaymentMethod('COD');
        setManualPaymentStatus('Pending');
        setManualStatus(allowedStatuses[0]?.value || 'Order Placed');
        setManualInternalNote('');
        onCreated();
      } else {
        toast.error(data.message || 'Failed to create order');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating manual order');
    } finally {
      setManualOrderLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-logo text-primary">Create Manual Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateManualOrder} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Customer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-1 text-primary">Customer & Delivery Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manualCustName" className="text-xs">Full Name *</Label>
                  <Input
                    id="manualCustName"
                    value={manualCustomer.fullName}
                    onChange={(e) => setManualCustomer((prev) => ({ ...prev, fullName: e.target.value }))}
                    required
                    placeholder="John Doe"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manualCustPhone" className="text-xs">Phone *</Label>
                  <Input
                    id="manualCustPhone"
                    value={manualCustomer.phone}
                    onChange={(e) => setManualCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                    placeholder="01712345678"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="manualCustStreet" className="text-xs">Street Address *</Label>
                <Input
                  id="manualCustStreet"
                  value={manualCustomer.street}
                  onChange={(e) => setManualCustomer((prev) => ({ ...prev, street: e.target.value }))}
                  required
                  placeholder="123 Road, Area Name"
                  className="h-9"
                />
              </div>

              <h3 className="font-semibold text-sm border-b pb-1 pt-2 text-primary">Payment & Order Settings</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={manualPaymentMethod} onValueChange={(val) => setManualPaymentMethod(val || '')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD" className="text-xs">COD</SelectItem>
                      <SelectItem value="Online" className="text-xs">Online</SelectItem>
                      <SelectItem value="Manual" className="text-xs">Manual</SelectItem>
                      <SelectItem value="Credit" className="text-xs">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Payment Status</Label>
                  <Select value={manualPaymentStatus} onValueChange={(val) => setManualPaymentStatus(val || '')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                      <SelectItem value="Paid" className="text-xs">Paid</SelectItem>
                      <SelectItem value="Failed" className="text-xs">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Order Status</Label>
                  <Select value={manualStatus} onValueChange={(val) => setManualStatus(val || '')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manualDelCharge" className="text-xs">Delivery Charge (৳)</Label>
                  <Input
                    id="manualDelCharge"
                    type="number"
                    value={manualDeliveryCharge}
                    onChange={(e) => setManualDeliveryCharge(parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manualDiscountAmt" className="text-xs">Discount Amount (৳)</Label>
                  <Input
                    id="manualDiscountAmt"
                    type="number"
                    value={manualDiscount}
                    onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="manualOrderNote" className="text-xs">Internal Note</Label>
                <Input
                  id="manualOrderNote"
                  value={manualInternalNote}
                  onChange={(e) => setManualInternalNote(e.target.value)}
                  placeholder="e.g. Customer requested urgent delivery"
                  className="h-9"
                />
              </div>
            </div>

            {/* Right Column: Products */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-1 text-primary">Products & Pricing</h3>

              <div className="relative">
                <Label className="text-xs">Search & Add Product</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search product by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>

                {productSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-950 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {productSearchResults.map((prod) => (
                      <button
                        key={prod._id}
                        type="button"
                        onClick={() => handleAddProductToManualOrder(prod)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-900 border-b last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{prod.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">SKU: {prod.sku}</span>
                        </div>
                        <span className="text-primary font-bold">৳{prod.salePrice || prod.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {manualItems.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                    No products added yet. Use the search bar above to add products.
                  </div>
                ) : (
                  manualItems.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-3 bg-slate-50/50 dark:bg-zinc-900/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {item.image && (
                           <Image src={item.image} alt={item.name} width={40} height={40} className="w-10 h-10 object-cover rounded border" />
                          )}
                          <div>
                            <p className="font-semibold text-sm leading-tight">{item.name}</p>
                            <span className="text-[10px] text-muted-foreground">Stock: {item.stock}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualItem(idx)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Color</Label>
                          {item.colorsList?.length > 0 ? (
                            <Select
                              value={item.color}
                              onValueChange={(val) => handleUpdateManualItem(idx, { color: val })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.colorsList.map((col: string) => (
                                  <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[10px] text-muted-foreground block py-1">-</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px]">Size</Label>
                          {item.sizesList?.length > 0 ? (
                            <Select
                              value={item.size}
                              onValueChange={(val) => handleUpdateManualItem(idx, { size: val })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.sizesList.map((sz: string) => (
                                  <SelectItem key={sz} value={sz} className="text-xs">{sz}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[10px] text-muted-foreground block py-1">-</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px]">Price (৳)</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateManualItem(idx, { price: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs px-1.5"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px]">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              handleUpdateManualItem(idx, { quantity: Math.min(qty, item.stock) });
                            }}
                            className="h-7 text-xs px-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>৳{manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge:</span>
                  <span>+ ৳{manualDeliveryCharge}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span>- ৳{manualDiscount}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-1.5 border-t">
                  <span>Grand Total:</span>
                  <span>৳{Math.max(0, manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + manualDeliveryCharge - manualDiscount)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={manualOrderLoading} className="bg-primary text-primary-foreground">
              {manualOrderLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

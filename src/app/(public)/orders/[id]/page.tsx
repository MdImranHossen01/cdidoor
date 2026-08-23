'use client';

import { useEffect, useState, use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, Landmark, Calendar, Phone, MapPin, CheckCircle, AlertTriangle, CreditCard, Hash, Package } from 'lucide-react';
import { format } from 'date-fns';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import Swal from 'sweetalert2';

interface OrderItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
}

interface OrderData {
  _id: string;
  shortId: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryCharge: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    email?: string;
  };
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  status: string;
  couponCode?: string;
  couponDiscountAmount?: number;
  showroom?: {
    name: string;
    address?: string;
    phone?: string;
  };
  createdAt: string;
}

export default function PublicOrderPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const handlePayNow = async () => {
    try {
      setPaying(true);
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order?._id }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const errData = await res.json();
        Swal.fire({
          title: 'Error',
          text: errData.message || 'Failed to initialize payment gateway.',
          icon: 'error',
          confirmButtonColor: '#e11d48'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Error',
        text: 'An unexpected error occurred.',
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get('payment');
      if (paymentStatus === 'success') {
        Swal.fire({
          title: 'Payment Successful',
          text: 'Thank you! Your payment has been received successfully.',
          icon: 'success',
          confirmButtonColor: '#10b981'
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'failed') {
        Swal.fire({
          title: 'Payment Failed',
          text: 'Unfortunately, your payment transaction failed. Please try again.',
          icon: 'error',
          confirmButtonColor: '#e11d48'
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'cancelled') {
        Swal.fire({
          title: 'Payment Cancelled',
          text: 'You have cancelled the payment transaction.',
          icon: 'info',
          confirmButtonColor: '#3b82f6'
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/orders/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Order not found');
          throw new Error('Failed to load order details');
        }
        const data = await res.json();
        setOrder(data.order);
        setSettings(data.settings);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground font-semibold">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-24 px-4">
        <Card className="text-center py-12 shadow-lg border-destructive/20 border-2">
          <CardContent>
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'The order you are looking for does not exist or has been deleted.'}
            </p>
            <Button onClick={() => window.location.href = '/'} className="bg-primary hover:bg-primary/95">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const manualPay = settings?.manualPaymentConfig;
  const isBankConfigured = manualPay?.bank?.active && manualPay?.bank?.bankName && manualPay?.bank?.accountNumber;
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-background border p-4 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              <Package className="w-5 h-5 text-primary" /> Order #{order.shortId}
            </h2>
            <p className="text-xs text-muted-foreground">Download this invoice copy for your records</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto font-sans">
            {order.paymentStatus !== 'Paid' && settings?.paymentConfig?.activeMethod === 'sslcommerz' && (
              <Button 
                onClick={handlePayNow}
                disabled={paying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-bold h-10 w-full sm:w-auto text-xs sm:text-sm"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" /> Pay Now (Online)
                  </>
                )}
              </Button>
            )}
            {order.paymentStatus !== 'Paid' && (
              <Button 
                onClick={() => {
                  window.location.href = `/pay?amount=${order.totalAmount}&name=${encodeURIComponent(order.shippingAddress.fullName)}&email=${encodeURIComponent(order.shippingAddress.email || '')}&mobile=${encodeURIComponent(order.shippingAddress.phone)}&notes=${encodeURIComponent(`Order #${order.shortId}`)}`;
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-bold h-10 w-full sm:w-auto text-xs sm:text-sm"
              >
                <Landmark className="w-4 h-4" /> Pay Now (Manual)
              </Button>
            )}
            <Button 
              onClick={() => generateInvoicePDF(order, settings, 'download')}
              className="bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center gap-1.5 font-bold h-10 w-full sm:w-auto text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Container */}
        <Card className="border shadow-md rounded-2xl bg-background overflow-hidden">
          <CardContent className="p-6 sm:p-10 space-y-8">
            
            {/* Header: Logo and Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-6">
              <div className="flex items-center gap-3">
                <img 
                  src={settings?.logoUrl || '/logo.webp'} 
                  alt="Logo" 
                  className="w-12 h-12 object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-primary">
                    {settings?.brandName || 'CDI Door Ind'}
                  </h1>
                  <p className="text-xs text-muted-foreground">Premium Quality Doors & Fittings</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <Badge 
                  variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'} 
                  className={`text-xs px-3 py-1 font-bold ${order.paymentStatus === 'Paid' ? 'bg-green-600 hover:bg-green-600 text-white' : ''}`}
                >
                  Payment: {order.paymentStatus}
                </Badge>
                <div className="text-sm font-semibold text-foreground mt-2">Order ID: #{order.shortId}</div>
                <div className="text-xs text-muted-foreground mt-1">Date: {format(new Date(order.createdAt), 'dd MMM yyyy')}</div>
              </div>
            </div>

            {/* Billing To & Showroom Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2 p-4 rounded-xl bg-muted/40 border">
                <h3 className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Shipping & Billing To</h3>
                <div className="font-bold text-base text-foreground">{order.shippingAddress?.fullName}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                  <Phone className="w-3.5 h-3.5" /> {order.shippingAddress?.phone}
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground text-xs mt-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5" /> {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zipCode}, {order.shippingAddress?.country}
                </div>
              </div>

              {order.showroom ? (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 border">
                  <h3 className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Showroom Details</h3>
                  <div className="font-bold text-base text-foreground">{order.showroom.name}</div>
                  {order.showroom.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                      <Phone className="w-3.5 h-3.5" /> {order.showroom.phone}
                    </div>
                  )}
                  {order.showroom.address && (
                    <div className="flex items-start gap-1.5 text-muted-foreground text-xs mt-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5" /> {order.showroom.address}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 border">
                  <h3 className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Service Provider</h3>
                  <div className="font-bold text-base text-foreground">{settings?.brandName || 'CDI Door Ind'}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                    <Phone className="w-3.5 h-3.5" /> {settings?.contact?.phone || '+8801234567890'}
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground text-xs mt-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5" /> {settings?.contact?.address || 'Dhaka, Bangladesh'}
                  </div>
                </div>
              )}
            </div>

            {/* Service / Items Table */}
            <div className="border rounded-xl overflow-x-auto w-full scrollbar-none">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-[10px] sm:text-xs">
                    <th className="p-2.5 sm:p-3.5">Item Details</th>
                    <th className="p-2.5 sm:p-3.5 text-right">Unit Price</th>
                    <th className="p-2.5 sm:p-3.5 text-center">Qty</th>
                    <th className="p-2.5 sm:p-3.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="p-2.5 sm:p-3.5 whitespace-normal break-words max-w-[200px] sm:max-w-none">
                        <div className="font-medium text-foreground">{item.name}</div>
                        {(item.color || item.size) && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {item.color && `Color: ${item.color}`} {item.size && ` | Size: ${item.size}`}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 sm:p-3.5 text-right">৳{item.price.toLocaleString('en-BD')}</td>
                      <td className="p-2.5 sm:p-3.5 text-center font-semibold text-muted-foreground">{item.quantity}</td>
                      <td className="p-2.5 sm:p-3.5 text-right font-bold">৳{(item.price * item.quantity).toLocaleString('en-BD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-2 border-t pt-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">৳{subtotal.toLocaleString('en-BD')}</span>
                </div>
                {order.deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-semibold text-foreground">+ ৳{order.deliveryCharge.toLocaleString('en-BD')}</span>
                  </div>
                )}
                {order.couponDiscountAmount && order.couponDiscountAmount > 0 ? (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                    <span>- ৳{order.couponDiscountAmount.toLocaleString('en-BD')}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 text-lg font-black text-foreground">
                  <span>Grand Total</span>
                  <span>৳{Math.round(order.totalAmount).toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions Panel (Only shown if Status is Due/Pending) */}
        {order.paymentStatus !== 'Paid' && (manualPay?.bkash?.active || manualPay?.nagad?.active || manualPay?.rocket?.active || isBankConfigured || manualPay?.instructions) && (
          <Card className="border-2 border-primary/20 bg-primary/5 rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" /> How to Pay
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Please use one of the payment options below to complete your payment</p>
              </div>

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mobile Banking Options */}
                {(manualPay?.bkash?.active || manualPay?.nagad?.active || manualPay?.rocket?.active) && (
                  <div className="space-y-3 p-4 bg-background border rounded-xl shadow-sm">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground">Mobile Banking</h4>
                    <div className="space-y-2">
                      {manualPay?.bkash?.active && manualPay?.bkash?.number && (
                        <div className="flex items-center justify-between text-sm py-1.5 border-b">
                          <span className="font-semibold text-rose-600">bKash (Personal)</span>
                          <span className="font-bold text-foreground">{manualPay.bkash.number}</span>
                        </div>
                      )}
                      {manualPay?.nagad?.active && manualPay?.nagad?.number && (
                        <div className="flex items-center justify-between text-sm py-1.5 border-b">
                          <span className="font-semibold text-orange-600">Nagad (Personal)</span>
                          <span className="font-bold text-foreground">{manualPay.nagad.number}</span>
                        </div>
                      )}
                      {manualPay?.rocket?.active && manualPay?.rocket?.number && (
                        <div className="flex items-center justify-between text-sm py-1.5">
                          <span className="font-semibold text-purple-600">Rocket (Personal)</span>
                          <span className="font-bold text-foreground">{manualPay.rocket.number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank Transfer details */}
                {isBankConfigured && (
                  <div className="space-y-3 p-4 bg-background border rounded-xl shadow-sm">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-primary" /> Bank Transfer
                    </h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex justify-between border-b pb-1">
                        <span>Bank Name:</span>
                        <span className="font-bold text-foreground text-right">{manualPay.bank.bankName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Account Number:</span>
                        <span className="font-bold text-foreground text-right">{manualPay.bank.accountNumber}</span>
                      </div>
                      {manualPay.bank.routingNumber && (
                        <div className="flex justify-between border-b pb-1">
                          <span>Routing Number:</span>
                          <span className="font-bold text-foreground text-right">{manualPay.bank.routingNumber}</span>
                        </div>
                      )}
                      {manualPay.bank.branchName && (
                        <div className="flex justify-between">
                          <span>Branch Name:</span>
                          <span className="font-bold text-foreground text-right">{manualPay.bank.branchName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Text Instructions */}
              {manualPay?.instructions && (
                <div className="p-4 bg-background border rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  <strong className="text-foreground block mb-1">Instructions:</strong>
                  {manualPay.instructions}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

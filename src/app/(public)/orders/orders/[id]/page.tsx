'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User, 
  Calendar, 
  CreditCard,
  Building2,
  Share2,
  FileText,
  Truck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';

export default function PublicOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const paymentParam = searchParams.get('payment');

  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual payment submission state
  const [manualMethod, setManualMethod] = useState('bKash');
  const [manualSender, setManualSender] = useState('');
  const [manualTrxId, setManualTrxId] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!manualSender || !manualTrxId) {
      toast.error('Please provide Sender Number and Transaction ID');
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch(`/api/public/orders/${encodeURIComponent(id)}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodName: manualMethod,
          senderNumber: manualSender,
          transactionId: manualTrxId.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Payment info submitted successfully!');
        setOrder(data.order);
      } else {
        toast.error(data.message || 'Failed to submit payment info');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmittingManual(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/orders/${encodeURIComponent(id)}`);

        if (!res.ok) {
          throw new Error('Order/Invoice not found');
        }

        const data = await res.json();
        setOrder(data.order);
        setSettings(data.settings);
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (paymentParam === 'success') {
      toast.success('Payment completed successfully!');
    } else if (paymentParam === 'failed') {
      toast.error('Payment failed. Please try again.');
    } else if (paymentParam === 'cancelled') {
      toast.info('Payment was cancelled.');
    }
  }, [paymentParam]);

  const handlePayOnline = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order._id, redirect: 'public' })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Payment initialization failed');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${order?.shortId || order?._id?.slice(-8).toUpperCase()}`,
          text: `Invoice from ${settings?.brandName || 'Store'}`,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Invoice link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-border shadow-lg">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">Order Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The requested invoice could not be found or may have expired.
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  const brandPhone = settings?.contact?.phone || '';
  const brandEmail = settings?.contact?.email || '';
  const brandAddress = settings?.contact?.address || '';

  const isPaid = order.paymentStatus === 'Paid';
  const subtotal = (order.items || []).reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  const couponDiscount = Number(order.couponDiscountAmount) || 0;
  const walletUsed = Number(order.walletAmountUsed) || 0;
  const totalAmount = Math.max(0, Math.round((order.totalAmount || 0) - couponDiscount - walletUsed));
  const paidAmount = isPaid ? totalAmount : (Number(order.paidAmount) || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground text-sm sm:text-base">
              Invoice #{order.shortId || order._id.slice(-8).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInvoicePDF(order, settings, 'print')}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              size="sm"
              onClick={() => generateInvoicePDF(order, settings, 'download')}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="border-border shadow-md overflow-hidden bg-card">
          <CardHeader className="border-b border-border/60 bg-muted/40 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">{brandName}</h1>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {brandAddress && <div>{brandAddress}</div>}
                  {brandPhone && <div>Phone: {brandPhone}</div>}
                  {brandEmail && <div>Email: {brandEmail}</div>}
                </div>
              </div>
              <div className="sm:text-right space-y-1.5">
                <Badge variant="outline" className="text-xs font-black px-3 py-1 bg-background border-border uppercase tracking-wider">
                  ORDER INVOICE
                </Badge>
                <div className="text-xs text-muted-foreground font-bold">
                  Order ID: <span className="text-foreground font-black">#{order.shortId || order._id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    dateStyle: 'medium'
                  })}
                </div>
                <div className="flex sm:justify-end gap-2 pt-1">
                  <Badge 
                    className={`font-bold text-xs uppercase px-2.5 py-0.5 ${
                      isPaid 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {isPaid ? 'PAID' : 'DUE'}
                  </Badge>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {order.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-border/60">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Delivery To</span>
                <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {order.shippingAddress?.fullName || 'Customer'}
                </div>
                {order.shippingAddress?.phone && (
                  <div className="text-xs text-foreground/80 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {order.shippingAddress.phone}
                  </div>
                )}
                {order.shippingAddress?.street && (
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>
                      {order.shippingAddress.street}, {order.shippingAddress.city}
                      {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}
                      {order.shippingAddress.division ? `, ${order.shippingAddress.division}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {order.showroom && (
                <div className="space-y-1 sm:text-right">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Showroom</span>
                  <div className="font-bold text-foreground text-sm flex items-center sm:justify-end gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {order.showroom.name}
                  </div>
                  {order.showroom.phone && (
                    <div className="text-xs text-muted-foreground">
                      Phone: {order.showroom.phone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase text-[11px]">
                    <th className="pb-3">Item Description</th>
                    <th className="pb-3 text-center w-16">Qty</th>
                    <th className="pb-3 text-right w-24">Rate</th>
                    <th className="pb-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {order.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-3 font-semibold text-foreground">
                        {item.name}
                        {(item.color || item.size) && (
                          <span className="text-[11px] text-muted-foreground font-normal block">
                            {[item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`].filter(Boolean).join(' | ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center text-muted-foreground font-medium">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-muted-foreground">৳{Math.round(item.price || 0).toLocaleString()}</td>
                      <td className="py-3 text-right font-bold text-foreground">
                        ৳{Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-border">
              <div className="flex-1 space-y-2">
                {!isPaid && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Pending Due: ৳{dueAmount.toLocaleString()}
                    </div>

                    {settings?.paymentConfig?.activeMethod === 'sslcommerz' ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          You can pay your order securely online using Card or Mobile Banking.
                        </p>
                        <Button 
                          onClick={handlePayOnline} 
                          disabled={paying}
                          className="w-full font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2"
                        >
                          <CreditCard className="h-4 w-4" />
                          {paying ? 'Redirecting to Payment...' : 'Pay Online Now'}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3 pt-1 border-t border-rose-500/20 text-xs">
                        <p className="font-semibold text-foreground">Payment Instructions:</p>
                        {settings?.manualPaymentConfig?.bkash?.active && settings.manualPaymentConfig.bkash.number && (
                          <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                            <span className="font-bold text-pink-600">bKash (Send Money):</span>
                            <span className="font-mono font-bold text-foreground">{settings.manualPaymentConfig.bkash.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.nagad?.active && settings.manualPaymentConfig.nagad.number && (
                          <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                            <span className="font-bold text-orange-600">Nagad:</span>
                            <span className="font-mono font-bold text-foreground">{settings.manualPaymentConfig.nagad.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.rocket?.active && settings.manualPaymentConfig.rocket.number && (
                          <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                            <span className="font-bold text-purple-600">Rocket:</span>
                            <span className="font-mono font-bold text-foreground">{settings.manualPaymentConfig.rocket.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.bank?.active && settings.manualPaymentConfig.bank.accountNumber && (
                          <div className="bg-card p-2 rounded border border-border text-[11px] space-y-0.5">
                            <div className="font-bold text-foreground">Bank: {settings.manualPaymentConfig.bank.bankName}</div>
                            <div>A/C: <span className="font-mono font-bold">{settings.manualPaymentConfig.bank.accountNumber}</span></div>
                            {settings.manualPaymentConfig.bank.branchName && <div>Branch: {settings.manualPaymentConfig.bank.branchName}</div>}
                          </div>
                        )}

                        {/* Customer Manual Payment Submission Form */}
                        <form onSubmit={handleManualSubmit} className="mt-3 p-3 bg-card rounded-lg border border-border space-y-2.5">
                          <div className="font-bold text-foreground text-xs flex items-center justify-between">
                            <span>Submit Payment Info</span>
                            {order.manualPaymentDetails?.transactionId && (
                              <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-700 border-yellow-300">
                                Submitted / Pending Verify
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Payment Method</label>
                              <select
                                value={manualMethod}
                                onChange={(e) => setManualMethod(e.target.value)}
                                className="w-full h-8 text-xs rounded border bg-background px-2"
                              >
                                <option value="bKash">bKash</option>
                                <option value="Nagad">Nagad</option>
                                <option value="Rocket">Rocket</option>
                                <option value="Bank">Bank Transfer</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Sender Mobile No</label>
                              <input
                                type="text"
                                placeholder="017xxxxxxxx"
                                value={manualSender}
                                onChange={(e) => setManualSender(e.target.value)}
                                className="w-full h-8 text-xs rounded border bg-background px-2"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground block mb-1">Transaction ID (TrxID)</label>
                            <input
                              type="text"
                              placeholder="e.g. 9J2K8L7M6N"
                              value={manualTrxId}
                              onChange={(e) => setManualTrxId(e.target.value)}
                              className="w-full h-8 text-xs rounded border bg-background px-2 uppercase font-mono"
                              required
                            />
                          </div>

                          <Button
                            type="submit"
                            size="sm"
                            disabled={submittingManual}
                            className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground"
                          >
                            {submittingManual ? 'Submitting...' : 'Submit Verification Info'}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {isPaid && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Payment Complete</div>
                      <div className="text-xs text-muted-foreground">This order has been fully paid. Thank you!</div>
                    </div>
                  </div>
                )}

                {order.shippingDetails?.trackingId && (
                  <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-foreground">
                      <Truck className="h-4 w-4 text-primary" /> Courier Tracking
                    </div>
                    <div className="text-muted-foreground">
                      Courier: <span className="font-semibold text-foreground">{order.shippingDetails.courierName || 'Courier'}</span> | Tracking ID: <span className="font-mono text-foreground font-semibold">{order.shippingDetails.trackingId}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-foreground">৳{Math.round(subtotal).toLocaleString()}</span>
                </div>

                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping Charge:</span>
                    <span>+ ৳{Math.round(deliveryCharge).toLocaleString()}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon Discount:</span>
                    <span>- ৳{Math.round(couponDiscount).toLocaleString()}</span>
                  </div>
                )}

                {walletUsed > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Loyalty Wallet Used:</span>
                    <span>- ৳{Math.round(walletUsed).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-foreground border-t border-border pt-2">
                  <span>Total Amount:</span>
                  <span>৳{Math.round(totalAmount).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid Amount:</span>
                  <span>৳{Math.round(paidAmount).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-rose-600 font-bold border-t border-border/40 pt-1">
                  <span>Remaining Due:</span>
                  <span>৳{Math.round(dueAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">Thank you for ordering from {brandName}!</p>
          <p>For any queries or support, please contact us at {brandPhone || brandEmail || 'our customer care'}.</p>
        </div>
      </div>
    </div>
  );
}

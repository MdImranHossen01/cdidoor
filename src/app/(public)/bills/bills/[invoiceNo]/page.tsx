'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Printer, 
  Download, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User, 
  Calendar, 
  CreditCard,
  Building2,
  Share2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import { printBillPOS } from '@/lib/bill-pos-generator';

export default function PublicBillPage({ params }: { params: Promise<{ invoiceNo: string }> }) {
  const { invoiceNo } = use(params);
  const searchParams = useSearchParams();
  const paymentParam = searchParams.get('payment');

  const [bill, setBill] = useState<any>(null);
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
    if (!bill) return;
    if (!manualSender || !manualTrxId) {
      toast.error('Please provide Sender Number and Transaction ID');
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch(`/api/public/bills/${encodeURIComponent(invoiceNo)}/submit-payment`, {
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
        setBill(data.bill);
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
        const [billRes, settingsRes] = await Promise.all([
          fetch(`/api/public/bills/${encodeURIComponent(invoiceNo)}`),
          fetch('/api/settings').catch(() => null)
        ]);

        if (!billRes.ok) {
          throw new Error('Invoice not found');
        }

        const billData = await billRes.json();
        setBill(billData);

        if (settingsRes && settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    if (invoiceNo) {
      loadData();
    }
  }, [invoiceNo]);

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
    if (!bill) return;
    setPaying(true);
    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: bill._id })
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
          title: `Invoice ${bill?.invoiceNo}`,
          text: `Invoice #${bill?.invoiceNo} from ${settings?.brandName || 'Store'}`,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-slate-200 shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            The requested invoice (#{invoiceNo}) could not be found or may have been removed.
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const brandName = settings?.brandName || settings?.companyName || process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  const brandPhone = settings?.contact?.phone || settings?.companyPhone || '';
  const brandEmail = settings?.contact?.email || settings?.companyEmail || '';
  const brandAddress = settings?.contact?.address || settings?.companyAddress || '';

  const docTitle = bill.documentType === 'offer' ? 'QUOTATION' : bill.documentType === 'chalan' ? 'CHALLAN' : 'RETAIL INVOICE';
  const isPaid = bill.status === 'Paid' || (bill.currentBillDue || 0) <= 0;

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-bold text-slate-900 text-sm sm:text-base">Invoice #{bill.invoiceNo}</span>
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
              onClick={() => printBillPOS(bill, settings)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Receipt className="h-4 w-4" /> POS Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateBillPDF(bill, settings, 'print')}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-4 w-4" /> Print A4
            </Button>
            <Button
              size="sm"
              onClick={() => generateBillPDF(bill, settings, 'download')}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="border-slate-200/80 shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{brandName}</h1>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {brandAddress && <div>{brandAddress}</div>}
                  {brandPhone && <div>Phone: {brandPhone}</div>}
                  {brandEmail && <div>Email: {brandEmail}</div>}
                </div>
              </div>
              <div className="sm:text-right space-y-1.5">
                <Badge variant="outline" className="text-xs font-black px-3 py-1 bg-white border-slate-300 uppercase tracking-wider">
                  {docTitle}
                </Badge>
                <div className="text-xs text-slate-600 font-bold">
                  Invoice: <span className="text-slate-900 font-black">{bill.invoiceNo}</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center sm:justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(bill.date || bill.createdAt).toLocaleDateString('en-US', {
                    dateStyle: 'medium'
                  })}
                </div>
                <div>
                  <Badge 
                    className={`font-bold text-xs uppercase px-2.5 py-0.5 ${
                      isPaid 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {isPaid ? 'PAID' : 'DUE'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Customer & Showroom Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200/60">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billed To</span>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400" />
                  {bill.clientName}
                </div>
                {bill.clientPhone && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {bill.clientPhone}
                  </div>
                )}
              </div>

              {bill.showroom && (
                <div className="space-y-1 sm:text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Showroom</span>
                  <div className="font-bold text-slate-900 text-sm flex items-center sm:justify-end gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {bill.showroom.name}
                  </div>
                  {bill.showroom.phone && (
                    <div className="text-xs text-slate-600">
                      Phone: {bill.showroom.phone}
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
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="pb-3">Item Description</th>
                    <th className="pb-3 text-center w-16">Qty</th>
                    <th className="pb-3 text-right w-24">Rate</th>
                    <th className="pb-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800">
                        {item.name}
                        {item.batchNumber && item.batchNumber !== 'auto' && (
                          <span className="text-[10px] text-slate-400 font-normal block">Batch: {item.batchNumber}</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-600 font-medium">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-slate-600">৳{Math.round(item.price || 0).toLocaleString()}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        ৳{Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-200">
              <div className="flex-1 space-y-2">
                {!isPaid && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Pending Balance: ৳{(bill.currentBillDue || bill.gTotal || 0).toLocaleString()}
                    </div>

                    {settings?.paymentConfig?.activeMethod === 'sslcommerz' ? (
                      <>
                        <p className="text-xs text-rose-700">
                          You can conveniently settle your invoice online using credit/debit card or mobile banking.
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
                      <div className="space-y-3 pt-1 border-t border-rose-200 text-xs">
                        <p className="font-semibold text-slate-800">Payment Instructions:</p>
                        {settings?.manualPaymentConfig?.bkash?.active && settings.manualPaymentConfig.bkash.number && (
                          <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                            <span className="font-bold text-pink-600">bKash (Send Money):</span>
                            <span className="font-mono font-bold text-slate-900">{settings.manualPaymentConfig.bkash.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.nagad?.active && settings.manualPaymentConfig.nagad.number && (
                          <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                            <span className="font-bold text-orange-600">Nagad:</span>
                            <span className="font-mono font-bold text-slate-900">{settings.manualPaymentConfig.nagad.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.rocket?.active && settings.manualPaymentConfig.rocket.number && (
                          <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                            <span className="font-bold text-purple-600">Rocket:</span>
                            <span className="font-mono font-bold text-slate-900">{settings.manualPaymentConfig.rocket.number}</span>
                          </div>
                        )}
                        {settings?.manualPaymentConfig?.bank?.active && settings.manualPaymentConfig.bank.accountNumber && (
                          <div className="bg-white p-2 rounded border border-slate-200 text-[11px] space-y-0.5">
                            <div className="font-bold text-slate-900">Bank: {settings.manualPaymentConfig.bank.bankName}</div>
                            <div>A/C: <span className="font-mono font-bold">{settings.manualPaymentConfig.bank.accountNumber}</span></div>
                            {settings.manualPaymentConfig.bank.branchName && <div>Branch: {settings.manualPaymentConfig.bank.branchName}</div>}
                          </div>
                        )}

                        {/* Customer Manual Payment Submission Form */}
                        <form onSubmit={handleManualSubmit} className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                          <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                            <span>Submit Payment Info</span>
                            {bill.manualPaymentDetails?.transactionId && (
                              <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-800 border-yellow-300">
                                Submitted / Pending Verify
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-medium text-slate-500 block mb-1">Payment Method</label>
                              <select
                                value={manualMethod}
                                onChange={(e) => setManualMethod(e.target.value)}
                                className="w-full h-8 text-xs rounded border bg-white px-2 text-slate-800"
                              >
                                <option value="bKash">bKash</option>
                                <option value="Nagad">Nagad</option>
                                <option value="Rocket">Rocket</option>
                                <option value="Bank">Bank Transfer</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-slate-500 block mb-1">Sender Mobile No</label>
                              <input
                                type="text"
                                placeholder="017xxxxxxxx"
                                value={manualSender}
                                onChange={(e) => setManualSender(e.target.value)}
                                className="w-full h-8 text-xs rounded border bg-white px-2 text-slate-800"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-slate-500 block mb-1">Transaction ID (TrxID)</label>
                            <input
                              type="text"
                              placeholder="e.g. 9J2K8L7M6N"
                              value={manualTrxId}
                              onChange={(e) => setManualTrxId(e.target.value)}
                              className="w-full h-8 text-xs rounded border bg-white px-2 uppercase font-mono text-slate-800"
                              required
                            />
                          </div>

                          <Button
                            type="submit"
                            size="sm"
                            disabled={submittingManual}
                            className="w-full h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            {submittingManual ? 'Submitting...' : 'Submit Verification Info'}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {isPaid && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900 text-sm">Payment Complete</div>
                      <div className="text-xs text-emerald-700">This invoice has been fully paid. Thank you!</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">৳{Math.round(bill.subtotal || 0).toLocaleString()}</span>
                </div>

                {bill.deliveryCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge:</span>
                    <span>+ ৳{Math.round(bill.deliveryCharge).toLocaleString()}</span>
                  </div>
                )}

                {bill.serviceFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Service Fee:</span>
                    <span>+ ৳{Math.round(bill.serviceFee).toLocaleString()}</span>
                  </div>
                )}

                {bill.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>- ৳{Math.round(bill.discount).toLocaleString()}</span>
                  </div>
                )}

                {bill.prevDue > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Due:</span>
                    <span>+ ৳{Math.round(bill.prevDue).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Grand Total:</span>
                  <span>৳{Math.round(bill.gTotal || bill.total || 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid / Cash In:</span>
                  <span>৳{Math.round(bill.cashIn || 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-100 pt-1">
                  <span>Remaining Due:</span>
                  <span>৳{Math.round(bill.currentBillDue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold">Thank you for choosing {brandName}!</p>
          <p>For any queries or support, please contact us at {brandPhone || brandEmail || 'our customer care'}.</p>
        </div>
      </div>
    </div>
  );
}

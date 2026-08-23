'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  User,
  Phone,
  Mail,
  Building,
} from 'lucide-react';
import Image from 'next/image';

type PaymentMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Scan QR' | 'Bank Transfer';

function PayPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [method, setMethod] = useState<PaymentMethod>('Scan QR');
  const [settings, setSettings] = useState<any>(null);

  // User identification fields
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [verifyBy, setVerifyBy] = useState<'number' | 'txid'>('number');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load settings
  useEffect(() => {
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
    fetchSettings();
  }, []);

  // Auto-fill fields from query params and session
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const amt = searchParams.get('amount') || '';
    const nm = searchParams.get('name') || '';
    const em = searchParams.get('email') || '';
    const mb = searchParams.get('mobile') || '';
    const nt = searchParams.get('notes') || '';

    if (amt) setAmount(amt);
    if (nm) setClientName(nm);
    if (em) setClientEmail(em);
    if (mb) setClientMobile(mb);
    if (nt) setNotes(nt);

    if (session?.user) {
      if (!nm) setClientName(session.user.name || '');
      if (!em) setClientEmail(session.user.email || '');
    }
  }, [session, searchParams]);

  // Normalize payment method based on loaded settings
  useEffect(() => {
    if (!settings) return;
    const manualPay = settings?.manualPaymentConfig;
    const methodsList: { id: PaymentMethod; active: boolean }[] = [
      { id: 'Scan QR', active: !!manualPay?.banglaQr?.active },
      { id: 'Bank Transfer', active: !!manualPay?.bank?.active },
      { id: 'bKash', active: !!manualPay?.bkash?.active },
      { id: 'Nagad', active: !!manualPay?.nagad?.active },
      { id: 'Rocket', active: !!manualPay?.rocket?.active },
    ];
    const active = methodsList.filter(m => m.active);
    const isCurrentActive = active.some(m => m.id === method);
    if (!isCurrentActive && active.length > 0) {
      setMethod(active[0].id);
    }
  }, [settings, method]);

  const handleCopyAccount = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const submitPaymentToDB = async () => {
    if (!clientName.trim()) {
      toast.error('Please enter your name.');
      return null;
    }
    if (!clientMobile.trim()) {
      toast.error('Please enter your mobile number.');
      return null;
    }
    const isBillPayment = (notes || '').toLowerCase().includes('bill #');
    if (!clientEmail.trim() && !isBillPayment) {
      toast.error('Please enter your email address.');
      return null;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return null;
    }

    if (method !== 'Scan QR') {
      if (verifyBy === 'txid' && !transactionId.trim()) {
        toast.error('Please provide your Transaction ID.');
        return null;
      }
      if (verifyBy === 'number' && !senderNumber.trim()) {
        toast.error('Please provide your Sender Mobile Number.');
        return null;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientMobile,
          clientEmail,
          amount: parseFloat(amount),
          paymentMethod: method,
          transactionId: verifyBy === 'txid' ? transactionId : undefined,
          senderNumber: verifyBy === 'number' ? senderNumber : undefined,
          notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to submit payment.');
        return null;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('An error occurred. Please try again.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitPaymentToDB();
    if (success) {
      toast.success('Payment submitted successfully! Admin will verify it shortly.');
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  };

  const handleVerifyToWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Open the new window/tab synchronously before awaiting
    const newTab = window.open('about:blank', '_blank');

    const success = await submitPaymentToDB();
    if (success) {
      toast.success('Payment saved! Redirecting to WhatsApp...');

      const verificationDetail = verifyBy === 'txid'
        ? `Transaction ID: ${transactionId}`
        : `Sender Mobile Number: ${senderNumber}`;

      const message = `Hello,
I have made a payment and requested verification. Here are my details:

Name: ${clientName}
Mobile Number: ${clientMobile}
Email: ${clientEmail || 'Not provided'}
Payment Method: ${method}
Amount: ${amount} ৳
Verification Info: ${method === 'Scan QR' ? 'Scan QR Verification' : verificationDetail}
Notes: ${notes || 'None'}

Please verify my payment. Thank you!`;

      const whatsappNum = settings?.socialLinks?.whatsapp || settings?.contact?.phone || '8801919011101';
      const cleanNum = whatsappNum.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;

      if (newTab) {
        newTab.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }

      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } else {
      if (newTab) {
        newTab.close();
      }
    }
  };

  const manualPay = settings?.manualPaymentConfig;

  const methods: { id: PaymentMethod; label: string; icon: any; active: boolean; number?: string; qr?: string }[] = [
    { id: 'Scan QR', label: 'Scan QR', icon: CreditCard, active: !!manualPay?.banglaQr?.active, qr: manualPay?.banglaQr?.qrCode },
    { id: 'Bank Transfer', label: 'Bank Pay', icon: Building, active: !!manualPay?.bank?.active },
    { id: 'bKash', label: 'bKash', icon: Smartphone, active: !!manualPay?.bkash?.active, number: manualPay?.bkash?.number, qr: manualPay?.bkash?.qrCode },
    { id: 'Nagad', label: 'Nagad', icon: Smartphone, active: !!manualPay?.nagad?.active, number: manualPay?.nagad?.number, qr: manualPay?.nagad?.qrCode },
    { id: 'Rocket', label: 'Rocket', icon: Smartphone, active: !!manualPay?.rocket?.active, number: manualPay?.rocket?.number, qr: manualPay?.rocket?.qrCode },
  ];

  const activeMethods = methods.filter((m) => m.active);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 font-sans">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-foreground mb-4 font-heading">Make a Payment</h1>
        <p className="text-lg text-muted-foreground">Choose your preferred method and submit verification details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Instructions Section */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground font-heading">
              <AlertCircle className="text-primary w-5 h-5" />
              How to Pay
            </h2>

            {method === 'Scan QR' ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">Scan the QR code below using your mobile banking app to complete the payment.</p>
                {manualPay?.banglaQr?.qrCode ? (
                  <div className="relative aspect-square w-full max-w-[250px] mx-auto bg-white p-2 rounded-xl shadow-inner border border-border">
                    <Image
                      src={manualPay.banglaQr.qrCode}
                      alt="Payment QR Code"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground text-center">No QR code configured by admin.</p>
                )}
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs text-primary font-medium text-center">
                    Scan and Pay smoothly via QR Code
                  </p>
                </div>
              </div>
            ) : method === 'Bank Transfer' ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">Transfer the payment amount to the following bank account details:</p>
                {manualPay?.bank ? (
                  <div className="bg-muted/50 p-5 rounded-xl border border-border space-y-3 text-sm">
                    {manualPay.bank.bankName && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-black tracking-wider block">Bank Name</span>
                        <span className="font-bold text-foreground">{manualPay.bank.bankName}</span>
                      </div>
                    )}
                    {manualPay.bank.accountNumber && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase font-black tracking-wider block">Account Number</span>
                          <span className="font-mono font-bold text-lg text-foreground tracking-wider">{manualPay.bank.accountNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(manualPay.bank.accountNumber)}
                          className="text-xs text-primary font-bold hover:underline px-2.5 py-1 border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-md transition-all cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                    {manualPay.bank.branchName && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-black tracking-wider block">Branch</span>
                        <span className="font-semibold text-foreground">{manualPay.bank.branchName}</span>
                      </div>
                    )}
                    {manualPay.bank.routingNumber && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase font-black tracking-wider block">Routing Number</span>
                          <span className="font-mono font-bold text-foreground">{manualPay.bank.routingNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(manualPay.bank.routingNumber)}
                          className="text-xs text-primary font-bold hover:underline px-2.5 py-1 border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-md transition-all cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Bank transfer not configured.</p>
                )}
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs text-primary font-medium">
                    Please submit the transfer reference or your account name as transaction identification after sending payment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Open your <span className="font-bold text-foreground">{method}</span> app or dial USSD.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Choose <span className="font-bold text-foreground">"Send Money"</span> option.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-muted-foreground">Send total amount to this personal account:</p>
                    {methods.find((m) => m.id === method)?.number ? (
                      <button
                        type="button"
                        className="w-full bg-muted p-3 rounded-lg flex items-center justify-between border border-border group cursor-pointer active:scale-[0.98] transition-all hover:bg-muted/80 focus:ring-2 focus:ring-primary focus:outline-none"
                        onClick={() => handleCopyAccount(methods.find((m) => m.id === method)?.number || '')}
                      >
                        <span className="text-xl font-mono font-bold tracking-wider text-foreground">
                          {methods.find((m) => m.id === method)?.number}
                        </span>
                        <span className="text-xs text-primary uppercase font-bold">Copy</span>
                      </button>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">Account number not configured by admin.</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Submit the Transaction ID or your Mobile Number in the form to verify your payment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground font-heading">
            <CheckCircle2 className="text-green-500 w-5 h-5" />
            Enter Payment Details
          </h2>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {/* Guest / Identification Fields */}
            <div className="space-y-4 border-b border-border pb-4">
              <div className="space-y-2">
                <label htmlFor="clientName" className="text-sm font-medium text-muted-foreground">Name <span className="text-destructive">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="clientMobile" className="text-sm font-medium text-muted-foreground">Mobile Number <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="clientMobile"
                    type="text"
                    value={clientMobile}
                    onChange={(e) => setClientMobile(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="clientEmail" className="text-sm font-medium text-muted-foreground">Email Address <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Method Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground text-center block w-full">Select Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {activeMethods.length > 0 ? (
                  activeMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`
                        flex flex-col items-center justify-center py-4 px-1 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                        ${method === m.id
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.03]'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                        }
                      `}
                    >
                      <div className="relative w-8 h-8 mb-2 flex items-center justify-center">
                        <m.icon className={`w-6 h-6 ${method === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center transition-colors ${method === m.id ? 'text-primary' : 'text-muted-foreground'}`}>
                        {m.label}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground col-span-5 text-center">No payment methods active.</p>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">Amount (৳)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold opacity-50">৳</span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all text-2xl font-bold"
                  required
                />
              </div>
            </div>

            {method !== 'Scan QR' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Verify By</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="verifyBy"
                        value="number"
                        checked={verifyBy === 'number'}
                        onChange={() => setVerifyBy('number')}
                        className="w-4 h-4 text-primary focus:ring-primary border-border"
                      />
                      <span className={`text-sm font-medium transition-colors ${verifyBy === 'number' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {method === 'Bank Transfer' ? 'Bank Name' : 'Mobile Number'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="verifyBy"
                        value="txid"
                        checked={verifyBy === 'txid'}
                        onChange={() => setVerifyBy('txid')}
                        className="w-4 h-4 text-primary focus:ring-primary border-border"
                      />
                      <span className={`text-sm font-medium transition-colors ${verifyBy === 'txid' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        Transaction ID
                      </span>
                    </label>
                  </div>
                </div>

                {verifyBy === 'number' ? (
                  <div className="space-y-2">
                    <label htmlFor="number" className="text-sm font-medium text-muted-foreground">
                      {method === 'Bank Transfer' ? 'Sender Bank Name' : 'Sender Mobile Number'}
                    </label>
                    <input
                      id="number"
                      type="text"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder={method === 'Bank Transfer' ? 'e.g. Dhaka Bank, City Bank' : '01XXXXXXXXX'}
                      className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="txid" className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                    <input
                      id="txid"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 8G5H2J8"
                      className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific details for the admin..."
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-all h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleVerifyOnly}
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleVerifyToWhatsApp}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Verify to WhatsApp
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground font-medium text-lg">Loading page...</p>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}

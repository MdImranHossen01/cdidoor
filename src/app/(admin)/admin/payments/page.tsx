'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Check,
  X,
  Search,
  User as UserIcon,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

interface Payment {
  _id: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  senderNumber?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  notes?: string;
  createdAt: string;
}

export default function AdminManagePayments() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/admin/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      } else {
        Swal.fire({
          title: t("payments.error"),
          text: t("payments.fetch_error"),
          icon: 'error',
          confirmButtonColor: '#e11d48',
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire({
        title: t("payments.error"),
        text: t("payments.general_error"),
        icon: 'error',
        confirmButtonColor: '#e11d48',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'super_admin') {
      fetchPayments();
    }
  }, [session]);

  const handleUpdateStatus = async (id: string, newStatus: 'confirmed' | 'rejected') => {
    // SweetAlert2 confirmation
    const confirmResult = await Swal.fire({
      title: t("payments.confirm_title"),
      text: `${t("payments.confirm_text_prefix")}${newStatus === 'confirmed' ? t("payments.confirmed") : t("payments.rejected")}${t("payments.confirm_text_suffix")}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'confirmed' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `${t("payments.yes_prefix")}${newStatus === 'confirmed' ? t("payments.confirmed") : t("payments.rejected")}!`,
    });

    if (!confirmResult.isConfirmed) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        Swal.fire({
          title: t("payments.updated"),
          text: `${t("payments.updated_text_prefix")}${newStatus === 'confirmed' ? t("payments.confirmed") : t("payments.rejected")}${t("payments.updated_text_suffix")}`,
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        setPayments((prev) =>
          prev.map((p) => (p._id === id ? { ...p, status: newStatus } : p))
        );
      } else {
        Swal.fire({
          title: t("payments.error"),
          text: t("payments.update_error"),
          icon: 'error',
          confirmButtonColor: '#e11d48',
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire({
        title: t("payments.error"),
        text: t("payments.general_error"),
        icon: 'error',
        confirmButtonColor: '#e11d48',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const searchLower = search.toLowerCase();
    const name = p.clientName || p.user?.name || '';
    const email = p.clientEmail || p.user?.email || '';
    const mobile = p.clientMobile || '';
    const txId = p.transactionId || '';
    const sndNum = p.senderNumber || '';

    const matchesSearch =
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      mobile.toLowerCase().includes(searchLower) ||
      txId.toLowerCase().includes(searchLower) ||
      sndNum.toLowerCase().includes(searchLower);

    const matchesFilter = filter === 'all' || p.status === filter;

    return matchesSearch && matchesFilter;
  });

  if (status === 'loading') {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-card border border-border rounded-2xl">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t("payments.verifying_session")}</p>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'manager') {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-destructive font-bold">{t("payments.unauthorized")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">{t("payments.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("payments.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder={t("payments.search_placeholder") as string}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary w-full md:w-64 transition-all"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary"
          >
            <option value="all">{t("payments.all_status")}</option>
            <option value="pending">{t("payments.pending")}</option>
            <option value="confirmed">{t("payments.confirmed")}</option>
            <option value="rejected">{t("payments.rejected")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center bg-card border border-border rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t("payments.loading_submissions")}</p>
          </div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-center p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{t("payments.no_submissions")}</h3>
          <p className="text-muted-foreground text-sm">{t("payments.adjust_search")}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border text-sm">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("payments.client")}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("payments.details")}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("payments.amount")}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("payments.date")}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("payments.status")}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">{t("payments.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{payment.clientName || payment.user?.name || t("payments.unknown")}</span>
                          <span className="text-xs text-muted-foreground">{payment.clientEmail || payment.user?.email || t("payments.no_email")}</span>
                          <span className="text-xs text-muted-foreground">{payment.clientMobile}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {payment.paymentMethod}
                          </span>
                          {payment.transactionId && (
                            <span className="text-xs font-mono font-bold text-foreground">{payment.transactionId}</span>
                          )}
                        </div>
                        {payment.senderNumber && (
                          <span className="text-xs text-muted-foreground">{t("payments.from")}: {payment.senderNumber}</span>
                        )}
                        {payment.notes && (
                          <span className="text-xs italic text-primary mt-1">"{payment.notes}"</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-foreground">৳{payment.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        payment.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800' :
                        payment.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800'
                      }`}>
                        {payment.status === 'confirmed' ? t("payments.confirmed") : payment.status === 'rejected' ? t("payments.rejected") : t("payments.pending")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(payment._id, 'confirmed')}
                            disabled={!!processingId}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                            title={t("payments.confirm_payment") as string}
                          >
                            {processingId === payment._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(payment._id, 'rejected')}
                            disabled={!!processingId}
                            className="p-2 bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                            title={t("payments.reject_payment") as string}
                          >
                            {processingId === payment._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

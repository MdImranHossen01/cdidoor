'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

interface SaleBill {
  _id: string;
  invoiceNo: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  netSales: number;
  deliveryCharge: number;
  total: number;
  paid: number;
  due: number;
  status: string;
}

interface GrandTotals {
  sales: number;
  netSales: number;
  paid: number;
  due: number;
  delivery: number;
}

export default function SalesReportPage() {
  const [search,      setSearch]      = useState('');
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');
  const [showroomId,  setShowroomId]  = useState('');
  const [showrooms,   setShowrooms]   = useState<{ value: string; label: string }[]>([]);
  const [limit,       setLimit]       = useState(25);
  const [page,        setPage]        = useState(1);
  const [data,        setData]        = useState<SaleBill[]>([]);
  const [total,       setTotal]       = useState(0);
  const [grandTotals, setGrandTotals] = useState<GrandTotals>({ sales: 0, netSales: 0, paid: 0, due: 0, delivery: 0 });
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    fetch('/api/admin/reports/showrooms')
      .then((res) => res.json())
      .then((json) => setShowrooms(json.showrooms || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search)     params.set('search', search);
    if (from)       params.set('from', from);
    if (to)         params.set('to', to);
    if (showroomId) params.set('showroom', showroomId);

    fetch(`/api/admin/reports/sales?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
          setTotal(json.total ?? 0);
          if (json.grandTotals) setGrandTotals(json.grandTotals);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [search, from, to, showroomId, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: 'Invoice No / Customer / Phone',
        }}
        dateRange={{
          from,
          to,
          onFromChange: (v) => { setFrom(v); setPage(1); },
          onToChange: (v) => { setTo(v); setPage(1); },
        }}
        dropdowns={[
          {
            id: 'showroom',
            label: 'Showroom',
            value: showroomId,
            placeholder: '--- All Showrooms ---',
            onChange: (val) => { setShowroomId(val); setPage(1); },
            options: showrooms,
          },
        ]}
        limit={{
          value: limit,
          onChange: (v) => { setLimit(v); setPage(1); },
        }}
        onPrint={() => window.print()}
      />

      {loading && (
        <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">
          Loading sales report...
        </div>
      )}

      {!loading && (
        <>
          {data.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl text-sm text-muted-foreground shadow-xs">
              No records found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-xs tracking-wider">
                        <th className="py-3 px-4 w-28">Date</th>
                        <th className="py-3 px-4 w-32">Invoice No</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 text-right">Net Sales</th>
                        <th className="py-3 px-4 text-right">Delivery</th>
                        <th className="py-3 px-4 text-right font-bold">Total</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Due</th>
                        <th className="py-3 px-4 text-center w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.map((d) => (
                        <tr
                          key={d._id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {fmtDate(d.date)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-xs text-primary">
                            {d.invoiceNo}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {d.clientName || 'Walk-in-customer'}
                            {d.clientPhone && (
                              <div className="text-xs text-muted-foreground font-mono font-normal">
                                {d.clientPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                            {fmt(d.netSales)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                            {fmt(d.deliveryCharge)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-foreground">
                            {fmt(d.total)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {fmt(d.paid)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-destructive">
                            {d.due > 0 ? fmt(d.due) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                d.due > 0
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {d.due > 0 ? 'Due' : 'Paid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotals.sales > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground text-xs uppercase tracking-wider">
                          <td colSpan={3} className="py-3.5 px-4 text-right">
                            Grand Totals:
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                            {fmt(grandTotals.netSales)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                            {fmt(grandTotals.delivery)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm sm:text-base text-foreground">
                            {fmt(grandTotals.sales)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {fmt(grandTotals.paid)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-destructive">
                            {fmt(grandTotals.due)}
                          </td>
                          <td className="py-3.5 px-4"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {data.map((d) => (
                  <ReportCard
                    key={d._id}
                    rows={[
                      { label: 'Date',          value: fmtDate(d.date) },
                      { label: 'Invoice No',    value: d.invoiceNo },
                      { label: 'Customer',      value: d.clientName || 'Walk-in-customer', variant: 'primary' },
                      { label: 'Net Sales',     value: fmt(d.netSales) },
                      { label: 'Delivery Cost', value: fmt(d.deliveryCharge) },
                      { label: 'Total',         value: fmt(d.total) },
                      { label: 'Paid',          value: fmt(d.paid),  variant: 'success' },
                      ...(d.due > 0 ? [{ label: 'Due', value: fmt(d.due), variant: 'danger' as const }] : []),
                    ]}
                  />
                ))}

                {grandTotals.sales > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Grand Total Sales', value: fmt(grandTotals.sales) },
                      { label: 'Total Paid',        value: fmt(grandTotals.paid), variant: 'success' },
                      { label: 'Total Due',         value: fmt(grandTotals.due),  variant: 'danger' },
                    ]}
                    className="border-primary/40 bg-primary/5 font-semibold"
                  />
                )}
              </div>

              {/* Pagination Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                <div>
                  Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {page} of {Math.max(1, Math.ceil(total / limit))}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}


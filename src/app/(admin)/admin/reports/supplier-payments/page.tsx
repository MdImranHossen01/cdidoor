'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

interface SupPayment {
  _id: string;
  date: string;
  supplier?: { name?: string; phone?: string; company?: string };
  amount: number;
  account: string;
  note: string;
}

export default function SupplierPaymentsPage() {
  const [search,     setSearch]     = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [limit,      setLimit]      = useState(25);
  const [page,       setPage]       = useState(1);
  const [data,       setData]       = useState<SupPayment[]>([]);
  const [total,      setTotal]      = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (from)   params.set('from', from);
    if (to)     params.set('to', to);

    fetch(`/api/admin/reports/supplier-payments?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
          setTotal(json.total ?? 0);
          setGrandTotal(json.grandTotal ?? 0);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [search, from, to, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: 'Supplier / Phone / Company',
        }}
        dateRange={{
          from,
          to,
          onFromChange: (v) => { setFrom(v); setPage(1); },
          onToChange: (v) => { setTo(v); setPage(1); },
        }}
        limit={{
          value: limit,
          onChange: (v) => { setLimit(v); setPage(1); },
        }}
        onPrint={() => window.print()}
      />

      {loading && (
        <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">
          Loading supplier payments...
        </div>
      )}

      {!loading && (
        <>
          {data.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl text-sm text-muted-foreground shadow-xs">
              No supplier payment records found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-xs tracking-wider">
                        <th className="py-3 px-4 w-36">Date</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4 text-right w-36">Amount</th>
                        <th className="py-3 px-4 w-36">Account</th>
                        <th className="py-3 px-4">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.map((d, index) => (
                        <tr
                          key={d._id || index}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {fmtDate(d.date)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">
                              {d.supplier?.name || '-'}
                            </div>
                            {(d.supplier?.phone || d.supplier?.company) && (
                              <div className="text-xs text-muted-foreground mt-0.5 space-x-1.5">
                                {d.supplier.phone && <span className="font-mono">{d.supplier.phone}</span>}
                                {d.supplier.company && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-muted/60 text-[11px]">
                                    {d.supplier.company}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-foreground font-mono text-sm">
                            {fmt(d.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground border border-border/60">
                              {d.account || 'Cash'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-xs truncate">
                            {d.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotal > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground">
                          <td colSpan={2} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-muted-foreground">
                            Grand Total Amount:
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm sm:text-base text-foreground">
                            {fmt(grandTotal)}
                          </td>
                          <td colSpan={2} className="py-3.5 px-4"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {data.map((d, index) => (
                  <ReportCard
                    key={d._id || index}
                    rows={[
                      { label: 'Date',     value: fmtDate(d.date) },
                      {
                        label: 'Supplier',
                        value: d.supplier
                          ? `${d.supplier.name || '-'}\n${d.supplier.phone || ''}${d.supplier.company ? '\n' + d.supplier.company : ''}`
                          : '-',
                        variant: 'primary',
                      },
                      { label: 'Amount',   value: fmt(d.amount), variant: 'primary' },
                      { label: 'Payment',  value: d.account || 'Cash' },
                      { label: 'Note',     value: d.note || '-', variant: 'muted' },
                    ]}
                  />
                ))}

                {grandTotal > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Total',  value: '' },
                      { label: 'Amount', value: fmt(grandTotal), variant: 'primary' },
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


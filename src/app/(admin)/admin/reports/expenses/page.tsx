'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

interface ExpenseItem {
  _id: string;
  date: string;
  category: string;
  staff: string;
  amount: number;
  note: string;
}

export default function ExpenseReportPage() {
  const [search,     setSearch]     = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [showroomId, setShowroomId] = useState('');
  const [showrooms,  setShowrooms]  = useState<{ value: string; label: string }[]>([]);
  const [limit,      setLimit]      = useState(25);
  const [page,       setPage]       = useState(1);
  const [data,       setData]       = useState<ExpenseItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading,    setLoading]    = useState(false);

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

    fetch(`/api/admin/reports/expenses?${params}`, { signal: controller.signal })
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
  }, [search, from, to, showroomId, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: 'Category / Note / Description',
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
          Loading expense report...
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
                        <th className="py-3 px-4 w-36">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Staff / User</th>
                        <th className="py-3 px-4 text-right w-36">Amount</th>
                        <th className="py-3 px-4">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.map((d, i) => (
                        <tr
                          key={d._id ?? i}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {fmtDate(d.date)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground border border-border/60">
                              {d.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-sm text-muted-foreground">
                            {d.staff || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-destructive font-mono text-sm">
                            {fmt(d.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-xs truncate">
                            {d.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotal > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground text-xs uppercase tracking-wider">
                          <td colSpan={3} className="py-3.5 px-4 text-right">
                            Grand Total Expense:
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm sm:text-base text-destructive">
                            {fmt(grandTotal)}
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
                {data.map((d, i) => (
                  <ReportCard
                    key={d._id ?? i}
                    rows={[
                      { label: 'Date',     value: fmtDate(d.date) },
                      { label: 'Category', value: d.category || '-', variant: 'primary' },
                      { label: 'Staff',    value: d.staff    || '-', variant: 'muted' },
                      { label: 'Amount',   value: fmt(d.amount),     variant: 'danger' },
                      { label: 'Note',     value: d.note     || '-', variant: 'muted' },
                    ]}
                  />
                ))}

                {grandTotal > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Total Expense', value: fmt(grandTotal), variant: 'danger' },
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


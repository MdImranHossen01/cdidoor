'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

interface DueCustomer {
  _id: string;
  name: string;
  phone: string;
  idNo?: string;
  shopName?: string;
  totalDue: number;
}

export default function DueCustomersPage() {
  const [search,      setSearch]      = useState('');
  const [showroomId,  setShowroomId]  = useState('');
  const [showrooms,   setShowrooms]   = useState<{ value: string; label: string }[]>([]);
  const [limit,       setLimit]       = useState(25);
  const [page,        setPage]        = useState(1);
  const [data,        setData]        = useState<DueCustomer[]>([]);
  const [total,       setTotal]       = useState(0);
  const [grandTotal,  setGrandTotal]  = useState(0);
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
    if (showroomId) params.set('showroom', showroomId);

    fetch(`/api/admin/reports/due-customers?${params}`, { signal: controller.signal })
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
  }, [search, showroomId, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Top Filter Bar */}
      <ReportFilterBar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: 'Name/ Mobile/ ID NO',
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
        customAction={
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Users className="h-3.5 w-3.5" /> Customer List
          </Link>
        }
      />

      {loading && (
        <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">
          Loading due customers...
        </div>
      )}

      {!loading && (
        <>
          {data.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl text-sm text-muted-foreground shadow-xs">
              No due customers found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-xs tracking-wider">
                        <th className="py-3 px-4 w-28">ID NO</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Mobile</th>
                        <th className="py-3 px-4">Shop Name</th>
                        <th className="py-3 px-4 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.map((d, index) => (
                        <tr
                          key={d._id || d.phone || index}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                            {d.idNo || '.'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {d.name || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-foreground/80 font-mono text-xs">
                            {d.phone || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {d.shopName || '.'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-destructive font-mono text-sm">
                            {fmt(d.totalDue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotal > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground">
                          <td colSpan={4} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-muted-foreground">
                            Grand Total Due:
                          </td>
                          <td className="py-3.5 px-4 text-right text-destructive font-mono font-bold text-sm sm:text-base">
                            {fmt(grandTotal)}
                          </td>
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
                    key={d._id || d.phone || index}
                    rows={[
                      { label: 'ID NO',  value: d.idNo || '.' },
                      { label: 'Name',   value: d.name || '-', variant: 'primary' },
                      { label: 'Mobile', value: d.phone || '-', variant: 'primary' },
                      { label: 'Shop Name', value: d.shopName || '.' },
                      { label: 'Due',    value: fmt(d.totalDue), variant: 'danger' },
                    ]}
                  />
                ))}

                {grandTotal > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Total', value: '' },
                      { label: 'Due',   value: fmt(grandTotal), variant: 'danger' },
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


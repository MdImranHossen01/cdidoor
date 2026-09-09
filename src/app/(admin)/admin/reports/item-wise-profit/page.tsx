'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

interface ItemProfit {
  _id: string;
  name: string;
  barcode: string;
  category?: string;
  soldQty: number;
  saleRevenue: number;
  purchaseCost: number;
  profitLoss: number;
}

interface GrandTotals {
  soldQty: number;
  saleRevenue: number;
  purchaseCost: number;
  profitLoss: number;
}

export default function ItemWiseProfitPage() {
  const [search,      setSearch]      = useState('');
  const [showroomId,  setShowroomId]  = useState('');
  const [showrooms,   setShowrooms]   = useState<{ value: string; label: string }[]>([]);
  const [limit,       setLimit]       = useState(25);
  const [page,        setPage]        = useState(1);
  const [data,        setData]        = useState<ItemProfit[]>([]);
  const [total,       setTotal]       = useState(0);
  const [grandTotals, setGrandTotals] = useState<GrandTotals>({ soldQty: 0, saleRevenue: 0, purchaseCost: 0, profitLoss: 0 });
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

    fetch(`/api/admin/reports/item-wise-profit?${params}`, { signal: controller.signal })
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
  }, [search, showroomId, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: 'Item Name / Barcode / SKU',
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
          Loading item profit report...
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
                        <th className="py-3 px-4 w-36">Barcode / SKU</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-right w-28">Qty Sold</th>
                        <th className="py-3 px-4 text-right">Sale Revenue</th>
                        <th className="py-3 px-4 text-right">Purchase Cost</th>
                        <th className="py-3 px-4 text-right">Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.map((d) => (
                        <tr
                          key={d._id ?? d.barcode}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                            {d.barcode || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {d.name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                            {d.soldQty} pcs
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-foreground">
                            {fmt(d.saleRevenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                            {fmt(d.purchaseCost)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold">
                            <span className={d.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                              {fmt(d.profitLoss)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotals.soldQty > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground text-xs uppercase tracking-wider">
                          <td colSpan={2} className="py-3.5 px-4 text-right">
                            Grand Totals:
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                            {grandTotals.soldQty} pcs
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-foreground">
                            {fmt(grandTotals.saleRevenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                            {fmt(grandTotals.purchaseCost)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm sm:text-base">
                            <span className={grandTotals.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                              {fmt(grandTotals.profitLoss)}
                            </span>
                          </td>
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
                    key={d._id ?? d.barcode}
                    rows={[
                      { label: 'Barcode',        value: d.barcode ?? '-' },
                      { label: 'Item Name',      value: d.name },
                      { label: 'Qty',            value: `${d.soldQty} pcs` },
                      { label: 'Sale Price',     value: fmt(d.saleRevenue) },
                      { label: 'Purchase Price', value: fmt(d.purchaseCost) },
                      { label: 'Profit/Loss',    value: fmt(d.profitLoss), variant: d.profitLoss >= 0 ? 'success' : 'danger' },
                    ]}
                  />
                ))}

                {grandTotals.soldQty > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Total Sold Qty',   value: `${grandTotals.soldQty} pcs` },
                      { label: 'Total Sale Revenue', value: fmt(grandTotals.saleRevenue) },
                      { label: 'Total Purchase',   value: fmt(grandTotals.purchaseCost) },
                      { label: 'Net Profit/Loss',  value: fmt(grandTotals.profitLoss), variant: grandTotals.profitLoss >= 0 ? 'success' : 'danger' },
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


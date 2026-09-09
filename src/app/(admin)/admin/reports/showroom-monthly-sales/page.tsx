'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar, FilterOption } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

interface MonthSalesItem {
  month: string;
  showroom: {
    name: string;
    phone?: string;
  };
  netSales: number;
  deliveryCost: number;
  total: number;
  salesProfit?: number;
  expense?: number;
  netProfit: number;
  commission?: number;
}

interface GrandTotals {
  netSales: number;
  delivery: number;
  total: number;
  netProfit: number;
  commission?: number;
}

export default function ShowroomMonthlySalesReportPage() {
  const currentYear = new Date().getFullYear();
  const [year,         setYear]         = useState(String(currentYear));
  const [showroomId,   setShowroomId]   = useState('');
  const [data,         setData]         = useState<MonthSalesItem[]>([]);
  const [showroomOpts, setShowroomOpts] = useState<FilterOption[]>([]);
  const [grandTotals,  setGrandTotals]  = useState<GrandTotals>({ netSales: 0, delivery: 0, total: 0, netProfit: 0 });
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (showroomId) params.set('showroom', showroomId);

    fetch(`/api/admin/reports/showroom-monthly-sales?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
          if (json.showrooms) setShowroomOpts(json.showrooms);
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
  }, [year, showroomId]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        monthYear={{
          year,
          onYearChange: (v) => setYear(v),
        }}
        dropdowns={[
          {
            id: 'showroom',
            label: 'Showroom',
            value: showroomId,
            placeholder: '--- All Showrooms ---',
            onChange: (val) => setShowroomId(val),
            options: showroomOpts,
          },
        ]}
        onPrint={() => window.print()}
      />

      {loading && (
        <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">
          Loading showroom monthly sales report...
        </div>
      )}

      {!loading && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-xs tracking-wider">
                    <th className="py-3 px-4 w-36">Month</th>
                    <th className="py-3 px-4">Showroom</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Delivery Cost</th>
                    <th className="py-3 px-4 text-right font-bold">Total</th>
                    <th className="py-3 px-4 text-right">
                      <div>Net Profit</div>
                      <div className="text-[10px] font-normal text-muted-foreground">(Sales Profit-Expense)</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.map((d) => {
                    const np = d.netProfit ?? d.commission ?? 0;
                    return (
                      <tr
                        key={d.month}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {d.month}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">
                            {d.showroom?.name || 'All Showrooms'}
                          </div>
                          {d.showroom?.phone && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {d.showroom.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                          {fmt(d.netSales)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm text-muted-foreground">
                          {fmt(d.deliveryCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-foreground">
                          {fmt(d.total)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono text-sm font-medium ${np >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {fmt(np)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground text-xs uppercase tracking-wider">
                    <td colSpan={2} className="py-3.5 px-4 text-right">
                      Total ({year}):
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                      {fmt(grandTotals.netSales)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-muted-foreground">
                      {fmt(grandTotals.delivery)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm sm:text-base text-foreground">
                      {fmt(grandTotals.total)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${(grandTotals.netProfit ?? grandTotals.commission ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {fmt(grandTotals.netProfit ?? grandTotals.commission ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {data.map((d) => {
              const np = d.netProfit ?? d.commission ?? 0;
              return (
                <ReportCard
                  key={d.month}
                  rows={[
                    { label: 'Month',         value: d.month },
                    {
                      label: 'Showroom',
                      value: `${d.showroom?.name || 'All Showrooms'}${d.showroom?.phone ? '\n' + d.showroom.phone : ''}`,
                      variant: 'primary',
                    },
                    { label: 'Net Sales',     value: fmt(d.netSales) },
                    { label: 'Delivery Cost', value: fmt(d.deliveryCost) },
                    { label: 'Total',         value: fmt(d.total), variant: 'primary' },
                    { label: 'Net Profit',    value: fmt(np), variant: np >= 0 ? 'success' : 'danger' },
                  ]}
                />
              );
            })}

            {grandTotals.total > 0 && (
              <ReportCard
                rows={[
                  { label: 'Total Net Sales',   value: fmt(grandTotals.netSales) },
                  { label: 'Total Delivery',    value: fmt(grandTotals.delivery) },
                  { label: 'Grand Total Sales', value: fmt(grandTotals.total), variant: 'primary' },
                  { label: 'Total Net Profit',  value: fmt(grandTotals.netProfit ?? grandTotals.commission ?? 0), variant: (grandTotals.netProfit ?? grandTotals.commission ?? 0) >= 0 ? 'success' : 'danger' },
                ]}
                className="border-primary/40 bg-primary/5 font-semibold"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

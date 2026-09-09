'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();

interface DayData {
  day: number;
  dateLabel: string;
  netSales: number;
  totalSale: number;
  deliveryCost: number;
  total: number;
  salesProfit: number;
  expense: number;
  netProfit: number;
}

export default function DailyReportPage() {
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [showroomId, setShowroomId] = useState('');
  const [showrooms, setShowrooms] = useState<{ value: string; label: string }[]>([]);
  const [data,  setData]  = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/reports/showrooms')
      .then((res) => res.json())
      .then((json) => setShowrooms(json.showrooms || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    let url = `/api/admin/reports/daily?month=${parseInt(month, 10)}&year=${year}`;
    if (showroomId) url += `&showroom=${encodeURIComponent(showroomId)}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [month, year, showroomId]);

  // Totals for summary
  const totals = data.reduce(
    (acc, d) => ({
      netSales: acc.netSales + (d.netSales || 0),
      deliveryCost: acc.deliveryCost + (d.deliveryCost || 0),
      total: acc.total + (d.total || 0),
      salesProfit: acc.salesProfit + (d.salesProfit || 0),
      expense: acc.expense + (d.expense || 0),
      netProfit: acc.netProfit + (d.netProfit || 0),
    }),
    { netSales: 0, deliveryCost: 0, total: 0, salesProfit: 0, expense: 0, netProfit: 0 }
  );

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 pb-32 md:pb-8">
      <ReportFilterBar
        monthYear={{ month, onMonthChange: setMonth, year, onYearChange: setYear }}
        dropdowns={[
          {
            id: 'showroom',
            label: 'Showroom',
            value: showroomId,
            placeholder: '--- All Showrooms ---',
            onChange: (val) => setShowroomId(val),
            options: showrooms,
          },
        ]}
        onPrint={() => window.print()}
      />

      {loading && <div className="text-center py-10 text-sm text-muted-foreground animate-pulse">Loading...</div>}

      {!loading && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Net Sales</th>
                    <th className="px-4 py-3 text-right">Delivery Cost</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Sales Profit</th>
                    <th className="px-4 py-3 text-right">Expense</th>
                    <th className="px-4 py-3 text-right">Net Profit <span className="normal-case text-[10px] text-muted-foreground block">(Sales Profit - Expense)</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((d) => (
                    <tr key={d.day} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{d.dateLabel}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(d.netSales)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(d.deliveryCost)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(d.total)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmt(d.salesProfit)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">{fmt(d.expense)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${d.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {fmt(d.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/80 font-semibold border-t-2 border-border text-foreground">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totals.netSales)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totals.deliveryCost)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totals.total)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmt(totals.salesProfit)}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">{fmt(totals.expense)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${totals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {fmt(totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {data.map((d) => (
              <ReportCard
                key={d.day}
                rows={[
                  { label: 'Day',          value: d.dateLabel },
                  { label: 'Net Sales',    value: fmt(d.netSales) },
                  { label: 'Delivery Cost',value: fmt(d.deliveryCost) },
                  { label: 'Total',        value: fmt(d.total) },
                  { label: 'Sales Profit', value: fmt(d.salesProfit), variant: d.salesProfit >= 0 ? 'success' : 'danger' },
                  { label: 'Expense',      value: fmt(d.expense),     variant: d.expense > 0 ? 'warning' : 'default' },
                  { label: 'Net Profit',   value: fmt(d.netProfit),   variant: d.netProfit >= 0 ? 'success' : 'danger' },
                ]}
              />
            ))}
            {data.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">No data for {MONTHS[parseInt(month, 10) - 1]} {year}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

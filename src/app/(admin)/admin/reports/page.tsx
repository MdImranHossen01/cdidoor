'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportSummaryBox, SummarySection } from '@/components/admin/reports/ReportSummaryBox';
import { fmt, fmtDate, today } from '@/components/admin/reports/utils';
import { Landmark } from 'lucide-react';

interface SummaryData {
  sales:      { netSales: number; deliveryCost: number; total: number; cashIn: number; due: number };
  collection: { invoice: number; due: number; installment: number; advance: number };
  expense:    { total: number };
  profit:     { netSales: number; salesProfit: number; expense: number; netProfit: number };
  accounts:   { name: string; accountNo: string; debit: number; credit: number; balance: number }[];
}

export default function ReportSummaryPage() {
  const [from, setFrom] = useState(today());
  const [to,   setTo]   = useState(today());
  const [showroomId, setShowroomId] = useState('');
  const [showrooms,  setShowrooms]  = useState<{ value: string; label: string }[]>([]);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetch('/api/admin/reports/showrooms')
      .then((res) => res.json())
      .then((json) => setShowrooms(json.showrooms || []))
      .catch((err) => console.error(err));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    let url = `/api/admin/reports/summary?from=${from}&to=${to}`;
    if (showroomId) url += `&showroom=${encodeURIComponent(showroomId)}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [from, to, showroomId]);

  const sections: SummarySection[] = data
    ? [
        {
          title: 'Sales Summary', icon: 'sales',
          rows: [
            { label: 'Net Sales',     value: data.sales.netSales },
            { label: 'Delivery Cost', value: data.sales.deliveryCost },
            { label: 'Total',         value: data.sales.total },
            { label: 'Payment',       value: data.sales.cashIn },
            { label: 'Due Amount',    value: data.sales.due, variant: data.sales.due > 0 ? 'danger' : 'default' },
          ],
        },
        {
          title: 'Collection Summary', icon: 'collection',
          rows: [
            { label: 'Invoice Collection',     value: data.collection.invoice },
            { label: 'Due Collection',         value: data.collection.due },
            { label: 'Installment Collection', value: data.collection.installment },
            { label: 'Advance Collection',     value: data.collection.advance },
          ],
        },
        {
          title: 'Expense Summary', icon: 'expense',
          rows: [
            { label: 'Total Expense', value: data.expense.total, variant: 'danger' },
          ],
        },
        {
          title: 'Profit Summary', icon: 'profit',
          rows: [
            { label: 'Net Sales',    value: data.profit.netSales },
            { label: 'Sales Profit', value: data.profit.salesProfit, variant: data.profit.salesProfit >= 0 ? 'success' : 'danger' },
            { label: 'Expense',      value: data.profit.expense,     variant: 'danger' },
            { label: 'Net Profit',   value: data.profit.netProfit,   variant: data.profit.netProfit >= 0 ? 'success' : 'danger' },
          ],
          note: '(Sales Profit - Expense)',
        },
      ]
    : [];

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 sm:px-4 pb-32 md:pb-8">
      <ReportFilterBar
        dateRange={{ from, to, onFromChange: setFrom, onToChange: setTo }}
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
        dateSummary={from && to ? `${fmtDate(from)} to ${fmtDate(to)}` : undefined}
      />

      {loading && (
        <div className="flex justify-center py-12 text-muted-foreground text-sm animate-pulse">Loading report...</div>
      )}

      {!loading && data && (
        <div className="space-y-4">
          <ReportSummaryBox sections={sections} />

          {/* Account Summary */}
          {data.accounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Account Summary</h3>
              </div>
              {data.accounts.map((acc, i) => (
                <div key={i} className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                  <div className="divide-y divide-border/50">
                    {[
                      { label: 'Account Name', value: acc.name,                       cls: 'text-primary font-bold' },
                      { label: 'Account No',   value: acc.accountNo,                  cls: 'font-semibold' },
                      { label: 'Debit',        value: fmt(acc.debit),                 cls: 'font-semibold' },
                      { label: 'Credit',       value: fmt(acc.credit),                cls: 'font-semibold' },
                      { label: 'Balance',      value: fmt(acc.balance),               cls: acc.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold' },
                    ].map((row, ri) => (
                      <div key={ri} className={`px-3.5 py-2.5 flex items-center justify-between text-sm gap-2 ${ri % 2 === 1 ? 'bg-muted/10' : ''}`}>
                        <span className="font-semibold text-foreground/90">{row.label}</span>
                        <span className={row.cls}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

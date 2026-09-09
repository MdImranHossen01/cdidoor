'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilterBar, FilterOption } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

interface ShowroomSalesItem {
  _id: string;
  date: string;
  invoiceNo: string;
  documentType?: string;
  showroom: {
    name: string;
    address?: string;
    manager?: string;
    phone?: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  netSales: number;
  deliveryCost: number;
  total: number;
  commissionPercent: number;
  commissionAmount: number;
}

interface GrandTotals {
  sales: number;
  netSales: number;
  delivery: number;
  paid: number;
  due: number;
  commission: number;
}

export default function ShowroomSalesReportPage() {
  const [invoiceNo,   setInvoiceNo]   = useState('');
  const [showroomId,  setShowroomId]  = useState('');
  const [customer,    setCustomer]    = useState('');
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');
  const [limit,       setLimit]       = useState(25);
  const [page,        setPage]        = useState(1);
  const [data,        setData]        = useState<ShowroomSalesItem[]>([]);
  const [total,       setTotal]       = useState(0);
  const [showroomOpts,setShowroomOpts]= useState<FilterOption[]>([]);
  const [grandTotals, setGrandTotals] = useState<GrandTotals>({ sales: 0, netSales: 0, delivery: 0, paid: 0, due: 0, commission: 0 });
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (invoiceNo) {
      params.set('invoiceNo', invoiceNo);
      params.set('customer', invoiceNo);
    } else if (customer) {
      params.set('customer', customer);
    }
    if (showroomId) params.set('showroom', showroomId);
    if (from)       params.set('from', from);
    if (to)         params.set('to', to);

    fetch(`/api/admin/reports/showroom-sales?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
          setTotal(json.total ?? 0);
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
  }, [invoiceNo, showroomId, customer, from, to, page, limit]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 pb-32 md:pb-8 space-y-4">
      {/* Filter Bar */}
      <ReportFilterBar
        search={{
          value: invoiceNo,
          onChange: (v) => { setInvoiceNo(v); setPage(1); },
          placeholder: 'Invoice No / Customer',
        }}
        dropdowns={[
          {
            id: 'showroom',
            label: 'Showroom',
            value: showroomId,
            placeholder: '--- All ---',
            onChange: (val) => { setShowroomId(val); setPage(1); },
            options: showroomOpts,
          },
        ]}
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
          Loading showroom sales report...
        </div>
      )}

      {!loading && (
        <>
          {data.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl text-sm text-muted-foreground shadow-xs">
              No showroom sales records found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-xs tracking-wider">
                        <th className="py-3 px-4 w-32">Date</th>
                        <th className="py-3 px-4 w-28">Invoice No</th>
                        <th className="py-3 px-4">Showroom</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 text-right">Net Sales</th>
                        <th className="py-3 px-4 text-right">Delivery Cost</th>
                        <th className="py-3 px-4 text-right font-bold">Total</th>
                        <th className="py-3 px-4 text-right">Commission</th>
                        <th className="py-3 px-4 text-right">Comm. Amount</th>
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
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">
                              {d.showroom?.name || 'Main Branch'}
                            </div>
                            {(d.showroom?.phone || d.showroom?.manager) && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {d.showroom.phone || d.showroom.manager}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">
                              {d.customer?.name || 'Walk-in-customer'}
                            </div>
                            {d.customer?.phone && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {d.customer.phone}
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
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground">
                            {d.commissionPercent}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {fmt(d.commissionAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {grandTotals.sales > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/50 font-semibold text-foreground text-xs uppercase tracking-wider">
                          <td colSpan={4} className="py-3.5 px-4 text-right">
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
                          <td className="py-3.5 px-4 text-right"></td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {fmt(grandTotals.commission)}
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
                    key={d._id}
                    rows={[
                      { label: 'Date',          value: fmtDate(d.date) },
                      { label: 'Invoice No',    value: d.invoiceNo },
                      {
                        label: 'Showroom',
                        value: `${d.showroom?.name || 'Main Branch'}${d.showroom?.phone ? '\n' + d.showroom.phone : ''}`,
                        variant: 'primary',
                      },
                      {
                        label: 'Customer',
                        value: `${d.customer?.name || 'Walk-in-customer'}${d.customer?.phone ? '\n' + d.customer.phone : ''}`,
                      },
                      { label: 'Net Sales',     value: fmt(d.netSales) },
                      { label: 'Delivery Cost', value: fmt(d.deliveryCost) },
                      { label: 'Total',         value: fmt(d.total) },
                    ]}
                  />
                ))}

                {grandTotals.sales > 0 && (
                  <ReportCard
                    rows={[
                      { label: 'Total Net Sales', value: fmt(grandTotals.netSales) },
                      { label: 'Total Delivery',  value: fmt(grandTotals.delivery) },
                      { label: 'Grand Total',     value: fmt(grandTotals.sales), variant: 'primary' },
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

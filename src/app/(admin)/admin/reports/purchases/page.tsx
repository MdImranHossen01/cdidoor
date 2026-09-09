'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ReportFilterBar } from '@/components/admin/reports/ReportFilterBar';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

interface PurchaseBill {
  _id: string; billNo: string; date: string;
  supplier: { name: string; phone: string; companyName: string };
  total: number; paidAmount: number; dueAmount: number; status: string;
}

export default function PurchaseReportPage() {
  const [invoiceNo,  setInvoiceNo]  = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [limit,      setLimit]      = useState(25);
  const [page,       setPage]       = useState(1);
  const [data,       setData]       = useState<PurchaseBill[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (invoiceNo) params.set('invoiceNo', invoiceNo);
    if (from)      params.set('from', from);
    if (to)        params.set('to', to);

    fetch(`/api/admin/reports/purchases?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json.data ?? []);
          setTotal(json.total ?? 0);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [invoiceNo, from, to, page, limit]);

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 sm:px-4 pb-32 md:pb-8">
      <ReportFilterBar
        search={{ value: invoiceNo, onChange: (v) => { setInvoiceNo(v); setPage(1); }, placeholder: 'Invoice No' }}
        dateRange={{ from, to, onFromChange: (v) => { setFrom(v); setPage(1); }, onToChange: (v) => { setTo(v); setPage(1); } }}
        limit={{ value: limit, onChange: (v) => { setLimit(v); setPage(1); } }}
        onPrint={() => window.print()}
      />

      {loading && <div className="text-center py-10 text-sm text-muted-foreground animate-pulse">Loading...</div>}

      {!loading && (
        <>
          <div className="space-y-3">
            {data.map((d) => (
              <ReportCard
                key={d._id}
                badge={{ text: d.status === 'Paid' ? 'Final' : 'Due', variant: d.status === 'Paid' ? 'success' : 'danger' }}
                rows={[
                  { label: 'Date',       value: fmtDate(d.date) },
                  { label: 'Invoice No', value: d.billNo },
                  { label: 'Supplier',   value: [d.supplier?.name, d.supplier?.phone, d.supplier?.companyName].filter(Boolean).join(' · '), variant: 'primary' },
                  { label: 'Amount',     value: fmt(d.total) },
                  { label: 'Paid Amount',value: fmt(d.paidAmount),  variant: 'success' },
                  { label: 'Due',        value: fmt(d.dueAmount),   variant: d.dueAmount > 0 ? 'danger' : 'muted' },
                ]}
              />
            ))}
            {data.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No records found</div>}
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Showing {data.length} of {total} | Page {page}
          </div>
          <div className="flex justify-center gap-2 mt-2">
            {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/80">Prev</button>}
            {page * limit < total && <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/80">Next</button>}
          </div>
        </>
      )}
    </div>
  );
}

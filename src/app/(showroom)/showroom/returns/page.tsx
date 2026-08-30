'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ShowroomReturnsListPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/returns');
      if (!response.ok) throw new Error('Failed to fetch returns');
      const data = await response.json();
      setReturns(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          {t("sidebar.return_list") || "Return List"}
        </h1>
        <Link href="/showroom/returns/new">
          <Button>
            {t("sidebar.new_return") || "New Return"}
          </Button>
        </Link>
      </div>

      <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return ID</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Refund Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No returns found.
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow key={ret._id}>
                  <TableCell className="font-medium text-primary">
                    {ret.returnId}
                  </TableCell>
                  <TableCell>
                    {ret.bill?.invoiceNo || ret.order?.shortId || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{ret.customerName || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">{ret.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(ret.returnedAt), 'PPP')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {ret.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} Items
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-500">
                    ৳ {ret.refundAmount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">No returns found.</p>
          </div>
        ) : (
          returns.map((ret) => (
            <div key={ret._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
              {/* Top Row: Return ID & Date */}
              <div className="flex items-center justify-between">
                <div className="font-bold text-base text-primary">
                  {ret.returnId}
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(ret.returnedAt), 'PPP')}</span>
              </div>

              {/* Customer details */}
              <div className="border-t border-border/30 pt-2.5 mt-1 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-bold text-foreground">{ret.customerName || 'N/A'}</span>
                </div>
                {ret.phone && (
                  <div className="flex justify-between items-center border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-semibold text-foreground">{ret.phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">Invoice / Order No:</span>
                  <span className="font-semibold text-foreground font-mono">{ret.bill?.invoiceNo || ret.order?.shortId || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">Returned Quantity:</span>
                  <Badge variant="secondary" className="font-bold text-xs py-0.5 px-2">
                    {ret.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} Items
                  </Badge>
                </div>
              </div>

              {/* Footer row: Refund Amount */}
              <div className="flex items-center justify-between border-t pt-2.5 mt-1 bg-red-50/50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                <span className="text-xs uppercase tracking-wider font-bold text-red-700 dark:text-red-400">Refund Amount</span>
                <span className="font-extrabold text-base text-red-600 dark:text-red-400">
                  ৳ {ret.refundAmount.toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

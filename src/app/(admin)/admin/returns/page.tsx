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
import { RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReturnsListPage() {
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
        <Link href="/admin/returns/new">
          <Button>
            {t("sidebar.new_return") || "New Return"}
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow">
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
                    {ret.bill?.invoiceNo || 'N/A'}
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
    </div>
  );
}

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
import { CalendarDays, AlertTriangle } from 'lucide-react';

interface ExpiringBatch {
  id: string;
  productId: string;
  name: string;
  color: string | null;
  size: string | null;
  batchNumber: string;
  expiryDate: string;
  stock: number;
}

export default function UpcomingExpiryPage() {
  const [batches, setBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchUpcomingExpiry = async () => {
    try {
      const response = await fetch('/api/products/upcoming-expiry');
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error fetching upcoming expiry:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingExpiry();
  }, []);

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-orange-500" />
          {t("sidebar.upcoming_expire") || "Upcoming Expire"}
        </h1>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>Expire Date</TableHead>
              <TableHead className="text-right">Remaining Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No products expiring in the next 30 days.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                const daysRemaining = getDaysRemaining(batch.expiryDate);
                const isVerySoon = daysRemaining <= 7;

                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {batch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.color || batch.size ? (
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {batch.color && <span>Color: {batch.color}</span>}
                          {batch.size && <span>Size: {batch.size}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Base Product</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {batch.batchNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(batch.expiryDate), 'PPP')}</span>
                        {isVerySoon ? (
                          <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />
                            {daysRemaining} days left
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {daysRemaining} days left
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {batch.stock}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

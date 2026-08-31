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
    <div className="flex flex-col gap-0 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden md:gap-4">
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-orange-500" />
          {t("sidebar.upcoming_expire") || "Upcoming Expire"}
        </h1>
      </div>

      <div className="hidden md:block px-0 md:px-0 !mt-[1px] md:!mt-4">
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
                const isExpired = daysRemaining <= 0;
                const isVerySoon = daysRemaining <= 7 && !isExpired;

                return (
                  <TableRow key={batch.id} className={isExpired ? "bg-rose-50/30 dark:bg-rose-950/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {batch.name}
                        {isExpired && (
                          <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase">
                            Expired
                          </Badge>
                        )}
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
                        {isExpired ? (
                          <Badge variant="destructive" className="flex items-center gap-1 text-[10px] font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : isVerySoon ? (
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

      {/* Mobile View */}
      <div className="block md:hidden space-y-3 px-0 md:px-0 !mt-[1px] md:!mt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">No products expiring in the next 30 days.</p>
          </div>
        ) : (
          batches.map((batch) => {
            const daysRemaining = getDaysRemaining(batch.expiryDate);
            const isExpired = daysRemaining <= 0;
            const isVerySoon = daysRemaining <= 7 && !isExpired;

            return (
              <div key={batch.id} className={`p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative ${isExpired ? "bg-rose-50/20" : ""}`}>
                {/* Header: Product Name & Expiry Badges */}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-base text-foreground leading-snug">{batch.name}</h4>
                  {isExpired ? (
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase shrink-0 px-2 py-0.5">
                      Expired
                    </Badge>
                  ) : isVerySoon ? (
                    <Badge variant="destructive" className="flex items-center gap-1 text-[10px] uppercase font-bold shrink-0 animate-pulse px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3" /> Urgent
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 shrink-0">
                      Warning
                    </Badge>
                  )}
                </div>

                {/* Details list */}
                <div className="border-t border-border/30 pt-2 mt-1 space-y-2 text-sm">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground">Batch Number:</span>
                    <Badge variant="outline" className="font-mono text-xs py-0 px-1.5 bg-muted/50">{batch.batchNumber}</Badge>
                  </div>
                  <div className="flex justify-between items-start py-0.5 border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">Variant:</span>
                    <span className="font-semibold text-foreground">
                      {batch.color || batch.size ? (
                        <span className="flex flex-col gap-0.5 text-xs text-right">
                          {batch.color && <span>Color: {batch.color}</span>}
                          {batch.size && <span>Size: {batch.size}</span>}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Base Product</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">Expiry Date:</span>
                    <span className="font-semibold text-foreground text-xs">{format(new Date(batch.expiryDate), 'PPP')}</span>
                  </div>
                </div>

                {/* Footer details: Days Remaining & Remaining Stock */}
                <div className="flex items-center justify-between border-t pt-2.5 mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/30 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</span>
                    <span className={`font-bold text-sm ${isExpired ? 'text-rose-600' : isVerySoon ? 'text-red-600' : 'text-orange-600'}`}>
                      {isExpired ? 'Already Expired' : `${daysRemaining} Days Left`}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Remaining Stock</span>
                    <span className="font-extrabold text-sm text-foreground">
                      {batch.stock} Pcs
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

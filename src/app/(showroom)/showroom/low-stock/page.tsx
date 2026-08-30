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
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface LowStockItem {
  id: string;
  productId: string;
  name: string;
  color: string | null;
  size: string | null;
  location: string;
  stock: number;
}

export default function ShowroomLowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchLowStock = async () => {
    try {
      const response = await fetch('/api/products/low-stock');
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching low stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-red-500" />
          {t("sidebar.low_stock") || "Low Stock Products"}
        </h1>
      </div>

      <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Remaining Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No low stock products found! All stock levels are healthy.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isCriticallyLow = item.stock <= 2;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      {item.color || item.size ? (
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {item.color && <span>Color: {item.color}</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Base Product</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-900">
                        {item.location}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCriticallyLow && (
                          <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                        <span className={`font-bold ${isCriticallyLow ? 'text-red-500' : 'text-orange-500'}`}>
                          {item.stock}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">No low stock products found! All stock levels are healthy.</p>
          </div>
        ) : (
          items.map((item) => {
            const isCriticallyLow = item.stock <= 2;

            return (
              <div key={item.id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                {/* Header: Product Name & Alert Icon */}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-base text-foreground leading-snug">{item.name}</h4>
                  {isCriticallyLow && (
                    <Badge variant="destructive" className="flex items-center gap-1 text-[10px] uppercase font-bold shrink-0 animate-pulse px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3" /> Critical
                    </Badge>
                  )}
                </div>

                {/* Variant & Location details */}
                <div className="border-t border-border/30 pt-2 mt-1 space-y-2 text-sm">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground">Location:</span>
                    <Badge variant="outline" className="font-mono text-xs py-0 px-1.5 bg-muted/50">{item.location}</Badge>
                  </div>
                  <div className="flex justify-between items-start py-0.5 border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">Variant:</span>
                    <span className="font-semibold text-foreground">
                      {item.color || item.size ? (
                        <span className="flex flex-col gap-0.5 text-xs text-right">
                          {item.color && <span>Color: {item.color}</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Base Product</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer details: Remaining Stock */}
                <div className="flex items-center justify-between border-t pt-2.5 mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/30">
                  <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Remaining Stock</span>
                  <div className="flex items-center gap-1.5">
                    {isCriticallyLow && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
                    <span className={`font-extrabold text-base ${isCriticallyLow ? 'text-red-600' : 'text-orange-600'}`}>
                      {item.stock} Pcs
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

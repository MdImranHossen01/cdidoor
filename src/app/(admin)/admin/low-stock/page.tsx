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

export default function LowStockPage() {
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

      <div className="rounded-md border bg-card text-card-foreground shadow">
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
    </div>
  );
}

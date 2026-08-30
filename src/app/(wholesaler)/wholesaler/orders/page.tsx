/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Package,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WholesalerOrdersPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, settingsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/settings')
        ]);

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(Array.isArray(data) ? data : []);
        } else {
          toast.error(`Failed to load orders: ${ordersRes.statusText || ordersRes.status}`);
        }

        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch (error) {
        toast.error('Failed to load orders data');
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Placed': return 'secondary';
      case 'Confirmed': return 'default';
      case 'Paid': return 'default';
      case 'Ready for Delivery': return 'default';
      case 'Released for Delivery': return 'default';
      case 'Delivered': return 'default';
      case 'Cancelled': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <AdminTableSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 pt-3 pb-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('store.wholesaler.order_history') || 'Order History'}</h1>
        </div>
        <p className="text-xs text-muted-foreground font-bold">{orders.length} {t('store.wholesaler.total_orders_label') || 'total orders'}</p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">{t('store.dashboard.order_id') || 'Order ID'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.date') || 'Date'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.items') || 'Items'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.total') || 'Total'}</TableHead>
              <TableHead className="font-bold">{t('store.wholesaler.payment') || 'Payment'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.status') || 'Status'}</TableHead>
              <TableHead className="text-right font-bold w-[130px]">{t('store.dashboard.action') || 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">{t('store.dashboard.no_orders') || "You haven't placed any orders yet."}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-primary">#{order?._id?.slice(-8).toUpperCase() || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{Array.isArray(order?.items) ? order.items.length : 0} {t('store.dashboard.items_count') || 'items'}</span>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {order.items?.slice(0, 2).map((item: any, idx: number) => (
                          <span key={idx} className="text-[10px] text-muted-foreground truncate">
                            {item.quantity}× {item.name}
                          </span>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{order.items.length - 2} {t('store.wholesaler.more') || 'more'}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">৳{typeof order?.totalAmount === 'number' ? Math.round(order.totalAmount).toLocaleString('en-BD') : '0'}</TableCell>
                  <TableCell>
                    <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-[10px]">
                      {order.paymentStatus || order.paymentMethod || 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getStatusColor(order.status) as any}>
                        {order.status}
                      </Badge>
                      {order.shippingDetails?.trackingUrl && (
                        <a
                          href={order.shippingDetails.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-1"
                        >
                          <Truck className="h-3 w-3" /> {t('store.dashboard.track_parcel') || 'Track Parcel'}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={settings ? "Download Invoice" : "Loading settings..."}
                        disabled={!settings}
                        onClick={() => settings && generateInvoicePDF(order, settings)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 group"
                        onClick={() => router.push(`/wholesaler/orders/${order._id}`)}
                      >
                        {t('store.dashboard.details') || 'Details'}
                        <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (Matches Admin Orders Pattern) */}
      <div className="block md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center text-muted-foreground text-xs space-y-2">
            <Package className="h-8 w-8 mx-auto opacity-20" />
            <p>{t('store.dashboard.no_orders') || "You haven't placed any orders yet."}</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              className="rounded-xl border bg-background p-4 shadow-sm space-y-3"
            >
              {/* Header: Order ID, Date & Status Badge */}
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex flex-col">
                  <span className="font-mono text-sm sm:text-base font-black text-primary">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
                <Badge variant={getStatusColor(order.status) as any} className="text-xs sm:text-sm">
                  {order.status}
                </Badge>
              </div>

              {/* Order Items */}
              <div className="space-y-1.5">
                <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Items ({Array.isArray(order.items) ? order.items.length : 0})</span>
                <div className="flex flex-wrap gap-1.5">
                  {order.items?.map((item: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs sm:text-sm px-2 py-0.5 font-medium bg-muted/30">
                      {item.quantity}× {item.name}
                      {(item.color || item.size) && (
                        <span className="text-muted-foreground ml-1">
                          ({[item.color, item.size].filter(Boolean).join('/')})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Total & Payment Info */}
              <div className="flex items-center justify-between pt-2 border-t text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{t('store.wholesaler.payment') || 'Payment'}:</span>
                  <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-xs sm:text-sm py-0 px-1.5">
                    {order.paymentStatus || 'Pending'}
                  </Badge>
                  {order.paymentMethod && (
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">({order.paymentMethod})</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm text-muted-foreground mr-1">{t('store.dashboard.total') || 'Total'}:</span>
                  <span className="font-black text-sm sm:text-base text-foreground">৳{typeof order?.totalAmount === 'number' ? Math.round(order.totalAmount).toLocaleString('en-BD') : '0'}</span>
                </div>
              </div>

              {/* Tracking Link if available */}
              {order.shippingDetails?.trackingUrl && (
                <div className="pt-1">
                  <a
                    href={order.shippingDetails.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 p-2 rounded-lg"
                  >
                    <Truck className="h-3.5 w-3.5" /> {t('store.dashboard.track_parcel') || 'Track Parcel'}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-9"
                  disabled={!settings}
                  onClick={() => settings && generateInvoicePDF(order, settings)}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {t('store.dashboard.invoice') || 'Invoice'}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs h-9 text-white"
                  onClick={() => router.push(`/wholesaler/orders/${order._id}`)}
                >
                  {t('store.dashboard.details') || 'Details'}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

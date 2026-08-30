'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import {
  ShoppingBag, DollarSign, Clock, TrendingUp,
  Loader2, AlertTriangle, ArrowRight, Package, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

function StatCard({ title, value, sub, icon: Icon, borderSideColor = "border-l-primary" }: {
  title: string; value: string; sub?: string; icon: any; borderSideColor?: string;
}) {
  return (
    <Card className={`bg-primary/5 border-primary/10 border-l-2 ${borderSideColor} relative overflow-hidden group h-full shadow-sm hover:shadow transition-all`}>
      {/* Mobile Layout */}
      <div className="flex flex-col p-3 sm:hidden justify-between h-full min-h-[90px] gap-2 items-center text-center">
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-base font-black text-primary leading-tight">
            {value}
          </span>
          {sub && (
            <span className="text-[9px] font-semibold text-muted-foreground mt-0.5 leading-none">
              {sub}
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold text-foreground/80 leading-tight mt-auto">
          {title}
        </span>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
          <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
          <Icon className="h-4 w-4 text-primary shrink-0" />
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-xl md:text-2xl font-extrabold text-primary">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
        </CardContent>
      </div>
    </Card>
  );
}

const statusColors: Record<string, string> = {
  Delivered: 'default',
  Cancelled: 'destructive',
  Pending: 'secondary',
  Confirmed: 'secondary',
  Processing: 'secondary',
  Shipped: 'secondary',
};

export default function WholesalerDashboard() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wholesaler/dashboard/stats')
      .then(res => res.ok ? res.json() : res.json().then(e => Promise.reject(e.message)))
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(typeof err === 'string' ? err : 'Failed to load dashboard'); setLoading(false); });
  }, []);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const fmt = (n: number) => `৳${n.toLocaleString('en-BD')}`;

  return (
    <div className="flex-1 space-y-4 pt-3 pb-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-2xl font-bold tracking-tight truncate">
            {t('store.wholesaler.welcome') || 'স্বাগতম,'} {session?.user?.name}!
          </h2>
        </div>
        <Button asChild className="w-full md:w-auto text-white font-medium shadow-sm">
          <Link href="/shop" className="justify-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('store.wholesaler.buy_products') || 'পণ্য কিনুন (Wholesale Rate)'}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Link href="/wholesaler/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <StatCard
            title={t('store.wholesaler.total_orders') || 'Total Orders'}
            value={`${data?.stats?.totalOrders || 0}`}
            sub={t('store.wholesaler.all_time') || 'All time'}
            icon={ShoppingBag}
          />
        </Link>
        <Link href="/wholesaler/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <StatCard
            title={t('store.wholesaler.pending_orders') || 'Pending Orders'}
            value={`${data?.stats?.pendingOrders || 0}`}
            sub={t('store.wholesaler.processing') || 'Processing'}
            icon={Clock}
          />
        </Link>
        <div className="transition-transform hover:scale-[1.02]">
          <StatCard
            title={t('store.wholesaler.total_purchases') || 'Total Purchases'}
            value={fmt(data?.stats?.totalSpent || 0)}
            sub={t('store.wholesaler.all_time') || 'All time'}
            icon={DollarSign}
          />
        </div>
        <div className="transition-transform hover:scale-[1.02]">
          <StatCard
            title={t('store.wholesaler.this_month') || 'This Month'}
            value={fmt(data?.stats?.monthSpent || 0)}
            sub={t('store.wholesaler.current_month') || 'Current month'}
            icon={TrendingUp}
          />
        </div>
        <div className="col-span-2 sm:col-span-1 md:col-span-1 transition-transform hover:scale-[1.02]">
          <StatCard
            title={t('store.wholesaler.due_balance') || 'Due Balance'}
            value={fmt(data?.stats?.totalDue || 0)}
            sub={t('store.wholesaler.pending_payable') || 'Pending payable'}
            icon={AlertTriangle}
            borderSideColor="border-l-rose-500"
          />
        </div>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('store.wholesaler.recent_orders') || 'সাম্প্রতিক অর্ডার'}</CardTitle>
            <CardDescription>{t('store.wholesaler.last_5_orders') || 'আপনার সর্বশেষ ৫টি অর্ডার'}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/wholesaler/orders">{t('store.wholesaler.see_all') || 'সব দেখুন'} <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data?.recentOrders?.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Package className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t('store.wholesaler.no_orders_yet') || 'এখনো কোনো অর্ডার করা হয়নি।'}</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/shop">{t('store.wholesaler.place_first_order') || 'প্রথম অর্ডার করুন'}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.recentOrders?.map((order: any) => (
                <div key={order._id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Order #{order.shortId}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold">{fmt(order.totalAmount || 0)}</p>
                    <Badge variant={(statusColors[order.status] || 'secondary') as any} className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t('store.wholesaler.wholesale_shopping') || 'পাইকারি মূল্যে কেনাকাটা'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('store.wholesaler.wholesale_desc') || 'আপনি পাবলিক স্টোর থেকে পণ্য কিনতে পারবেন এবং সকল পণ্যে স্বয়ংক্রিয়ভাবে পাইকারি মূল্য প্রযোজ্য হবে। ইনভয়েসেও পাইকারি রেট দেখানো হবে।'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

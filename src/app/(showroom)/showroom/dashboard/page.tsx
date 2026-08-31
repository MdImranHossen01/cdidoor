'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import {
  ShoppingBag, DollarSign, TrendingUp, Package,
  Loader2, AlertTriangle, ArrowRight, Store,
  Clock, Users, Wallet, Landmark, ArrowUpRight,
  ArrowDownLeft, CalendarClock, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { format, subDays, parseISO, isAfter, startOfToday } from 'date-fns';
import { CartesianGrid, Area, AreaChart, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)",
  },
  orders: {
    label: "Total Sales",
    color: "#fb923c",
  },
  expense: {
    label: "Expense",
    color: "#ef4444",
  },
  netIncome: {
    label: "Net Income",
    color: "#22c55e",
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label, activeChart }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const dateStr = label ? format(new Date(label), 'dd MMMM yyyy') : '';

  let metricLabel = '';
  let metricColorClass = '';
  let getValue = (vals: any) => 0;
  let formatValue = (val: number) => '';

  if (activeChart === 'revenue') {
    metricLabel = 'Revenue';
    metricColorClass = 'text-primary';
    getValue = (vals: any) => vals.revenue || 0;
    formatValue = (val: number) => `৳${Math.round(val).toLocaleString()}`;
  } else if (activeChart === 'orders') {
    metricLabel = 'Sales Count';
    metricColorClass = 'text-orange-600';
    getValue = (vals: any) => vals.orders || 0;
    formatValue = (val: number) => `${Math.round(val).toLocaleString()} orders`;
  } else if (activeChart === 'expense') {
    metricLabel = 'Expense';
    metricColorClass = 'text-red-600';
    getValue = (vals: any) => vals.expense || 0;
    formatValue = (val: number) => `৳${Math.round(val).toLocaleString()}`;
  } else if (activeChart === 'netIncome') {
    metricLabel = 'Net Income';
    metricColorClass = 'text-green-600';
    getValue = (vals: any) => (vals.revenue || 0) - (vals.expense || 0);
    formatValue = (val: number) => `৳${Math.round(val).toLocaleString()}`;
  }

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-xl shadow-xl p-4 min-w-[200px] text-xs space-y-2 z-50 pointer-events-none select-none">
      <div className="border-b pb-1.5">
        <p className="font-bold text-sm text-foreground">{dateStr}</p>
      </div>
      <div className="flex justify-between items-center py-1">
        <span className="font-medium text-muted-foreground">{metricLabel}</span>
        <span className={`font-bold ${metricColorClass}`}>{formatValue(getValue(data))}</span>
      </div>
    </div>
  );
};

export default function ShowroomDashboard() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("revenue");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filterByDate, setFilterByDate] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [debouncedDateRange, setDebouncedDateRange] = useState(dateRange);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateRange(dateRange);
    }, 500);
    return () => clearTimeout(timer);
  }, [dateRange]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchStats = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const queryParams: any = {
        filterByDate: filterByDate ? 'true' : 'false'
      };
      if (filterByDate) {
        queryParams.from = debouncedDateRange.from;
        queryParams.to = debouncedDateRange.to;
      }
      const query = new URLSearchParams(queryParams).toString();

      const response = await fetch(`/api/showroom/dashboard/stats?${query}`, {
        signal: controller.signal,
      });
      if (response.ok) {
        const stats = await response.json();
        setData(stats);
        setError(null);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch dashboard statistics');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch stats:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await Promise.resolve();
      if (isMounted) {
        fetchStats();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [debouncedDateRange, filterByDate]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchStats();
    };
    window.addEventListener('refresh-dashboard', handleRefresh);
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
    };
  }, [debouncedDateRange, filterByDate]);

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    const newDate = parseISO(value);
    const today = startOfToday();

    // Block future dates
    if (isAfter(newDate, today)) {
      setDateRange(prev => ({ ...prev, [key]: format(today, 'yyyy-MM-dd') }));
      return;
    }

    setDateRange(prev => {
      const nextRange = { ...prev, [key]: value };
      const fromDate = parseISO(nextRange.from);
      const toDate = parseISO(nextRange.to);

      // Ensure from <= to
      if (isAfter(fromDate, toDate)) {
        if (key === 'from') {
          return { ...nextRange, to: value };
        } else {
          return { ...nextRange, from: value };
        }
      }
      return nextRange;
    });
  };

  const total = useMemo(() => {
    if (!data?.chartData) return { revenue: 0, orders: 0, expense: 0, netIncome: 0 };
    const revenue = data.chartData.reduce((acc: number, curr: any) => acc + curr.revenue, 0);
    const expense = data.chartData.reduce((acc: number, curr: any) => acc + (curr.expense || 0), 0);
    return {
      revenue,
      orders: data.chartData.reduce((acc: number, curr: any) => acc + curr.orders, 0),
      expense,
      netIncome: revenue - expense,
    };
  }, [data]);

  const processedChartData = useMemo(() => {
    if (!data?.chartData) return [];

    if (!filterByDate) {
      return data.chartData.map((item: any) => ({
        ...item,
        netIncome: item.revenue - (item.expense || 0)
      }));
    }

    const start = parseISO(dateRange.from);
    const end = parseISO(dateRange.to);
    const result = [];

    const dataMap = new Map(data.chartData.map((item: any) => [item.date, item]));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const existing = dataMap.get(dateStr);
      if (existing) {
        result.push({
          ...existing,
          netIncome: (existing as any).revenue - ((existing as any).expense || 0)
        });
      } else {
        result.push({
          date: dateStr,
          revenue: 0,
          orders: 0,
          expense: 0,
          netIncome: 0
        });
      }
    }
    return result;
  }, [data, filterByDate, dateRange]);

  if (loading && !data) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-8 w-8" />
          <h3 className="text-xl font-bold">Dashboard Error</h3>
        </div>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchStats()}>Retry</Button>
      </div>
    );
  }
  const fmt = (n: number) => `৳${Math.round(n).toLocaleString('en-BD')}`;
  const stats = data?.stats;
  return (
    <div className="flex-1 space-y-6 px-0 pt-[1px] pb-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{data?.showroom?.name || 'My Showroom'}</h2>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {t('store.showroom.welcome') || 'à¦¸à§ à¦¬à¦¾à¦—à¦¤à¦®, '} {session?.user?.name}! {t('store.showroom.dashboard_desc') || 'à¦ à¦–à¦¾à¦¨à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦¶à§‹-à¦°à§ à¦®à§‡à¦° à¦¸à¦¾à¦®à¦¾à¦°à¦¿ à¦¦à§‡à¦–à§ à¦¨à¥¤'}
          </p>
          {data?.showroom?.address && (
            <p className="text-xs text-muted-foreground hidden md:block">{data.showroom.address}</p>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <label className="flex items-center gap-1.5 px-2 cursor-pointer select-none text-xs font-semibold text-foreground shrink-0">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-muted-foreground/30 text-primary accent-primary cursor-pointer"
              />
              <span>{t('store.showroom.filter_by_date') || 'Filter by Date'}</span>
            </label>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                disabled={!filterByDate}
                className={`h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1 ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <span className={`text-muted-foreground text-[10px] shrink-0 ${!filterByDate ? 'opacity-40' : ''}`}>to</span>
              <Input
                type="date"
                disabled={!filterByDate}
                className={`h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1 ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} className="h-10 px-4 font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {/* Mobile controls toggle */}
        <div className="flex items-center gap-2 md:hidden w-full py-[1px]">
          <Button variant="outline" size="sm" onClick={fetchStats} className="h-9 px-3 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex-1 h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            <span className="text-xs font-bold">Filter</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Mobile Filters Wrapper (Smooth transition like income-expense) */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full px-2 !mt-0 ${
        showMobileFilters 
          ? 'grid-rows-[1fr] opacity-100 !mt-[1px] visible' 
          : 'grid-rows-[0fr] opacity-0 invisible h-0'
      }`}>
        <div className="overflow-hidden w-full">
          <div className="bg-muted/30 p-3 rounded-lg border flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={filterByDate}
                  onChange={(e) => setFilterByDate(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-muted-foreground/30 text-primary accent-primary cursor-pointer"
                />
                <span>{t('store.showroom.filter_by_date') || 'Filter by Date'}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">{t('store.showroom.from') || 'From'}</span>
                <Input
                  type="date"
                  disabled={!filterByDate}
                  className={`h-9 w-full bg-background text-xs ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                  value={dateRange.from}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">{t('store.showroom.to') || 'To'}</span>
                <Input
                  type="date"
                  disabled={!filterByDate}
                  className={`h-9 w-full bg-background text-xs ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                  value={dateRange.to}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Operational & Financial Cards */}
      <div className="grid gap-2 md:gap-4 grid-cols-3 px-2 md:px-0 !mt-[1px] md:!mt-6">
        {/* Pending Orders Card */}
        <Link href="/showroom/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-orange-500/5 border-orange-500/10 border-l-2 border-l-orange-500 relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-semibold truncate">{t('store.showroom.pending_orders') || 'Pending Orders'}</CardTitle>
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600 shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
              <div className="text-[11px] sm:text-lg md:text-2xl font-extrabold text-orange-700">{stats?.pendingOrdersCount || 0}</div>
              <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('store.showroom.requires_attention') || 'Requires attention'}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Total Customers Card */}
        <div className="block cursor-default">
          <Card className="bg-blue-500/5 border-blue-500/10 border-l-2 border-l-blue-500 relative overflow-hidden group h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-semibold truncate">{t('store.showroom.total_customers') || 'Total Customers'}</CardTitle>
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
              <div className="text-[11px] sm:text-lg md:text-2xl font-extrabold text-blue-700">{stats?.totalUsers || 0}</div>
              <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('store.showroom.across_all_time') || 'Across all time'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Cash Balance */}
        <Link href="/showroom/expenses" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-emerald-500/5 border-emerald-500/10 border-l-2 border-l-emerald-500 relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-semibold truncate">{t('store.showroom.cash_balance') || 'Cash Balance'}</CardTitle>
              <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
              <div className="text-[11px] sm:text-lg md:text-2xl font-extrabold text-emerald-700">
                {fmt(stats?.cashBalance || 0)}
              </div>
              <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('store.showroom.showroom_vault_cash') || 'Showroom vault cash'}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Bank Balance */}
        <Link href="/showroom/expenses" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-indigo-500/5 border-indigo-500/10 border-l-2 border-l-indigo-500 relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-semibold truncate">{t('store.showroom.bank_balance') || 'Bank Balance'}</CardTitle>
              <Landmark className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-600 shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
              <div className="text-[11px] sm:text-lg md:text-2xl font-extrabold text-indigo-700">
                {fmt(stats?.bankBalance || 0)}
              </div>
              <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('store.showroom.liquid_bank_accounts') || 'Liquid bank accounts'}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Account Receivable */}
        <div className="block cursor-default">
          <Card className="bg-blue-500/5 border-blue-500/10 border-l-2 border-l-blue-500 relative overflow-hidden group h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-semibold truncate">{t('store.showroom.accounts_receivable') || 'Accounts Receivable'}</CardTitle>
              <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
              <div className="text-[11px] sm:text-lg md:text-2xl font-extrabold text-blue-700">
                {fmt(stats?.accountReceivable || 0)}
              </div>
              <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[8px] sm:text-xs font-semibold text-rose-600 truncate">
                <span>{t('store.showroom.matured') || 'Matured: '} {fmt(stats?.maturedReceivable || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Performance Trends Chart */}
      <div className="grid gap-4 grid-cols-1">
        <Card className="col-span-full">
          <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-6 md:py-6">
              <CardTitle className="text-lg md:text-xl">{t('store.showroom.performance_trends') || 'Performance Trends'}</CardTitle>
            </div>
            <div className="flex w-full border-t sm:border-t-0">
              {(["revenue", "orders", "expense", "netIncome"] as const).map((key) => (
                <button
                  key={key}
                  data-active={activeChart === key}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center gap-1 border-r last:border-r-0 px-1 py-2.5 sm:px-6 sm:py-4 md:px-8 md:py-6 text-center sm:text-left sm:items-start data-[active=true]:bg-primary data-[active=true]:text-white sm:border-l sm:border-r-0 transition-colors group"
                  onClick={() => setActiveChart(key as any)}
                >
                  <span className="text-[9px] sm:text-xs text-muted-foreground group-data-[active=true]:text-white/80 whitespace-nowrap">
                    {chartConfig[key].label}
                  </span>
                  <span className="text-xs sm:text-base md:text-2xl leading-none font-bold">
                    {key === 'orders' ? total[key].toLocaleString() : `৳${total[key].toLocaleString()}`}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-1 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] md:h-[350px] w-full"
            >
              <AreaChart data={processedChartData} margin={{ left: 12, right: 12, top: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillNetIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-netIncome)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-netIncome)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={32}
                  tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', opacity: 0.5 }}
                  content={<CustomTooltip activeChart={activeChart} />}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  y={total[activeChart] / (processedChartData?.length || 1)}
                  label={{
                    value: 'Avg',
                    position: 'insideRight',
                    fill: activeChart === "revenue" ? 'var(--primary)' :
                      activeChart === "orders" ? '#fb923c' :
                        activeChart === "expense" ? '#ef4444' : '#22c55e',
                    fontSize: 10
                  }}
                  stroke={
                    activeChart === "revenue" ? "var(--primary)" :
                      activeChart === "orders" ? "#fb923c" :
                        activeChart === "expense" ? "#ef4444" : "#22c55e"
                  }
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Area
                  dataKey="revenue"
                  type="natural"
                  fill="url(#fillRevenue)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  hide={activeChart !== "revenue"}
                />
                <Area
                  dataKey="orders"
                  type="natural"
                  fill="url(#fillOrders)"
                  stroke="var(--color-orders)"
                  strokeWidth={2}
                  hide={activeChart !== "orders"}
                />
                <Area
                  dataKey="expense"
                  type="natural"
                  fill="url(#fillExpense)"
                  stroke="var(--color-expense)"
                  strokeWidth={2}
                  hide={activeChart !== "expense"}
                />
                <Area
                  dataKey="netIncome"
                  type="natural"
                  fill="url(#fillNetIncome)"
                  stroke="var(--color-netIncome)"
                  strokeWidth={2}
                  hide={activeChart !== "netIncome"}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Orders & Stock Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('store.showroom.recent_orders') || 'à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦…à¦°à§à¦¡à¦¾à¦°'}</CardTitle>
              <CardDescription>{t('store.showroom.last_5_orders') || 'à¦¶à§‹-à¦°à§à¦®à§‡à¦° à¦¸à¦°à§à¦¬à¦¶à§‡à¦· à§«à¦Ÿà¦¿ à¦…à¦°à§à¦¡à¦¾à¦°'}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/showroom/orders">{t('store.showroom.see_all') || 'à¦¸à¦¬ à¦¦à§‡à¦–à§à¦¨'} <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data?.recentOrders?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('store.showroom.no_orders') || 'à¦•à§‹à¦¨à§‹ à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à§‡à¦‡'}</p>
            ) : (
              <div className="space-y-2">
                {data?.recentOrders?.map((order: any) => (
                  <div key={order._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.customerName || order.orderId}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(order.totalAmount || 0)}</p>
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('store.showroom.stock_status') || 'à¦¸à§à¦Ÿà¦• à¦¸à§à¦Ÿà§à¦¯à¦¾à¦Ÿà¦¾à¦¸'}</CardTitle>
              <CardDescription>{t('store.showroom.low_stock_first') || 'à¦•à¦® à¦¸à§à¦Ÿà¦• à¦†à¦—à§‡ à¦¦à§‡à¦–à¦¾à¦¨à§‹ à¦¹à¦šà§à¦›à§‡'}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/showroom/stock">{t('store.showroom.see_all') || 'à¦¸à¦¬ à¦¦à§‡à¦–à§à¦¨'} <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data?.stockItems?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('store.showroom.no_products') || 'à¦•à§‹à¦¨à§‹ à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ à¦¨à§‡à¦‡'}</p>
            ) : (
              <div className="space-y-2">
                {data?.stockItems?.slice(0, 6).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    </div>
                    <Badge
                      variant={item.stock === 0 ? 'destructive' : item.stock < 5 ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {item.stock === 0 ? (t('store.showroom.out_of_stock') || 'আউট অব স্টক') : `${item.stock} ${t('store.showroom.pcs') || 'পিস'}`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

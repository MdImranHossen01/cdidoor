'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { CartesianGrid, Area, AreaChart, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import {
  DollarSign,
  Users,
  ShoppingBag,
  AlertTriangle,
  Clock,
  Wallet,
  Loader2,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Star,
  UserPlus,
  BarChart3,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarClock,
  RefreshCw,
  Briefcase,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { format, subDays, parseISO, isAfter, startOfToday } from 'date-fns';

const CustomTooltip = ({ active, payload, label, activeChart }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const dateStr = label ? format(parseISO(label), 'dd MMMM yyyy') : '';
  const breakdown = data.showroomBreakdown || {};
  const showroomsList = Object.entries(breakdown);

  // Determine active metric properties
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
    metricLabel = 'Sales';
    metricColorClass = 'text-orange-600';
    getValue = (vals: any) => vals.orders || 0;
    formatValue = (val: number) => val.toLocaleString();
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

  // Filter showrooms that have a non-zero value for the active metric
  const activeShowroomsList = showroomsList.filter(([_, vals]: any) => getValue(vals) !== 0);

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-xl shadow-xl p-4 min-w-[240px] max-w-[320px] text-xs space-y-3 z-50 pointer-events-none select-none">
      <div className="border-b pb-2">
        <p className="font-bold text-sm text-foreground">{dateStr}</p>
      </div>

      <div className="space-y-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-muted-foreground font-semibold">
              <th className="py-1">Showroom</th>
              <th className="py-1 text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {activeShowroomsList.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-2 text-center text-muted-foreground italic">
                  No {metricLabel.toLowerCase()} data
                </td>
              </tr>
            ) : (
              activeShowroomsList.map(([name, vals]: any) => (
                <tr key={name} className="border-b border-muted/20 last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-1.5 font-medium text-foreground truncate max-w-[150px]">{name}</td>
                  <td className={`py-1.5 text-right font-semibold ${metricColorClass}`}>
                    {formatValue(getValue(vals))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-double border-muted font-bold text-foreground bg-muted/30">
              <td className="py-2 px-1">Total</td>
              <td className={`py-2 text-right ${metricColorClass}`}>
                {formatValue(
                  activeChart === 'revenue' ? data.revenue :
                    activeChart === 'orders' ? data.orders :
                      activeChart === 'expense' ? data.expense : (data.revenue - data.expense)
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("revenue");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileTab, setMobileTab] = useState<'cards' | 'charts'>('cards');
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [showroomsList, setShowroomsList] = useState<{ _id: string; name: string }[]>([]);

  // Date filter state
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

  const fetchStats = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        from: debouncedDateRange.from,
        to: debouncedDateRange.to,
      };
      if (selectedShowroom !== 'all') {
        params.showroom = selectedShowroom;
      }
      const query = new URLSearchParams(params).toString();

      const response = await fetch(`/api/admin/dashboard/stats?${query}`, {
        signal: controller.signal,
      });
      if (response.ok) {
        const stats = await response.json();
        setData(stats);
        if (stats.showrooms) {
          setShowroomsList(stats.showrooms);
        }
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || `Failed to fetch: ${response.status}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch stats:', error);
      setError(error.message || 'An unexpected error occurred');
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
  }, [debouncedDateRange, selectedShowroom]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchStats();
    };
    window.addEventListener('refresh-dashboard', handleRefresh);
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
    };
  }, [debouncedDateRange, selectedShowroom]);

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
          netIncome: 0,
          showroomBreakdown: {}
        });
      }
    }
    return result;
  }, [data, dateRange]);

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

  const { stats, recentOrders, lowStockProducts, topSellingProducts, topCustomers, chartData } = data || {};

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Title Row */}
        <div className="flex flex-row items-center justify-between gap-2">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight whitespace-nowrap">{t("dashboard.overview")}</h2>
          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={fetchStats} className="h-9 px-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <Filter className="mr-1.5 h-4 w-4" />
              <span className="text-xs font-bold">Filter</span>
            </Button>
          </div>
        </div>

        {/* Desktop Filter Row (below title) */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {/* Showroom Dropdown */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border">
            <div className="flex items-center gap-1 px-2 shrink-0">
              <Store className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Showroom</span>
            </div>
            <select
              value={selectedShowroom}
              onChange={(e) => setSelectedShowroom(e.target.value)}
              className="h-8 bg-transparent text-xs border-none outline-none cursor-pointer pr-2 font-medium"
            >
              <option value="all">All Showrooms</option>
              <option value="online">🌐 Online / Central</option>
              {showroomsList.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <div className="flex items-center gap-1 px-2 shrink-0">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Range</span>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                className="h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <span className="text-muted-foreground text-[10px] shrink-0">to</span>
              <Input
                type="date"
                className="h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchStats} className="h-10 px-4 font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>

          {/* Active filter badge */}
          {selectedShowroom !== 'all' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Store className="h-2.5 w-2.5" />
              {selectedShowroom === 'online'
                ? '🌐 Online / Central'
                : showroomsList.find(s => s._id === selectedShowroom)?.name || 'Showroom'}
            </span>
          )}
        </div>
      </div>

      {/* Collapsible Mobile Filters Wrapper */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full ${showMobileFilters
          ? 'grid-rows-[1fr] opacity-100 mt-2 visible'
          : 'grid-rows-[0fr] opacity-0 invisible h-0'
        }`}>
        <div className="overflow-hidden w-full">
          <div className="bg-muted/30 p-3 rounded-lg border flex flex-col gap-3">
            {/* Showroom filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground border-b pb-1">
                <Store className="h-3 w-3" />
                <span>SHOWROOM FILTER</span>
              </div>
              <select
                value={selectedShowroom}
                onChange={(e) => setSelectedShowroom(e.target.value)}
                className="h-9 w-full bg-background text-xs border rounded-md px-2 outline-none cursor-pointer font-medium"
              >
                <option value="all">All Showrooms</option>
                <option value="online">🌐 Online / Central</option>
                {showroomsList.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-1">
              <span>DATE FILTER</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">From</span>
                <Input
                  type="date"
                  className="h-9 w-full bg-background text-xs"
                  value={dateRange.from}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">To</span>
                <Input
                  type="date"
                  className="h-9 w-full bg-background text-xs"
                  value={dateRange.to}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs (only visible on mobile) */}
      <div className="flex md:hidden border border-muted/50 bg-muted/20 rounded-lg p-0.5 mt-2 gap-1">
        <button
          onClick={() => setMobileTab('cards')}
          className={`flex-1 py-2 text-center text-xs font-extrabold rounded-md transition-all ${mobileTab === 'cards'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }`}
        >
          Overview Cards
        </button>
        <button
          onClick={() => setMobileTab('charts')}
          className={`flex-1 py-2 text-center text-xs font-extrabold rounded-md transition-all ${mobileTab === 'charts'
              ? 'bg-primary text-white shadow'
              : 'text-muted-foreground hover:bg-muted/50'
            }`}
        >
          Trends & Reports
        </button>
      </div>

      <div className={`grid gap-2 sm:gap-4 grid-cols-3 ${mobileTab === 'cards' ? 'grid' : 'hidden md:grid'}`}>
        {/* Pending Orders Card */}
        <Link href="/admin/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  {stats?.pendingOrdersCount || 0}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                Pending Orders
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.pending_orders")}</CardTitle>
                <Clock className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">{stats?.pendingOrdersCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.requires_attention")}</p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Total Customers Card */}
        <Link href="/admin/users" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  {stats?.totalUsers || 0}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.total_customers")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.total_customers")}</CardTitle>
                <Users className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.across_all_time")}</p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Cash Balance */}
        <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.cashBalance || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.cash_balance")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.cash_balance")}</CardTitle>
                <Wallet className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.cashBalance || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {selectedShowroom === 'all' ? t("dashboard.physical_cash_on_hand") : selectedShowroom === 'online' ? 'Online/central cash flow' : 'Showroom net cash flow'}
                </p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Bank Balance */}
        <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.bankBalance || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.bank_balance")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.bank_balance")}</CardTitle>
                <Landmark className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.bankBalance || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {selectedShowroom === 'all' ? t("dashboard.liquid_bank_accounts") : selectedShowroom === 'online' ? 'Online/central bank flow' : 'Showroom net bank flow'}
                </p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Account Receivable */}
        <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.accountReceivable || 0).toLocaleString()}
                </span>
                <div className="text-[9px] font-bold text-rose-600 leading-none">
                  Matured: ৳{Math.round(stats?.maturedReceivable || 0).toLocaleString()}
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.accounts_receivable")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.accounts_receivable")}</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.accountReceivable || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-rose-600 truncate">
                  <span>{t("dashboard.matured")} ৳{Math.round(stats?.maturedReceivable || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Supplier Account Payable */}
        <Link href="/admin/supplier-bills" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.supplierPayable || 0).toLocaleString()}
                </span>
                <div className="text-[9px] font-bold text-red-600 leading-none">
                  Matured: ৳{Math.round(stats?.maturedPayable || 0).toLocaleString()}
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.accounts_payable")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.accounts_payable")}</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.supplierPayable || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600 truncate">
                  <span>{t("dashboard.matured")} ৳{Math.round(stats?.maturedPayable || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Permanent Salary Payable */}
        <Link href="/admin/employees/salaries" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.permanentSalaryPayable || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.salary_payable")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.salary_payable")}</CardTitle>
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.permanentSalaryPayable || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.monthly_staff_salaries")}</p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Temporary Wages Payable */}
        <Link href="/admin/employees/tasks" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  ৳{Math.round(stats?.temporaryWagesPayable || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.wages_payable")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.wages_payable")}</CardTitle>
                <Receipt className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  ৳{Math.round(stats?.temporaryWagesPayable || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.completed_tasks_unpaid")}</p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Running Assigned Tasks */}
        <Link href="/admin/employees/tasks" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-black text-primary leading-none">
                  {stats?.runningAssignedTasks || 0}
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
                {t("dashboard.running_tasks")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.running_tasks")}</CardTitle>
                <Briefcase className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  {stats?.runningAssignedTasks || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.active_pending_tasks")}</p>
              </CardContent>
            </div>
          </Card>
        </Link>
      </div>

      <div className={mobileTab === 'charts' ? 'space-y-6 block' : 'space-y-6 hidden md:block'}>
        <div className="grid gap-4 grid-cols-1">
          {/* Interactive Chart */}
          <Card className="col-span-full">
            <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-6 md:py-6">
                <CardTitle className="text-lg md:text-xl">{t("dashboard.performance_trends")}</CardTitle>

              </div>
              <div className="flex w-full border-t sm:border-t-0 sm:w-auto sm:ml-auto">
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
                      <stop
                        offset="5%"
                        stopColor="var(--color-revenue)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-revenue)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-orders)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-orders)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-expense)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-expense)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillNetIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-netIncome)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-netIncome)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    minTickGap={32}
                    tickFormatter={(value) => format(parseISO(value), 'dd MMM')}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', opacity: 0.5 }}
                    content={<CustomTooltip activeChart={activeChart} />}
                    isAnimationActive={false}
                  />
                  {/* Reference Line for Average */}
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

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* Customer Insights & New vs Returning (NEW/UPDATED) */}
          <div className="space-y-4">
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {t("dashboard.customer_insights")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-around py-2 border-b">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">{t("dashboard.new")}</p>
                    <p className="text-xl font-black">{stats?.newUsersCount}</p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">{t("dashboard.returning")}</p>
                    <p className="text-xl font-black">{stats?.returningUsersCount}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("dashboard.top_spenders")}</p>
                  {topCustomers && topCustomers.length > 0 ? (
                    topCustomers.map((customer: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate max-w-[120px]">{customer.name}</span>
                        <span className="font-bold text-primary">৳{Math.round(customer.totalSpend || 0).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic py-2 text-center">{t("dashboard.no_customers_yet")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-white shadow-lg">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">{t("dashboard.loyalty_members")}</p>
                    <p className="text-xl font-bold">{stats?.activeSubscribers}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">{t("dashboard.pending_orders")}</p>
                    <p className="text-xl font-bold">{stats?.pendingOrdersCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-600">
                  <Receipt className="h-4 w-4" />
                  {t("dashboard.wholesaler_dues")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {data?.wholesalersDueList?.map((w: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold group-hover:text-primary transition-colors">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.phone || w.email}</p>
                      </div>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-red-600 border-red-200 bg-red-50 font-bold">
                        ৳{Math.round(w.due).toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                  {(!data?.wholesalersDueList || data.wholesalersDueList.length === 0) && (
                    <p className="text-center py-4 text-xs text-muted-foreground italic">{t("dashboard.no_outstanding_wholesaler_dues")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {t("dashboard.low_stock_alerts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {lowStockProducts?.map((product: any) => (
                    <div key={product._id} className="flex items-center justify-between group">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold group-hover:text-primary transition-colors">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t("dashboard.unit_price")}{product.price}</p>
                      </div>
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {product.stock} {t("dashboard.left")}
                      </Badge>
                    </div>
                  ))}
                  {(lowStockProducts?.length ?? 0) === 0 && (
                    <p className="text-center py-4 text-xs text-muted-foreground italic">{t("dashboard.inventory_levels_healthy")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Products (NEW) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                {t("dashboard.top_products")}
              </CardTitle>
              <CardDescription>{t("dashboard.best_performers")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topSellingProducts?.map((product: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-xs">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-bold leading-none truncate max-w-[150px]">{product._id}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} {t("dashboard.units_sold")}</p>
                  </div>
                  <div className="text-sm font-black">৳{Math.round(product.revenue).toLocaleString()}</div>
                </div>
              ))}
              {(!topSellingProducts || topSellingProducts.length === 0) && (
                <div className="text-center py-10 text-muted-foreground text-sm">{t("dashboard.no_sales_data")}</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-xl whitespace-nowrap">{t("dashboard.recent_transactions")}</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">{t("dashboard.latest_orders")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5 sm:px-3 sm:h-9">
                  <Link href="/admin/orders">{t("sidebar.all_orders")}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y">
                {recentOrders?.map((order: any) => (
                  <div key={order._id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold leading-none">{t("dashboard.order_hash")}{order.slug}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{order.user?.name || t("dashboard.guest_customer")}</span>
                          <span>•</span>
                          <span>{order?.createdAt ? format(parseISO(order.createdAt), 'dd MMM, p') : '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-sm font-black text-primary">৳{(order?.totalAmount || 0).toLocaleString()}</div>
                      <Badge
                        variant={order.status === 'Delivered' ? 'default' : 'secondary'}
                        className={`text-[10px] uppercase font-bold tracking-tighter ${order.status === 'Delivered' ? 'bg-emerald-500' : ''}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


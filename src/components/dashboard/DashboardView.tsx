'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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

const CustomTooltip = ({ active, payload, label, activeChart, t }: any) => {
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
    metricLabel = t ? (t('dashboard.revenue') || 'Revenue') : 'Revenue';
    metricColorClass = 'text-primary';
    getValue = (vals: any) => vals.revenue || 0;
    formatValue = (val: number) => `৳${Math.round(val).toLocaleString()}`;
  } else if (activeChart === 'orders') {
    metricLabel = t ? (t('dashboard.sales') || 'Sales') : 'Sales';
    metricColorClass = 'text-orange-600';
    getValue = (vals: any) => vals.orders || 0;
    formatValue = (val: number) => val.toLocaleString();
  } else if (activeChart === 'expense') {
    metricLabel = t ? (t('dashboard.expense') || 'Expense') : 'Expense';
    metricColorClass = 'text-red-600';
    getValue = (vals: any) => vals.expense || 0;
    formatValue = (val: number) => `৳${Math.round(val).toLocaleString()}`;
  } else if (activeChart === 'netIncome') {
    metricLabel = t ? (t('dashboard.net_income') || 'Net Income') : 'Net Income';
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
              <th className="py-1">{t ? (t('dashboard.showroom') || 'Showroom') : 'Showroom'}</th>
              <th className="py-1 text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {activeShowroomsList.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-2 text-center text-muted-foreground italic">
                  {t ? (t('dashboard.no_data') || 'No data') : `No ${metricLabel.toLowerCase()} data`}
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
              <td className="py-2 px-1">{t ? (t('dashboard.total') || 'Total') : 'Total'}</td>
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

export function DashboardView({ activeTab }: { activeTab: 'cards' | 'report' | 'insight' }) {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("revenue");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [showroomsList, setShowroomsList] = useState<{ _id: string; name: string }[]>([]);

  // Date filter state
  
  // Add Balance State
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [addBalanceTargetType, setAddBalanceTargetType] = useState<'Cash' | 'Bank' | 'MFS'>('Cash');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [fundSourceType, setFundSourceType] = useState('Income');
  const [sourceAccountId, setSourceAccountId] = useState('');
  // Loan Specific
  const [lenderId, setLenderId] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [repaymentType, setRepaymentType] = useState<'One-time' | 'Installment'>('One-time');
  const [expectedRepaymentDate, setExpectedRepaymentDate] = useState('');
  const [totalRepaymentAmount, setTotalRepaymentAmount] = useState<number | ''>('');
  const [installmentCount, setInstallmentCount] = useState<number | ''>('');
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [installmentDayOfMonth, setInstallmentDayOfMonth] = useState<number | ''>('');
  const [submittingBalance, setSubmittingBalance] = useState(false);

  const openAddBalance = (e: React.MouseEvent, type: 'Cash' | 'Bank' | 'MFS') => {
    e.preventDefault();
    e.stopPropagation();
    setAddBalanceTargetType(type);
    
    // Auto select target if Cash
    if (type === 'Cash') {
      const cashAcc = stats?.ledgerAccounts?.find((a: any) => a.code === 'CASH');
      if (cashAcc) setTargetAccountId(cashAcc._id);
      else setTargetAccountId('');
    } else {
      setTargetAccountId('');
    }
    
    setFundSourceType('Income');
    setSourceAccountId('');
    setLenderId('');
    setLenderName('');
    setLoanAmount('');
    setRepaymentType('One-time');
    setExpectedRepaymentDate('');
    setTotalRepaymentAmount('');
    setInstallmentCount('');
    setInstallmentAmount('');
    setInstallmentDayOfMonth('');
    setIsAddBalanceOpen(true);
  };

  const handleAddBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccountId) {
      toast.error('Please select a target account');
      return;
    }
    
    setSubmittingBalance(true);
    try {
      const res = await fetch('/api/admin/dashboard/add-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAccountId,
          sourceType: fundSourceType,
          sourceAccountId,
          lenderId,
          lenderName,
          amount: loanAmount || 0,
          repaymentType,
          expectedRepaymentDate,
          totalRepaymentAmount: totalRepaymentAmount || 0,
          installmentCount: installmentCount || 0,
          installmentAmount: installmentAmount || 0,
          installmentDayOfMonth: installmentDayOfMonth || 1
        })
      });
      
      if (res.ok) {
        toast.success('Balance added successfully');
        setIsAddBalanceOpen(false);
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to add balance');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmittingBalance(false);
    }
  };
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
    <div className="flex-1 space-y-3 md:space-y-6 px-0 pt-[1px] pb-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1 md:gap-3 mt-0 md:mt-0">
        {/* Title & Filters Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b pb-2 md:pb-4">
          <h2 className="hidden md:block text-xl md:text-3xl font-bold tracking-tight whitespace-nowrap">
            {activeTab === 'report' ? (t("sidebar.report") || 'Report') : activeTab === 'insight' ? (t("sidebar.insight") || 'Insight') : t("dashboard.overview")}
          </h2>
          {/* Mobile buttons */}
          <div className="flex items-center gap-2 w-full md:hidden">
            <Button variant="outline" size="sm" onClick={fetchStats} className="h-9 px-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            {(activeTab !== 'cards' || showroomsList.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`h-9 px-3 flex-1 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
              >
                <Filter className="mr-1.5 h-4 w-4" />
                <span className="text-xs font-bold">{t("dashboard.filter") || "Filter"}</span>
              </Button>
            )}
          </div>

          {/* Desktop Filter Row (top right corner on desktop) */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {/* Showroom Dropdown */}
            {showroomsList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border">
                <div className="flex items-center gap-1 px-2 shrink-0">
                  <Store className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("dashboard.showroom") || "Showroom"}</span>
                </div>
                <select
                  value={selectedShowroom}
                  onChange={(e) => setSelectedShowroom(e.target.value)}
                  className="h-8 bg-transparent text-xs border-none outline-none cursor-pointer pr-2 font-medium"
                >
                  <option value="all">{t("dashboard.all_showrooms") || "All Showrooms"}</option>
                  <option value="online">{t("dashboard.online_central") || "🌐 Online / Central"}</option>
                  {showroomsList.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            {activeTab !== 'cards' && (
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <div className="flex items-center gap-1 px-2 shrink-0">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("dashboard.range") || "Range"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    className="h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                    value={dateRange.from}
                    onChange={(e) => handleDateChange('from', e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0">{t("dashboard.to") || "to"}</span>
                  <Input
                    type="date"
                    className="h-8 w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                    value={dateRange.to}
                    onChange={(e) => handleDateChange('to', e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            )}

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={fetchStats} className="h-8 px-3 text-xs font-bold">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (t("dashboard.refresh") || "Refresh")}
            </Button>

            {/* Active filter badge */}
            {selectedShowroom !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Store className="h-2.5 w-2.5" />
                {selectedShowroom === 'online'
                  ? (t("dashboard.online_central") || '🌐 Online / Central')
                  : showroomsList.find(s => s._id === selectedShowroom)?.name || (t("dashboard.showroom") || 'Showroom')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Mobile Filters Wrapper */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full ${showMobileFilters
          ? 'grid-rows-[1fr] opacity-100 !mt-[1px] visible'
          : 'grid-rows-[0fr] opacity-0 invisible h-0 !mt-0 hidden'
        }`}>
        <div className="overflow-hidden w-full">
          <div className="bg-muted/30 p-3 rounded-lg border flex flex-col gap-3">
            {/* Showroom filter */}
            {showroomsList.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground border-b pb-1">
                  <Store className="h-3 w-3" />
                  <span>{t("dashboard.showroom_filter") || "SHOWROOM FILTER"}</span>
                </div>
                <select
                  value={selectedShowroom}
                  onChange={(e) => setSelectedShowroom(e.target.value)}
                  className="h-9 w-full bg-background text-xs border rounded-md px-2 outline-none cursor-pointer font-medium"
                >
                  <option value="all">{t("dashboard.all_showrooms") || "All Showrooms"}</option>
                  <option value="online">{t("dashboard.online_central") || "🌐 Online / Central"}</option>
                  {showroomsList.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab !== 'cards' && (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-1">
                  <span>{t("dashboard.date_filter") || "DATE FILTER"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">{t("dashboard.from") || "From"}</span>
                    <Input
                      type="date"
                      className="h-9 w-full bg-background text-xs"
                      value={dateRange.from}
                      onChange={(e) => handleDateChange('from', e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">{t("dashboard.to") || "To"}</span>
                    <Input
                      type="date"
                      className="h-9 w-full bg-background text-xs"
                      value={dateRange.to}
                      onChange={(e) => handleDateChange('to', e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tabs removed */}
      <div className={`grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-3 ${activeTab === 'cards' ? 'grid' : 'hidden'} ${showMobileFilters ? '!mt-3 md:!mt-6' : '!mt-[1px] md:!mt-6'}`}>
        {/* Pending Orders Card */}
        <Link href="/admin/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.pendingOrdersCount || 0}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.pending_orders")}
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

        {/* Pending Expenses */}
        <Link href="/admin/expenses-incomes?type=expense&status=Pending" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.pendingExpenseCount || 0}
                </span>
                <div className="text-xs font-bold text-red-600 leading-none">
                  {t("dashboard.total") || "Total"}: ৳{Math.round(stats?.pendingExpenseTotal || 0).toLocaleString()}
                </div>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.pending_expenses") || "Pending Expenses"}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.pending_expenses") || "Pending Expenses"}</CardTitle>
                <Receipt className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  {stats?.pendingExpenseCount || 0}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600 truncate">
                  <span>{t("dashboard.total") || "Total"}: ৳{Math.round(stats?.pendingExpenseTotal || 0).toLocaleString()}</span>
                </div>
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
                <span className="text-2xl font-black text-primary leading-none">
                  ৳{Math.round(stats?.cashBalance || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.cash_balance")}
              </span>
            
              <Button size="sm" variant="outline" className="mt-2 h-7 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'Cash')}>
                <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
              </Button>
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
                  {selectedShowroom === 'all' ? t("dashboard.physical_cash_on_hand") : selectedShowroom === 'online' ? (t("dashboard.online_cash_flow") || 'Online/central cash flow') : (t("dashboard.showroom_cash_flow") || 'Showroom net cash flow')}
                </p>
                <Button size="sm" variant="outline" className="mt-4 h-8 px-6 bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'Cash')}>
                  <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
                </Button>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Bank Balance */}
        <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-primary leading-none">
                  ৳{Math.round(stats?.bankBalance || 0).toLocaleString()}
                </span>
                {stats?.bankBalancesList?.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1.5 w-full items-center">
                    {stats.bankBalancesList.map((b: any, idx: number) => (
                      <span key={idx} className="text-xs font-bold text-zinc-600 leading-tight">
                        {b.name}: ৳{Math.round(b.balance || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.bank_balance")}
              </span>
            
              <Button size="sm" variant="outline" className="mt-2 h-7 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'Bank')}>
                <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
              </Button>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.bank_balance")}</CardTitle>
                <Landmark className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-xl md:text-3xl font-extrabold text-primary">
                  ৳{Math.round(stats?.bankBalance || 0).toLocaleString()}
                </div>
                {stats?.bankBalancesList?.length > 0 ? (
                  <div className="flex flex-col gap-1 mt-2">
                    {stats.bankBalancesList.map((b: any, idx: number) => (
                      <span key={idx} className="text-xs font-semibold text-zinc-600">
                        {b.name}: ৳{Math.round(b.balance || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {selectedShowroom === 'all' ? t("dashboard.liquid_bank_accounts") : selectedShowroom === 'online' ? (t("dashboard.online_bank_flow") || 'Online/central bank flow') : (t("dashboard.showroom_bank_flow") || 'Showroom net bank flow')}
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-4 h-8 px-6 bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'Bank')}>
                  <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
                </Button>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* MFS Balance */}
        <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-primary leading-none">
                  ৳{Math.round(stats?.mfsBalanceTotal || 0).toLocaleString()}
                </span>
                {stats?.mfsBalancesList?.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1.5 w-full items-center">
                    {stats.mfsBalancesList.map((b: any, idx: number) => (
                      <span key={idx} className="text-xs font-bold text-zinc-600 leading-tight">
                        {b.name}: ৳{Math.round(b.balance || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.mfs_balance") || "MFS Balance"}
              </span>
            
              <Button size="sm" variant="outline" className="mt-2 h-7 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'MFS')}>
                <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
              </Button>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.mfs_balance") || "MFS Balance"}</CardTitle>
                <Wallet className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-xl md:text-3xl font-extrabold text-primary">
                  ৳{Math.round(stats?.mfsBalanceTotal || 0).toLocaleString()}
                </div>
                {stats?.mfsBalancesList?.length > 0 ? (
                  <div className="flex flex-col gap-1 mt-2">
                    {stats.mfsBalancesList.map((b: any, idx: number) => (
                      <span key={idx} className="text-xs font-semibold text-zinc-600">
                        {b.name}: ৳{Math.round(b.balance || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t("dashboard.all_mfs_balance") || "Total MFS accounts balance"}
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-4 h-8 px-6 bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex items-center justify-center" onClick={(e) => openAddBalance(e, 'MFS')}>
                  <Plus className="h-3 w-3 mr-1" /> {t("dashboard.add_balance") || "Add Balance"}
                </Button>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Account Receivable */}
        <Link href="/admin/ledger/receivable" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                <span className="text-2xl font-black text-primary leading-none">
                  ৳{Math.round(stats?.accountReceivable || 0).toLocaleString()}
                </span>
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="text-xs font-bold text-zinc-600 leading-none">
                    {t("dashboard.wholesalers") || "Wholesaler"}: ৳{Math.round(stats?.totalWholesalerDue || 0).toLocaleString()}
                    <span className="text-rose-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedWholesalerDue || 0).toLocaleString()})</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-600 leading-none">
                    {t("dashboard.general") || "General"}: ৳{Math.round(stats?.totalBillDue || 0).toLocaleString()}
                    <span className="text-rose-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedGeneralDue || 0).toLocaleString()})</span>
                  </div>
                  <div className="text-xs font-bold text-rose-600 leading-none mt-0.5">
                    {t("dashboard.total_matured") || "Total Matured:"} ৳{Math.round(stats?.maturedReceivable || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
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
                <div className="flex flex-col gap-1 mt-1 text-xs font-semibold text-zinc-600 truncate">
                  <span>{t("dashboard.wholesaler_due") || "Wholesaler Due:"} ৳{Math.round(stats?.totalWholesalerDue || 0).toLocaleString()} <span className="text-rose-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedWholesalerDue || 0).toLocaleString()})</span></span>
                  <span>{t("dashboard.general_due") || "General Due:"} ৳{Math.round(stats?.totalBillDue || 0).toLocaleString()} <span className="text-rose-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedGeneralDue || 0).toLocaleString()})</span></span>
                  <span className="text-rose-600 mt-1 font-bold">{t("dashboard.total_matured") || "Total Matured:"} ৳{Math.round(stats?.maturedReceivable || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Supplier Account Payable */}
        <Link href="/admin/ledger/payable" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                <span className="text-2xl font-black text-primary leading-none">
                  ৳{Math.round((stats?.supplierPayable || 0) + (stats?.businessLoanPayable || 0)).toLocaleString()}
                </span>
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="text-[11px] font-bold text-zinc-600 leading-none">
                    {t("sidebar.suppliers") || "Supplier"}: ৳{Math.round(stats?.supplierPayable || 0).toLocaleString()}
                    <span className="text-red-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedSupplierPayable || 0).toLocaleString()})</span>
                  </div>
                  <div className="text-[11px] font-bold text-zinc-600 leading-none">
                    {t("sidebar.loan") || "Loan"}: ৳{Math.round(stats?.businessLoanPayable || 0).toLocaleString()}
                    <span className="text-red-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedBusinessLoan || 0).toLocaleString()})</span>
                  </div>
                  <div className="text-[11px] font-bold text-red-600 leading-none mt-0.5">
                    {t("dashboard.total_matured") || "Total Matured:"} ৳{Math.round(stats?.maturedPayable || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
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
                  ৳{Math.round((stats?.supplierPayable || 0) + (stats?.businessLoanPayable || 0)).toLocaleString()}
                </div>
                <div className="flex flex-col gap-1 mt-1 text-xs font-semibold text-zinc-600 truncate">
                  <span>{t("dashboard.supplier_due") || "Supplier Due:"} ৳{Math.round(stats?.supplierPayable || 0).toLocaleString()} <span className="text-red-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedSupplierPayable || 0).toLocaleString()})</span></span>
                  <span>{t("dashboard.business_loan") || "Business Loan:"} ৳{Math.round(stats?.businessLoanPayable || 0).toLocaleString()} <span className="text-red-600 ml-1">({t("dashboard.matured") || "Matured:"} ৳{Math.round(stats?.maturedBusinessLoan || 0).toLocaleString()})</span></span>
                  <span className="text-red-600 mt-1 font-bold">{t("dashboard.total_matured") || "Total Matured:"} ৳{Math.round(stats?.maturedPayable || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Total Suppliers */}
        <Link href="/admin/suppliers" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.totalSuppliersCount || 0}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.total_suppliers") || "Total Suppliers"}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.total_suppliers") || "Total Suppliers"}</CardTitle>
                <Users className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  {stats?.totalSuppliersCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.total_registered_suppliers") || "Total registered suppliers"}</p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Total Customers Card */}
        <Link href="/admin/users" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.totalUsers || 0}
                </span>
                <div className="text-xs font-bold text-zinc-600 leading-none">
                  {t("dashboard.wholesalers") || "Wholesaler"}: {stats?.wholesalersCount || 0} | {t("dashboard.general") || "General"}: {stats?.generalUsersCount || 0}
                </div>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
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
                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-muted-foreground truncate">
                  <span>{t("dashboard.wholesalers") || "Wholesalers"}: {stats?.wholesalersCount || 0}, {t("dashboard.general") || "General"}: {stats?.generalUsersCount || 0}</span>
                </div>
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
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.runningAssignedTasks || 0}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
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

        {/* Expire Alert Card */}
        <Link href="/admin/upcoming-expiry" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex flex-col justify-center items-center gap-1">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.expiringProductsCount || 0}
                </span>
                <span className="text-[9px] text-rose-600 font-bold leading-none">
                  {t("dashboard.expired") || "Expired"}: {stats?.expiredProductsCount || 0}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.expire_alert")}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.expire_alert")}</CardTitle>
                <CalendarClock className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">
                  {stats?.expiringProductsCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {t("dashboard.expiring_products")}
                  <span className="text-rose-600 font-bold ml-2">({t("dashboard.expired") || "Expired"}: {stats?.expiredProductsCount || 0})</span>
                </p>
              </CardContent>
            </div>
          </Card>
        </Link>

        {/* Pending Leaves Card */}
        <Link href="/admin/employees/leaves" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
            {/* Mobile Layout */}
            <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-2xl font-black text-primary leading-none">
                  {stats?.pendingLeavesCount || 0}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-800 leading-tight mt-auto">
                {t("dashboard.leave_requests") || "Leave Requests"}
              </span>
            </div>
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.leave_requests") || "Leave Requests"}</CardTitle>
                <CalendarClock className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary font-body">
                  {stats?.pendingLeavesCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.pending_leave_requests") || "Pending leave requests"}</p>
              </CardContent>
            </div>
          </Card>
        </Link>
      </div>

      <div className={(activeTab === 'report' || activeTab === 'insight') ? 'space-y-6 block' : 'hidden'}>
        <div className={activeTab === 'report' ? "grid gap-4 grid-cols-1" : "hidden"}>
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
                      {key === 'revenue' ? (t("dashboard.revenue") || 'Revenue') :
                       key === 'orders' ? (t("dashboard.total_sales") || 'Total Sales') :
                       key === 'expense' ? (t("dashboard.expense") || 'Expense') :
                       (t("dashboard.net_income") || 'Net Income')}
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
                    content={<CustomTooltip activeChart={activeChart} t={t} />}
                    isAnimationActive={false}
                  />
                  {/* Reference Line for Average */}
                  <ReferenceLine
                    y={total[activeChart] / (processedChartData?.length || 1)}
                    label={{
                      value: t("dashboard.average") || 'Avg',
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

        <div className={activeTab === 'insight' ? "grid gap-4 md:grid-cols-1 lg:grid-cols-3" : "hidden"}>
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
                  <p className="text-sm font-bold text-zinc-800 uppercase text-muted-foreground">{t("dashboard.top_spenders")}</p>
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
                  <div className="text-base sm:text-lg font-bold">৳{Math.round(product.revenue).toLocaleString()}</div>
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
                      <div className="text-base sm:text-lg font-bold text-primary">৳{(order?.totalAmount || 0).toLocaleString()}</div>
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
  
      {/* Add Balance Modal */}
      <Dialog open={isAddBalanceOpen} onOpenChange={setIsAddBalanceOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBalanceSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Target Account</Label>
              {addBalanceTargetType === 'Cash' ? (
                <div className="p-2 bg-slate-50 border rounded text-sm text-slate-600">Cash Account</div>
              ) : (
                <select
                  value={targetAccountId}
                  onChange={e => setTargetAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">-- Select {addBalanceTargetType} Account --</option>
                  {stats?.ledgerAccounts?.filter((a: any) => a.accountCategory === addBalanceTargetType).map((a: any) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Source of Fund</Label>
              <select
                value={fundSourceType}
                onChange={e => setFundSourceType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="Income">Direct Income / Owner Equity</option>
                <option value="Bank">Transfer from Bank</option>
                <option value="MFS">Transfer from MFS</option>
                {addBalanceTargetType !== 'Cash' && <option value="Cash">Transfer from Cash</option>}
                <option value="Loan">Business Loan</option>
              </select>
            </div>

            {(fundSourceType === 'Bank' || fundSourceType === 'MFS' || fundSourceType === 'Cash') && (
              <div className="space-y-1.5">
                <Label>Source {fundSourceType} Account</Label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">-- Select Source Account --</option>
                  {stats?.ledgerAccounts
                    ?.filter((a: any) => 
                      String(a._id) !== String(targetAccountId) && 
                      (a.accountCategory === fundSourceType || (fundSourceType === 'Cash' && a.code === 'CASH'))
                    )
                    .map((a: any) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                </select>
              </div>
            )}

            {fundSourceType !== 'Loan' && (
              <div className="space-y-1.5">
                <Label>Amount (৳)</Label>
                <Input type="number" required min="1" value={loanAmount || ''} onChange={e => setLoanAmount(Number(e.target.value))} />
              </div>
            )}

            {fundSourceType === 'Loan' && (
              <div className="space-y-4 border-t pt-4">
                <div className="font-semibold text-primary">Loan Details</div>
                
                <div className="space-y-1.5">
                  <Label>Loan Provider (Lender)</Label>
                  <select
                    value={lenderId}
                    onChange={e => {
                      const selId = e.target.value;
                      setLenderId(selId);
                      const p = stats?.loanProviders?.find((lp: any) => String(lp._id) === String(selId));
                      if (p) setLenderName(p.name);
                      else setLenderName('');
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">-- Select Loan Provider --</option>
                    {stats?.loanProviders?.map((lp: any) => (
                      <option key={lp._id} value={lp._id}>
                        {lp.name} {lp.phone ? `(${lp.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Loan Amount (৳) *</Label>
                    <Input 
                      type="number" 
                      required 
                      min="1" 
                      value={loanAmount || ''} 
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setLoanAmount(val);
                        if (repaymentType === 'One-time') {
                          const interest = (Number(totalRepaymentAmount) > Number(loanAmount)) ? (Number(totalRepaymentAmount) - Number(loanAmount)) : 0;
                          if (val) setTotalRepaymentAmount(Number(val) + Number(interest));
                        }
                      }} 
                    />
                  </div>

                  {repaymentType === 'One-time' && (
                    <div className="space-y-1.5">
                      <Label>Interest Amount (৳)</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        value={loanAmount && totalRepaymentAmount ? Math.max(0, Number(totalRepaymentAmount) - Number(loanAmount)) : ''} 
                        onChange={e => {
                          const interest = e.target.value ? Number(e.target.value) : 0;
                          setTotalRepaymentAmount(Number(loanAmount || 0) + Number(interest));
                        }} 
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Repayment Type</Label>
                  <select
                    value={repaymentType}
                    onChange={(e: any) => setRepaymentType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="One-time">One-time</option>
                    <option value="Installment">Installment</option>
                  </select>
                </div>

                {repaymentType === 'One-time' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Expected Repayment Date</Label>
                      <Input type="date" required value={expectedRepaymentDate} onChange={e => setExpectedRepaymentDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Total Repayment Amount (৳)</Label>
                      <Input 
                        type="number" 
                        required 
                        min={loanAmount ? Number(loanAmount) : 1} 
                        value={totalRepaymentAmount || ''} 
                        onChange={e => setTotalRepaymentAmount(e.target.value ? Number(e.target.value) : '')} 
                      />
                      {Number(totalRepaymentAmount) > Number(loanAmount) && (
                        <p className="text-xs text-rose-500 mt-1 font-medium">Interest: ৳{(Number(totalRepaymentAmount) - Number(loanAmount)).toLocaleString()}</p>
                      )}
                    </div>
                  </>
                )}

                {repaymentType === 'Installment' && (
                  <div className="space-y-3 bg-slate-50 dark:bg-muted/40 p-3 rounded-md border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Installment Count (Months)</Label>
                        <Input type="number" required min="1" value={installmentCount || ''} onChange={e => {
                          const count = e.target.value ? Number(e.target.value) : '';
                          setInstallmentCount(count);
                          if (count && installmentAmount) {
                            setTotalRepaymentAmount(Number(count) * Number(installmentAmount));
                          }
                        }} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Installment Amount (৳)</Label>
                        <Input type="number" required min="1" value={installmentAmount || ''} onChange={e => {
                          const instAmt = e.target.value ? Number(e.target.value) : '';
                          setInstallmentAmount(instAmt);
                          if (instAmt && installmentCount) {
                            setTotalRepaymentAmount(Number(installmentCount) * Number(instAmt));
                          }
                        }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Day of Month (1-31)</Label>
                        <Input type="number" required min="1" max="31" value={installmentDayOfMonth || ''} onChange={e => setInstallmentDayOfMonth(e.target.value ? Number(e.target.value) : '')} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Final Maturity Date</Label>
                        <Input type="date" required value={expectedRepaymentDate} onChange={e => setExpectedRepaymentDate(e.target.value)} />
                      </div>
                    </div>
                    {Number(totalRepaymentAmount) > 0 && (
                      <div className="pt-2 border-t font-medium text-sm">
                        Total Repayment: ৳{Number(totalRepaymentAmount).toLocaleString()}
                        {Number(totalRepaymentAmount) > Number(loanAmount) && (
                          <span className="text-rose-500 ml-2">(Interest: ৳{(Number(totalRepaymentAmount) - Number(loanAmount)).toLocaleString()})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddBalanceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingBalance}>{submittingBalance ? 'Processing...' : 'Confirm'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

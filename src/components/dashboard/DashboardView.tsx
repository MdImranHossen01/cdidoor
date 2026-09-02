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

export function DashboardView({ activeTab = 'cards' }: { activeTab?: 'cards' | 'report' | 'insight' } = {}) {
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

  const { stats, recentOrders, lowStockProducts, topSellingProducts, topCustomers, chartData, last7DaysStats } = data || {};

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

      {/* Dashboard Overview Cards */}
      <div className={`${activeTab === 'cards' ? 'block' : 'hidden'} ${showMobileFilters ? '!mt-3 md:!mt-6' : '!mt-[1px] md:!mt-6'}`}>
        
        {/* MOBILE VIEW (DSB POS mini-box card layout) */}
        <div className="flex flex-col gap-2.5 sm:hidden pb-12">

          {/* 3. Customer */}
          <div className="bg-white rounded border border-gray-200 shadow-xs overflow-hidden">
            <div className="flex items-center px-3 py-2 min-h-[55px]">
              <div className="w-12 h-10 flex items-center justify-center shrink-0 mr-3">
                <div className="flex items-center -space-x-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] text-white" />
                  <div className="w-6 h-6 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center text-[9px] text-white z-10" />
                  <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[8px] text-white" />
                </div>
              </div>
              <div className="flex-1 text-base">
                <Link href="/admin/users" className="hover:underline flex flex-col">
                  <div>
                    <b className="text-[#0066cc]">কাস্টমার:</b> <b className="text-gray-900 ml-1.5">{stats?.totalUsers || 0}</b>
                  </div>
                  <div className="text-xs text-gray-600 font-semibold mt-0.5">
                    পাইকারি: <span className="text-[#0066cc] font-bold">{stats?.wholesalersCount || 0}</span> | সাধারণ: <span className="text-[#2e7d32] font-bold">{stats?.generalUsersCount || 0}</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Supplier */}
          <div className="bg-white rounded border border-gray-200 shadow-xs overflow-hidden">
            <div className="flex items-center px-3 py-2.5 min-h-[55px]">
              <div className="w-12 h-10 flex items-center justify-center shrink-0 mr-3">
                <div className="flex items-center -space-x-1.5">
                  <div className="w-5 h-5 rounded-full bg-teal-600 border-2 border-white" />
                  <div className="w-6 h-6 rounded-full bg-cyan-700 border-2 border-white z-10" />
                  <div className="w-5 h-5 rounded-full bg-teal-600 border-2 border-white" />
                </div>
              </div>
              <div className="flex-1 text-base">
                <Link href="/admin/suppliers" className="hover:underline">
                  <b className="text-[#0066cc]">সাপ্লাইয়ার:</b> <b className="text-gray-900 ml-1.5">{stats?.totalSuppliersCount || 0}</b>
                </Link>
              </div>
            </div>
          </div>

          {/* 5. Sales (বিক্রয়, পেইড, বাকি) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <table className="w-full text-left font-bold text-sm leading-relaxed">
              <tbody>
                <tr className="text-[#2e7d32]">
                  <th className="w-16 font-bold py-0.5">বিক্রয়</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(total.revenue || stats?.totalRevenue || 0).toFixed(2)}</span></th>
                </tr>
                <tr className="text-[#0066cc]">
                  <th className="w-16 font-bold py-0.5">পেইড</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round((total.revenue || stats?.totalRevenue || 0) - (stats?.accountReceivable || 0)).toFixed(2)}</span></th>
                </tr>
                <tr className="text-[#d32f2f]">
                  <th className="w-16 font-bold py-0.5">বাকি</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.accountReceivable || 0).toFixed(2)}</span></th>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. Collection (বাকি আদায়, কিস্তি আদায়, অগ্রীম আদায়) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <table className="w-full text-left font-bold text-sm leading-relaxed">
              <tbody>
                <tr className="text-[#0066cc]">
                  <th className="w-24 font-bold py-0.5">বাকি আদায়</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.cashBalance || 0).toFixed(2)}</span></th>
                </tr>
                <tr className="text-[#d32f2f]">
                  <th className="w-24 font-bold py-0.5">কিস্তি আদায়</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. 0.00</span></th>
                </tr>
                <tr className="text-[#2e7d32]">
                  <th className="w-24 font-bold py-0.5">অগ্রীম আদায়</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. 0.00</span></th>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7. Expense (খরচ: মোট, পেইড) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <table className="w-full text-left font-bold text-sm leading-relaxed">
              <tbody>
                <tr>
                  <th colSpan={2} className="font-bold text-gray-900 pb-1 text-base">খরচ</th>
                </tr>
                <tr className="text-[#2e7d32]">
                  <th className="w-16 font-bold py-0.5">মোট</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.pendingExpenseTotal || total.expense || 0).toFixed(2)}</span></th>
                </tr>
                <tr className="text-[#0066cc]">
                  <th className="w-16 font-bold py-0.5">পেইড</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.pendingExpenseTotal || total.expense || 0).toFixed(2)}</span></th>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 8. Purchase (মালক্রয়: মোট, পেইড) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <table className="w-full text-left font-bold text-sm leading-relaxed">
              <tbody>
                <tr>
                  <th colSpan={2} className="font-bold text-gray-900 pb-1 text-base">মালক্রয়</th>
                </tr>
                <tr className="text-[#2e7d32]">
                  <th className="w-16 font-bold py-0.5">মোট</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.supplierPayable || 0).toFixed(2)}</span></th>
                </tr>
                <tr className="text-[#0066cc]">
                  <th className="w-16 font-bold py-0.5">পেইড</th>
                  <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. 0.00</span></th>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 9. Accounts Receivable (পাওনা টেবিল) */}
          <Link href="/admin/ledger/receivable" className="block bg-white rounded border border-gray-200 shadow-xs p-3 hover:border-gray-300">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr>
                    <th colSpan={2} className="font-bold text-gray-900 pb-1 text-base">পাওনা (Accounts Receivable)</th>
                  </tr>
                  <tr className="text-[#2e7d32]">
                    <th className="w-24 font-bold py-0.5">মোট পাওনা</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.accountReceivable || 0).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#0066cc]">
                    <th className="w-24 font-bold py-0.5">পাইকারি</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.totalWholesalerDue || 0).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#0066cc]">
                    <th className="w-24 font-bold py-0.5">সাধারণ</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.totalBillDue || 0).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#d32f2f]">
                    <th className="w-24 font-bold py-0.5">মেয়াদোত্তীর্ণ</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.maturedReceivable || 0).toFixed(2)}</span></th>
                  </tr>
                </tbody>
              </table>
            </div>
          </Link>

          {/* 10. Accounts Payable (দেনা টেবিল) */}
          <Link href="/admin/ledger/payable" className="block bg-white rounded border border-gray-200 shadow-xs p-3 hover:border-gray-300">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr>
                    <th colSpan={2} className="font-bold text-gray-900 pb-1 text-base">দেনা (Accounts Payable)</th>
                  </tr>
                  <tr className="text-[#2e7d32]">
                    <th className="w-24 font-bold py-0.5">মোট দেনা</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round((stats?.supplierPayable || 0) + (stats?.businessLoanPayable || 0)).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#0066cc]">
                    <th className="w-24 font-bold py-0.5">সাপ্লাইয়ার</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.supplierPayable || 0).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#0066cc]">
                    <th className="w-24 font-bold py-0.5">ঋণ</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.businessLoanPayable || 0).toFixed(2)}</span></th>
                  </tr>
                  <tr className="text-[#d32f2f]">
                    <th className="w-24 font-bold py-0.5">মেয়াদোত্তীর্ণ</th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.maturedPayable || 0).toFixed(2)}</span></th>
                  </tr>
                </tbody>
              </table>
            </div>
          </Link>

          {/* 11. Pending Orders & Pending Expenses (টেবিল স্টাইল) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr className="text-[#0066cc]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/orders" className="hover:underline text-[#0066cc]">পেন্ডিং অর্ডার</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{stats?.pendingOrdersCount || 0} টি</span></th>
                  </tr>
                  <tr className="text-[#d32f2f]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/expenses-incomes?type=expense&status=Pending" className="hover:underline text-[#d32f2f]">পেন্ডিং খরচ</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{stats?.pendingExpenseCount || 0} টি (TK. {Math.round(stats?.pendingExpenseTotal || 0).toFixed(2)})</span></th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 12. Alerts (স্টক অ্যালার্ট ও মেয়াদোত্তীর্ণ) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr className="text-[#d32f2f]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/low-stock" className="hover:underline text-[#d32f2f]">স্টক অ্যালার্ট</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{lowStockProducts?.length || 0} টি আইটেম</span></th>
                  </tr>
                  <tr className="text-[#0066cc]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/upcoming-expiry" className="hover:underline text-[#0066cc]">মেয়াদোত্তীর্ণ</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{stats?.expiringProductsCount || 0} টি (মেয়াদোত্তীর্ণ: {stats?.expiredProductsCount || 0})</span></th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 13. Tasks & Leaves (চলমান কাজ ও ছুটির আবেদন) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr className="text-[#0066cc]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/employees/tasks" className="hover:underline text-[#0066cc]">চলমান কাজ</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{stats?.runningAssignedTasks || 0} টি</span></th>
                  </tr>
                  <tr className="text-[#2e7d32]">
                    <th className="w-28 font-bold py-0.5">
                      <Link href="/admin/employees/leaves" className="hover:underline text-[#2e7d32]">ছুটির আবেদন</Link>
                    </th>
                    <th className="font-bold py-0.5">: <span className="currency font-normal text-gray-800">{stats?.pendingLeavesCount || 0} টি</span></th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 14. Cash, Bank, and MFS Accounts (ব্যালেন্স হিসাব টেবিল) */}
          <div className="bg-white rounded border border-gray-200 shadow-xs p-3">
            <div className="mini-body">
              <table className="w-full text-left font-bold text-sm leading-relaxed">
                <tbody>
                  <tr>
                    <th colSpan={2} className="font-bold text-gray-900 pb-1 text-base">অ্যাকাউন্ট ব্যালেন্স</th>
                  </tr>
                  {/* Cash */}
                  <tr className="text-[#2e7d32]">
                    <th className="w-24 font-bold py-0.5">ক্যাশ</th>
                    <th className="font-bold py-0.5">
                      <div className="flex items-center justify-between">
                        <span>: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.cashBalance || 0).toFixed(2)}</span></span>
                        <button
                          type="button"
                          onClick={(e) => openAddBalance(e, 'Cash')}
                          className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold hover:bg-primary/90 cursor-pointer ml-2"
                        >
                          + অ্যাড
                        </button>
                      </div>
                    </th>
                  </tr>

                  {/* Bank */}
                  <tr className="text-[#0066cc]">
                    <th className="w-24 font-bold py-0.5">ব্যাংক</th>
                    <th className="font-bold py-0.5">
                      <div className="flex items-center justify-between">
                        <span>: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.bankBalance || 0).toFixed(2)}</span></span>
                        <button
                          type="button"
                          onClick={(e) => openAddBalance(e, 'Bank')}
                          className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold hover:bg-primary/90 cursor-pointer ml-2"
                        >
                          + অ্যাড
                        </button>
                      </div>
                      {stats?.bankBalancesList?.length > 0 && (
                        <div className="text-[11px] font-normal text-gray-600 pl-2">
                          {stats.bankBalancesList.map((b: any, idx: number) => (
                            <div key={idx}>• {b.name}: TK. {Math.round(b.balance || 0).toFixed(2)}</div>
                          ))}
                        </div>
                      )}
                    </th>
                  </tr>

                  {/* MFS */}
                  <tr className="text-[#d32f2f]">
                    <th className="w-24 font-bold py-0.5">এমএফএস</th>
                    <th className="font-bold py-0.5">
                      <div className="flex items-center justify-between">
                        <span>: <span className="currency font-normal text-gray-800">TK. {Math.round(stats?.mfsBalanceTotal || 0).toFixed(2)}</span></span>
                        <button
                          type="button"
                          onClick={(e) => openAddBalance(e, 'MFS')}
                          className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold hover:bg-primary/90 cursor-pointer ml-2"
                        >
                          + অ্যাড
                        </button>
                      </div>
                      {stats?.mfsBalancesList?.length > 0 && (
                        <div className="text-[11px] font-normal text-gray-600 pl-2">
                          {stats.mfsBalancesList.map((b: any, idx: number) => (
                            <div key={idx}>• {b.name}: TK. {Math.round(b.balance || 0).toFixed(2)}</div>
                          ))}
                        </div>
                      )}
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 15. সম্পদ (Assets) Card */}
          {(() => {
            const stockVal = stats?.totalStockPurchaseValue || 0;
            const custDue = stats?.accountReceivable || 0;
            const totalAccBalance = (stats?.cashBalance || 0) + (stats?.bankBalance || 0) + (stats?.mfsBalanceTotal || 0);
            const totalAsset = stockVal + custDue + totalAccBalance;

            return (
              <div className="bg-white rounded border border-gray-200 shadow-xs overflow-hidden">
                {/* Header */}
                <div className="bg-[#b3e5fc] py-1.5 px-3 text-center border-b border-[#81d4fa]">
                  <span className="text-[#0288d1] font-bold text-base">সম্পদ</span>
                </div>
                {/* Body Table */}
                <div className="p-3">
                  <table className="w-full text-left text-sm leading-relaxed text-gray-900">
                    <tbody>
                      <tr>
                        <th className="font-bold py-1 w-44">আইটেম স্টক ক্রয় মূল্য</th>
                        <th className="font-normal py-1">: TK. {stockVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr>
                        <th className="font-bold py-1 w-44">কাস্টমারের বাকি</th>
                        <th className="font-normal py-1">: TK. {custDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr>
                        <th className="font-bold py-1 w-44">মোট অ্যাকাউন্ট ব্যালেন্স</th>
                        <th className="font-normal py-1">: TK. {totalAccBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <th className="font-bold py-1.5 w-44 text-base">মোট</th>
                        <th className="font-bold py-1.5 text-base">: TK. {totalAsset.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 16. দায় (Liabilities) Card */}
          {(() => {
            const suppDue = stats?.supplierPayable || 0;
            const expDue = stats?.pendingExpenseTotal || 0;
            const custAdv = stats?.totalCustomerAdvance || 0;
            const totalLiability = suppDue + expDue + custAdv;

            return (
              <div className="bg-white rounded border border-gray-200 shadow-xs overflow-hidden">
                {/* Header */}
                <div className="bg-[#b3e5fc] py-1.5 px-3 text-center border-b border-[#81d4fa]">
                  <span className="text-[#e53935] font-bold text-base">দায়</span>
                </div>
                {/* Body Table */}
                <div className="p-3">
                  <table className="w-full text-left text-sm leading-relaxed text-gray-900">
                    <tbody>
                      <tr>
                        <th className="font-bold py-1 w-44">সাপ্লাইয়ার বাকি</th>
                        <th className="font-normal py-1">: TK. {suppDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr>
                        <th className="font-bold py-1 w-44">খরচ বাকি</th>
                        <th className="font-normal py-1">: TK. {expDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr>
                        <th className="font-bold py-1 w-44">কাস্টমার অ্যাডভান্স</th>
                        <th className="font-normal py-1">: TK. {custAdv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <th className="font-bold py-1.5 w-44 text-base">মোট</th>
                        <th className="font-bold py-1.5 text-base">: TK. {totalLiability.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 17. শেষ ৭ দিনের পরিসংখ্যান (Last 7 Days Stats Table Card) */}
          {(() => {
            // Ensure 7 days are always available
            let daysList = last7DaysStats;
            if (!daysList || daysList.length === 0) {
              daysList = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dDay = d.getDate().toString().padStart(2, '0');
                const dMonth = d.toLocaleString('en-US', { month: 'short' });
                const dYear = d.getFullYear();
                daysList.push({
                  date: `${dYear}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${dDay}`,
                  displayDate: `${dDay}-${dMonth}-${dYear}`,
                  sale: 0,
                  salePayment: 0,
                  purchase: 0,
                  purchasePayment: 0,
                  expense: 0,
                  expensePayment: 0,
                  dueCollection: 0,
                  advanceCollection: 0
                });
              }
            }

            return (
              <div className="bg-white rounded border border-gray-200 shadow-xs overflow-hidden">
                {/* Header */}
                <div className="bg-[#b3e5fc] py-1.5 px-3 text-center border-b border-[#81d4fa]">
                  <span className="text-[#0288d1] font-bold text-base">শেষ ৭ দিনের পরিসংখ্যান</span>
                </div>

                {/* Scrollable Table */}
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[520px] border-collapse text-center text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="p-2 font-bold text-gray-900 text-left border-r border-gray-200 min-w-[110px]">
                          বিবরণ
                        </th>
                        {daysList.map((day: any, idx: number) => {
                          const parts = (day.displayDate || '').split('-');
                          return (
                            <th key={idx} className="p-1.5 font-bold text-gray-900 border-r last:border-r-0 border-gray-200 min-w-[65px]">
                              <div>{parts[0]}</div>
                              <div>{parts[1]}</div>
                              <div>{parts[2]}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-bold">
                      {/* বিক্রয় */}
                      <tr className="bg-gray-50/50">
                        <td className="p-2 text-left text-[#2e7d32] border-r border-gray-200 font-bold">বিক্রয়</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#2e7d32] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.sale || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* পেইড */}
                      <tr>
                        <td className="p-2 text-left text-gray-900 border-r border-gray-200 font-bold">পেইড</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-gray-900 border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.salePayment || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* মালক্রয় */}
                      <tr className="bg-gray-50/50">
                        <td className="p-2 text-left text-[#0066cc] border-r border-gray-200 font-bold">মালক্রয়</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#0066cc] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.purchase || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* মালক্রয় পেমেন্ট */}
                      <tr>
                        <td className="p-2 text-left text-[#0066cc] border-r border-gray-200 font-bold">মালক্রয় পেমেন্ট</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#0066cc] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.purchasePayment || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* খরচ */}
                      <tr className="bg-gray-50/50">
                        <td className="p-2 text-left text-[#d32f2f] border-r border-gray-200 font-bold">খরচ</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#d32f2f] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.expense || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* খরচ পেমেন্ট */}
                      <tr>
                        <td className="p-2 text-left text-[#0066cc] border-r border-gray-200 font-bold">খরচ পেমেন্ট</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#0066cc] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.expensePayment || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* বাকি কালেকশন */}
                      <tr className="bg-gray-50/50">
                        <td className="p-2 text-left text-[#0066cc] border-r border-gray-200 font-bold">বাকি কালেকশন</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#0066cc] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.dueCollection || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* অ্যাডভান্স কালেকশন */}
                      <tr className="bg-gray-50/50">
                        <td className="p-2 text-left text-[#2e7d32] border-r border-gray-200 font-bold">অ্যাডভান্স কালেকশন</td>
                        {daysList.map((day: any, idx: number) => (
                          <td key={idx} className="p-1.5 text-[#2e7d32] border-r last:border-r-0 border-gray-200 font-semibold">
                            {(day.advanceCollection || 0).toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* DESKTOP VIEW (Preserve full grid layout) */}
        <div className="hidden sm:grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Pending Orders Card */}
          <Link href="/admin/orders" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{t("dashboard.pending_orders")}</CardTitle>
                <Clock className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-lg md:text-2xl font-extrabold text-primary">{stats?.pendingOrdersCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t("dashboard.requires_attention")}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Pending Expenses */}
          <Link href="/admin/expenses-incomes?type=expense&status=Pending" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Cash Balance */}
          <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Bank Balance */}
          <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* MFS Balance */}
          <Link href="/admin/ledger" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Account Receivable */}
          <Link href="/admin/ledger/receivable" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Supplier Account Payable */}
          <Link href="/admin/ledger/payable" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Total Suppliers */}
          <Link href="/admin/suppliers" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Total Customers Card */}
          <Link href="/admin/users" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Running Assigned Tasks */}
          <Link href="/admin/employees/tasks" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Expire Alert Card */}
          <Link href="/admin/upcoming-expiry" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>

          {/* Pending Leaves Card */}
          <Link href="/admin/employees/leaves" className="block transition-transform hover:scale-[1.02] active:scale-95">
            <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full shadow-sm hover:shadow transition-shadow">
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
            </Card>
          </Link>
        </div>
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
  );
}

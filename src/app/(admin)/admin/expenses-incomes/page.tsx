'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash, Edit, Search, MoreHorizontal, Loader2, Check, X, ArrowDownCircle, ArrowUpCircle, Wallet, Clock, SlidersHorizontal } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/TransactionForm';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

function ExpensesIncomesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role;
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const initialType = (searchParams.get('type') as 'all' | 'expense' | 'income') || 'all';
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(initialType);
  
  const initialStatus = (searchParams.get('status') as 'all' | 'Approved' | 'Pending' | 'Rejected') || 'all';
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Pending' | 'Rejected'>(initialStatus);

  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(firstDay, 'yyyy-MM-dd'),
      to: format(lastDay, 'yyyy-MM-dd'),
    };
  });
  const [filterByDate, setFilterByDate] = useState(true);

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const prevFilters = useRef({ searchTerm, typeFilter, statusFilter, filterByDate, from: dateFilter.from, to: dateFilter.to });

  // Sync state changes and handle page reset when filters change
  useEffect(() => {
    const filtersChanged =
      prevFilters.current.searchTerm !== searchTerm ||
      prevFilters.current.typeFilter !== typeFilter ||
      prevFilters.current.statusFilter !== statusFilter ||
      prevFilters.current.filterByDate !== filterByDate ||
      prevFilters.current.from !== dateFilter.from ||
      prevFilters.current.to !== dateFilter.to;

    let targetPage = currentPage;
    if (filtersChanged) {
      targetPage = 1;
      setCurrentPage(1);
      prevFilters.current = { searchTerm, typeFilter, statusFilter, filterByDate, from: dateFilter.from, to: dateFilter.to };
    }

    const params = new URLSearchParams(searchParams.toString());
    const newPage = targetPage > 1 ? targetPage.toString() : '';
    const newType = typeFilter !== 'all' ? typeFilter : '';
    const newStatus = statusFilter !== 'all' ? statusFilter : '';

    const currentType = searchParams.get('type') || '';
    const currentStatus = searchParams.get('status') || '';
    const currentPageParam = searchParams.get('page') || '';

    if (newType !== currentType || newStatus !== currentStatus || newPage !== currentPageParam) {
      if (newPage) {
        params.set('page', newPage);
      } else {
        params.delete('page');
      }
      if (newType) {
        params.set('type', newType);
      } else {
        params.delete('type');
      }
      if (newStatus) {
        params.set('status', newStatus);
      } else {
        params.delete('status');
      }
      router.push(`/admin/expenses-incomes?${params.toString()}`);
    }
  }, [currentPage, searchTerm, typeFilter, statusFilter, dateFilter.from, dateFilter.to, searchParams, router]);

  // Keep state updated if URL search parameters change externally
  useEffect(() => {
    const urlType = (searchParams.get('type') as 'all' | 'expense' | 'income') || 'all';
    const urlStatus = (searchParams.get('status') as 'all' | 'Approved' | 'Pending' | 'Rejected') || 'all';

    if (urlType !== typeFilter) {
      setTypeFilter(urlType);
    }
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/expenses-incomes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch transactions');
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsDialogOpen(true);
      // Clean up URL parameter
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      router.replace(`/admin/expenses-incomes?${params.toString()}`);
    }
  }, [searchParams, router]);

  const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/admin/expenses-incomes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Transaction status updated to ${status}`);
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Transaction?',
      text: 'Are you sure you want to delete this transaction record?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/expenses-incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaction deleted');
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const title = tx.title?.toLowerCase() || '';
    const showroomName = tx.showroom?.name?.toLowerCase() || '';
    const matchesSearch = title.includes(term) || showroomName.includes(term);

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(tx.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        matchesDate = matchesDate && new Date(tx.date) <= new Date(dateFilter.to + 'T23:59:59');
      }
    }

    let matchesType = true;
    if (typeFilter !== 'all') {
      matchesType = (tx.type || 'expense') === typeFilter;
    }

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = (tx.status || 'Approved') === statusFilter;
    }

    return matchesSearch && matchesDate && matchesType && matchesStatus;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const overviewTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const title = tx.title?.toLowerCase() || '';
    const showroomName = tx.showroom?.name?.toLowerCase() || '';
    const matchesSearch = title.includes(term) || showroomName.includes(term);

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(tx.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        matchesDate = matchesDate && new Date(tx.date) <= new Date(dateFilter.to + 'T23:59:59');
      }
    }

    return matchesSearch && matchesDate;
  });

  // Totals only include Approved transactions (or old transactions with no status, defaults to Approved)
  const totalIncome = overviewTransactions
    .filter((tx) => tx.type === 'income' && (tx.status === 'Approved' || !tx.status))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalExpense = overviewTransactions
    .filter((tx) => (tx.type === 'expense' || !tx.type) && (tx.status === 'Approved' || !tx.status))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const pendingTransactions = overviewTransactions.filter((tx) => tx.status === 'Pending');
  const pendingCount = pendingTransactions.length;
  const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const isFiltered = !!(
    (filterByDate && (dateFilter.from || dateFilter.to)) ||
    searchTerm ||
    statusFilter !== 'all' ||
    typeFilter !== 'all'
  );

  return (
    <div className="space-y-0 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-0 md:gap-4 mt-0 md:mt-0">
        <div className="hidden md:block">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-heading">{t("expenses.title")}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">{t("expenses.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={() => setEditingTransaction(null)} className="w-full h-10 px-4 md:w-auto shrink-0 mb-[1px] md:mb-0" />}>
            <Plus className="h-4 w-4 mr-2" />
            <span>{t("expenses.add_record")}</span>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] w-full animate-in fade-in duration-200 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? t("expenses.edit_transaction") : t("expenses.add_transaction")}</DialogTitle>
            </DialogHeader>
            <TransactionForm
              initialData={editingTransaction}
              onSuccess={(wasEdit) => {
                if (wasEdit) {
                  setIsDialogOpen(false);
                }
                fetchTransactions();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Card (TallyPay Inspired) */}
      <Card className="relative overflow-hidden rounded-2xl border-none md:border bg-transparent md:bg-card shadow-none md:shadow-sm p-0 md:p-6 mt-[1px] md:mt-0">
        {/* 3 Cards in 1 Row */}
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {/* Income Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 mb-2">
              <ArrowDownCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              {t("expenses.total_income")}
            </span>
            <span className="text-xs md:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ৳{Math.round(totalIncome)}
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              {isFiltered ? t("expenses.filtered_inflow") : t("expenses.approved_total")}
            </span>
          </div>

          {/* Expense Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 mb-2">
              <ArrowUpCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              {t("expenses.total_expense")}
            </span>
            <span className="text-xs md:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              ৳{Math.round(totalExpense)}
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              {isFiltered ? t("expenses.filtered_outflow") : t("expenses.approved_total")}
            </span>
          </div>

          {/* Pending Requests Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 mb-2">
              <Clock className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              {t("expenses.pending")}
            </span>
            <span className="text-xs md:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingCount} {t("expenses.records")}
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              ৳{Math.round(pendingAmount)} {t("expenses.pending_small")}
            </span>
          </div>
        </div>
      </Card>

      <Card className="border-none md:border bg-transparent md:bg-card shadow-none md:shadow-sm mt-4 md:mt-0">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 px-0 md:px-6">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <CardTitle>{t("expenses.all_transactions")}</CardTitle>
            {/* Mobile Filter Toggle Button */}
            <div className="block lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {t("expenses.filters")}
                {isFiltered && (
                  <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop & Collapsible Mobile Filters Wrapper */}
          <div className={`grid transition-all duration-300 ease-in-out lg:block w-full ${
            showMobileFilters 
              ? 'grid-rows-[1fr] opacity-100 mt-3 visible' 
              : 'grid-rows-[0fr] opacity-0 invisible lg:visible lg:opacity-100 lg:grid-rows-none'
          }`}>
            <div className="overflow-hidden flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("expenses.search_placeholder") as string}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
                <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="w-full lg:w-36">
                    <SelectValue placeholder={t("expenses.all_types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("expenses.all_types")}</SelectItem>
                    <SelectItem value="expense">{t("expenses.expense")}</SelectItem>
                    <SelectItem value="income">{t("expenses.income")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="w-full lg:w-36">
                    <SelectValue placeholder={t("expenses.all_statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("expenses.all_statuses")}</SelectItem>
                    <SelectItem value="Approved">{t("expenses.approved")}</SelectItem>
                    <SelectItem value="Pending">{t("expenses.pending")}</SelectItem>
                    <SelectItem value="Rejected">{t("expenses.rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-1.5 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-foreground shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={filterByDate}
                      onChange={(e) => setFilterByDate(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                    />
                    {t("expenses.filter_by_date")}
                  </label>

                  <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Input
                      type="date"
                      className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                      value={dateFilter.from}
                      onChange={(e) => setDateFilter((prev: any) => ({ ...prev, from: e.target.value }))}
                      disabled={!filterByDate}
                    />
                    <span className="text-muted-foreground text-[10px] shrink-0 font-medium">{t("expenses.to")}</span>
                    <Input
                      type="date"
                      className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                      value={dateFilter.to}
                      onChange={(e) => setDateFilter((prev: any) => ({ ...prev, to: e.target.value }))}
                      disabled={!filterByDate}
                    />
                  </div>
                </div>

                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setDateFilter({
                        from: format(firstDay, 'yyyy-MM-dd'),
                        to: format(lastDay, 'yyyy-MM-dd'),
                      });
                      setFilterByDate(false);
                      setSearchTerm('');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-xs text-muted-foreground hover:text-primary shrink-0 h-8"
                  >
                    {t("expenses.clear")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <p>{t("expenses.no_transactions")}</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("expenses.date")}</TableHead>
                      <TableHead>{t("expenses.title_col")}</TableHead>
                      <TableHead>{t("expenses.showroom_origin")}</TableHead>
                      <TableHead>{t("expenses.type")}</TableHead>
                      <TableHead>{t("expenses.status")}</TableHead>
                      <TableHead className="text-right">{t("expenses.amount")}</TableHead>
                      <TableHead className="text-right">{t("expenses.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => {
                      const isExpense = (tx.type || 'expense') === 'expense';
                      return (
                        <TableRow key={tx._id}>
                          <TableCell>{format(new Date(tx.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <div className="font-medium">{tx.title}</div>
                            {tx.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 max-w-[300px] break-words">
                                {tx.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.showroom?.name ? (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {tx.showroom.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {t("expenses.head_office")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isExpense ? (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                                {t("expenses.expense")}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                                {t("expenses.income")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(tx.status === 'Approved' || !tx.status) && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                                {t("expenses.approved")}
                              </span>
                            )}
                            {tx.status === 'Pending' && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                                {t("expenses.pending")}
                              </span>
                            )}
                            {tx.status === 'Rejected' && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                                {t("expenses.rejected")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isExpense ? '-' : '+'}৳{tx.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isAdmin && tx.status === 'Pending' && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-emerald-600 focus:text-emerald-600 font-bold"
                                      onClick={() => handleUpdateStatus(tx._id, 'Approved')}
                                    >
                                      <Check className="mr-2 h-4 w-4" /> {t("expenses.approve_action")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-rose-600 focus:text-rose-600 font-bold"
                                      onClick={() => handleUpdateStatus(tx._id, 'Rejected')}
                                    >
                                      <X className="mr-2 h-4 w-4" /> {t("expenses.reject_action")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(isAdmin || tx.status === 'Pending') && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingTransaction(tx);
                                        setIsDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" /> {t("expenses.edit_action")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDelete(tx._id)}
                                    >
                                      <Trash className="mr-2 h-4 w-4" /> {t("expenses.delete_action")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View (Rounded individual cards matching products page) */}
              <div className="block md:hidden space-y-3">
                {paginatedTransactions.map((tx) => {
                  const isExpense = (tx.type || 'expense') === 'expense';
                  return (
                    <div key={tx._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                      {/* Top Row: Title & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-base text-foreground leading-snug">{tx.title}</p>
                        
                        {/* Action Menu */}
                        <div className="shrink-0 -mr-1 -mt-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                                <MoreHorizontal className="h-4.5 w-4.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isAdmin && tx.status === 'Pending' && (
                                <>
                                  <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-600 font-bold"
                                    onClick={() => handleUpdateStatus(tx._id, 'Approved')}
                                  >
                                    <Check className="mr-2 h-4 w-4" /> {t("expenses.approve_action")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-600 font-bold"
                                    onClick={() => handleUpdateStatus(tx._id, 'Rejected')}
                                  >
                                    <X className="mr-2 h-4 w-4" /> {t("expenses.reject_action")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(isAdmin || tx.status === 'Pending') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingTransaction(tx);
                                      setIsDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> {t("expenses.edit_action")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(tx._id)}
                                  >
                                    <Trash className="mr-2 h-4 w-4" /> {t("expenses.delete_action")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Middle Row: Badges */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {tx.showroom?.name ? (
                          <span className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                            {tx.showroom.name}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {t("expenses.head_office")}
                          </span>
                        )}
                        {tx.status && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${tx.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : tx.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                            }`}>
                            {tx.status === 'Approved' ? t("expenses.approved") : tx.status === 'Pending' ? t("expenses.pending") : t("expenses.rejected")}
                          </span>
                        )}
                      </div>

                      {/* Description (optional) */}
                      {tx.description && (
                        <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-border/30 whitespace-pre-line leading-relaxed">
                          {tx.description}
                        </p>
                      )}

                      {/* Bottom Row: Date & Amount */}
                      <div className="flex items-center justify-between border-t pt-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </span>
                        <span className={`font-extrabold text-base ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isExpense ? '-' : '+'}৳{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="py-4 border-t bg-background px-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExpensesIncomesPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={7} columnCount={6} titleWidth="w-56" showStats={true} />}>
      <ExpensesIncomesContent />
    </Suspense>
  );
}

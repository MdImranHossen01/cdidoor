'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Plus, Trash, Edit, Search, Loader2, Info, Clock, CheckCircle2, XCircle, ArrowDownCircle, ArrowUpCircle, Wallet, SlidersHorizontal, MoreHorizontal } from 'lucide-react';
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
import { TransactionForm } from '@/components/admin/TransactionForm';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function ShowroomExpensesContent() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Pending' | 'Rejected'>('all');
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchTransactions = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch('/api/admin/expenses-incomes');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/expenses-incomes');
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const data = await res.json();
        if (isMounted) setTransactions(data);
      } catch (error: any) {
        if (isMounted) toast.error(error.message || 'Failed to fetch transactions');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Expense Entry?',
      text: 'Are you sure you want to delete this expense entry?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/expenses-incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Expense deleted');
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete expense');
      }
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const title = tx.title?.toLowerCase() || '';
    const category = tx.category?.toLowerCase() || '';
    const matchesSearch = title.includes(term) || category.includes(term);

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(tx.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        const nextDay = new Date(dateFilter.to + 'T00:00:00');
        nextDay.setDate(nextDay.getDate() + 1);
        matchesDate = matchesDate && new Date(tx.date) < nextDay;
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

  const totalExpense = filteredTransactions
    .filter(tx => (tx.type === 'expense' || !tx.type) && (tx.status === 'Approved' || !tx.status))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const pendingExpense = filteredTransactions
    .filter(tx => tx.status === 'Pending')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const fmt = (n: number) => `৳${n.toLocaleString('en-BD')}`;

  const isFiltered = !!((filterByDate && (dateFilter.from || dateFilter.to)) || searchTerm || statusFilter !== 'all' || typeFilter !== 'all');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/30 gap-1 font-semibold text-xs">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'Pending':
        return (
          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-500/30 gap-1 font-semibold text-xs">
            <Clock className="h-3 w-3" /> Pending Approval
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="destructive" className="gap-1 font-semibold text-xs">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && transactions.length === 0) {
    return <AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" showStats={true} />;
  }

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-0 py-[1px]">
        <div className="hidden md:block">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Showroom Expenses & Incomes</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            আপনার শো-রুমের দৈনন্দিন খরচ ও আয়ের তালিকা এন্ট্রি দিন।
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={() => setEditingTransaction(null)} className="w-full md:w-auto md:h-10 shrink-0" />}>
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            <span>{t('store.showroom.add_expense') || 'Add Expense'}/Income</span>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
            </DialogHeader>
            <TransactionForm
              initialData={editingTransaction}
              onSuccess={() => {
                setIsDialogOpen(false);
                fetchTransactions();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sync Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">অ্যাডমিন সিঙ্ক প্রক্রিয়া (Approval Process)</h4>
          <p className="text-xs text-muted-foreground mt-1">
            শো-রুম ম্যানেজার কর্তৃক যুক্ত করা প্রতিটি নতুন খরচ প্রথমে <strong>Pending Admin Approval</strong> হিসেবে থাকবে। অ্যাডমিন কর্তৃক অনুমোদিত (Approved) হওয়ার পরই তা লেজারে হিসাবভুক্ত হবে এবং অ্যাডমিন ড্যাশবোর্ডে সিঙ্ক হবে।
          </p>
        </div>
      </div>

      {/* Overview Card (TallyPay Inspired) */}
      <Card className="relative overflow-hidden rounded-2xl border-none md:border bg-transparent md:bg-card shadow-none md:shadow-sm p-0 md:p-6">
        {/* 3 Cards in 1 Row */}
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {/* Approved Expense Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 mb-2">
              <ArrowDownCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              Approved Cost
            </span>
            <span className="text-xs md:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {fmt(totalExpense)}
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              {isFiltered ? 'Filtered approved' : 'Approved total'}
            </span>
          </div>

          {/* Pending Expense Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 mb-2">
              <ArrowUpCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              Pending Cost
            </span>
            <span className="text-xs md:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {fmt(pendingExpense)}
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              Awaiting admin check
            </span>
          </div>

          {/* Total Entries Card */}
          <div className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500 mb-2">
              <Wallet className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
              Total Entries
            </span>
            <span className="text-xs md:text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {filteredTransactions.length}টি
            </span>
            <span className="text-[7px] md:text-[9px] text-muted-foreground mt-1 truncate max-w-full">
              Showroom logs count
            </span>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="border-none md:border bg-transparent md:bg-card shadow-none md:shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 px-0 md:px-6">
          <div className="flex items-center justify-between gap-4 px-4 md:px-0 w-full lg:w-auto">
            <CardTitle className="text-base font-semibold">Transactions</CardTitle>
            {/* Mobile Filter Toggle Button */}
            <div className="block lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`h-9 px-3 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {isFiltered && (
                  <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop & Collapsible Mobile Filters Wrapper */}
          <div className={`grid transition-all duration-300 ease-in-out lg:block w-full ${showMobileFilters
            ? 'grid-rows-[1fr] opacity-100 mt-3 visible'
            : 'grid-rows-[0fr] opacity-0 invisible lg:visible lg:opacity-100 lg:grid-rows-none'
            }`}>
            <div className="overflow-hidden flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description/category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
                <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="w-full lg:w-36">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="w-full lg:w-36">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center lg:justify-start gap-2 w-full lg:w-auto">
                <div className="flex flex-1 lg:flex-initial items-center gap-2 bg-muted/50 p-1 rounded-md border text-sm w-full lg:w-auto">
                  <label className="flex items-center gap-1.5 px-2 cursor-pointer select-none text-xs font-semibold text-foreground shrink-0">
                    <input
                      type="checkbox"
                      checked={filterByDate}
                      onChange={(e) => setFilterByDate(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-muted-foreground/30 text-primary accent-primary cursor-pointer"
                    />
                    <span>{t('store.showroom.filter_by_date') || 'Filter by Date'}</span>
                  </label>
                  <Input
                    type="date"
                    disabled={!filterByDate}
                    className={`h-8 flex-1 lg:w-32 border-none bg-transparent focus-visible:ring-0 p-1 ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  />
                  <span className={`text-muted-foreground text-xs shrink-0 ${!filterByDate ? 'opacity-40' : ''}`}>to</span>
                  <Input
                    type="date"
                    disabled={!filterByDate}
                    className={`h-8 flex-1 lg:w-32 border-none bg-transparent focus-visible:ring-0 p-1 ${!filterByDate ? 'opacity-40 cursor-not-allowed' : ''}`}
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>

                {((filterByDate && (dateFilter.from || dateFilter.to)) || searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterByDate(false);
                      setDateFilter({ from: '', to: '' });
                      setSearchTerm('');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-muted-foreground text-sm">{t('store.showroom.no_transactions') || 'কোনো লেনদেন পাওয়া যায়নি।'}</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <Table className="block md:table">
                  <TableHeader className="hidden md:table-header-group">
                    <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                      <TableHead>{t('store.showroom.date') || 'তারিখ'}</TableHead>
                      <TableHead>{t('store.showroom.description') || 'বিবরণ'}</TableHead>
                      <TableHead>{t('store.showroom.category') || 'ক্যাটাগরি'}</TableHead>
                      <TableHead>{t('store.showroom.type') || 'টাইপ'}</TableHead>
                      <TableHead className="text-right">{t('store.showroom.amount') || 'পরিমাণ'}</TableHead>
                      <TableHead>{t('store.showroom.status') || 'অবস্থা (Status)'}</TableHead>
                      <TableHead className="text-right">{t('store.showroom.action') || 'অ্যাকশন'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
                    {filteredTransactions.map((tx) => (
                      <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0" key={tx._id}>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-xs whitespace-nowrap">
                          {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left font-medium text-sm">
                          {tx.title}
                          {tx.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{tx.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                          <Badge variant="outline" className="text-xs font-normal">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                          <Badge
                            variant={tx.type === 'income' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {tx.type === 'income' ? t('store.showroom.income') || 'আয় (Income)' : t('store.showroom.expense') || 'খরচ (Expense)'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`block md:table-cell py-1.5 md:py-4 text-left text-right font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount || 0)}
                        </TableCell>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                          {statusBadge(tx.status || 'Approved')}
                        </TableCell>
                        <TableCell className="block md:table-cell py-1.5 md:py-4 text-left text-right">
                          {tx.status === 'Pending' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingTransaction(tx);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(tx._id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground pr-2">Locked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden space-y-2.5">
                {filteredTransactions.map((tx) => {
                  const isExpense = (tx.type || 'expense') === 'expense';
                  return (
                    <div key={tx._id} className="p-4 bg-background border rounded-xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base text-foreground truncate">{tx.title}</p>
                          <div className="flex flex-wrap gap-1.5 items-center pt-1">
                            <span className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                              {tx.category || 'General'}
                            </span>
                            {tx.status && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${tx.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                                : tx.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                                }`}>
                                {tx.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`font-extrabold text-sm sm:text-base ${!isExpense ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {!isExpense ? '+' : '-'}{fmt(tx.amount || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium pt-1">
                            {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                      </div>

                      {tx.description && (
                        <div className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border">
                          {tx.description}
                        </div>
                      )}

                      {tx.status === 'Pending' && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm h-9"
                            onClick={() => {
                              setEditingTransaction(tx);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm h-9"
                            onClick={() => handleDelete(tx._id)}
                          >
                            <Trash className="mr-1.5 h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ShowroomExpensesPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ShowroomExpensesContent />
    </Suspense>
  );
}

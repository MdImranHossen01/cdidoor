'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash, Edit, Search, MoreHorizontal, Loader2, Check, X, ArrowDownCircle, ArrowUpCircle, Wallet, Clock, SlidersHorizontal, ChevronDown, FileText, Printer } from 'lucide-react';
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
import { ExpenseAddForm } from '@/components/admin/ExpenseAddForm';
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
  DropdownMenuSeparator,
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
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      
      {/* Mobile Header and Filters (Reference Design) */}
      <div className="bg-[#e6f4ea] p-2 space-y-2 md:bg-transparent md:p-0 md:space-y-6">
        
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">খরচের তালিকা</h1>
          </div>
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }} 
            className="bg-[#28a745] hover:bg-[#218838] text-white rounded font-medium"
          >
            <Plus className="h-4 w-4 stroke-[3] mr-1.5" />
            <span>অ্যাড</span>
          </Button>
        </div>

        {/* Mobile Filter Grid */}
        <div className="block md:hidden">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white rounded border border-slate-300 relative">
              <label className="text-[10px] text-slate-500 absolute top-0.5 left-2">ক্যাটাগরি</label>
              <select 
                className="w-full bg-transparent outline-none text-sm pt-4 pb-1 px-2 appearance-none text-slate-700 font-medium"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">--- সকল ---</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <ChevronDown className="absolute right-2 top-3.5 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            
            <div className="bg-white rounded border border-slate-300 relative">
              <label className="text-[10px] text-slate-500 absolute top-0.5 left-2">স্টাফ</label>
              <select className="w-full bg-transparent outline-none text-sm pt-4 pb-1 px-2 appearance-none text-slate-700 font-medium">
                <option value="all">--- সকল ---</option>
              </select>
              <ChevronDown className="absolute right-2 top-3.5 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <div className="bg-white rounded border border-slate-300 relative">
              <label className="text-[10px] text-slate-500 absolute top-0.5 left-2">থেকে</label>
              <input 
                type="date"
                className="w-full bg-transparent outline-none text-sm pt-4 pb-1 px-2 text-slate-700 font-medium"
                value={dateFilter.from}
                onChange={(e) => setDateFilter((prev: any) => ({ ...prev, from: e.target.value }))}
              />
            </div>

            <div className="bg-white rounded border border-slate-300 relative">
              <label className="text-[10px] text-slate-500 absolute top-0.5 left-2">পর্যন্ত</label>
              <input 
                type="date"
                className="w-full bg-transparent outline-none text-sm pt-4 pb-1 px-2 text-slate-700 font-medium"
                value={dateFilter.to}
                onChange={(e) => setDateFilter((prev: any) => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }} 
            className="bg-[#28a745] hover:bg-[#218838] text-white h-9 px-3 rounded shadow-sm text-sm font-medium"
          >
            <Plus className="h-4 w-4 stroke-[3] mr-1" /> অ্যাড
          </Button>
        </div>

        {/* Unified Reference-styled Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent 
            className="w-[94%] max-w-[450px] p-0 border-0 rounded-lg overflow-hidden bg-white shadow-2xl [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/20 [&_[data-slot=dialog-close]]:top-2.5 [&_[data-slot=dialog-close]]:right-2.5 [&_[data-slot=dialog-close]]:h-7 [&_[data-slot=dialog-close]]:w-7 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center"
            showCloseButton={true}
          >
            <div className="bg-[#28a745] text-white px-3.5 py-2.5 flex items-center justify-between select-none">
              <DialogTitle className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight m-0">
                {t("expenses.add_expense") || "খরচ অ্যাড"}
              </DialogTitle>
            </div>
            <div className="p-3 sm:p-3.5 bg-white">
              <ExpenseAddForm
                initialData={editingTransaction}
                onSuccess={(wasEdit) => {
                  setIsDialogOpen(false);
                  fetchTransactions();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-1 md:px-0 mt-2 md:mt-0 bg-white md:bg-transparent print:hidden">
        <div className="flex items-center justify-between mb-3 px-1 md:px-0">
          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <span>শো হবে</span>
            <select 
              className="border border-slate-300 rounded p-1 bg-white outline-none"
              value={ITEMS_PER_PAGE}
              onChange={(e) => {}}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>এন্ট্রিস</span>
          </div>
          <Button onClick={() => window.print()} size="sm" className="bg-[#17a2b8] hover:bg-[#138496] text-white h-8 rounded px-3 font-medium">
            <Printer className="mr-1.5 h-4 w-4" /> প্রিন্ট
          </Button>
        </div>
      </div>

      <div className="px-1 md:px-0">
        <Card className="border-0 bg-transparent md:border md:bg-card shadow-none md:shadow-sm">
          <CardContent className="p-0">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto p-4">
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

            {/* Mobile View */}
            <div className="block md:hidden space-y-3 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border rounded-md bg-white shadow-sm space-y-2.5 p-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">কোনো ডেটা পাওয়া যায়নি</div>
              ) : (
                paginatedTransactions.map((tx) => (
                  <div key={tx._id} className="border border-slate-200 rounded-sm bg-white shadow-sm text-[13px] text-slate-800">
                    <div className="flex justify-end p-2 border-b border-slate-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-[#17a2b8] hover:bg-[#138496] text-white h-7 px-2.5 rounded shadow-sm text-xs font-medium">
                            অ্যাকশন <ChevronDown className="ml-1 h-3 w-3 stroke-[3]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card w-44 text-sm font-medium text-slate-700">
                          <DropdownMenuItem className="cursor-pointer py-2" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4 text-slate-500" /> প্রিন্ট
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer py-2">
                            <FileText className="mr-2 h-4 w-4 text-slate-500" /> বাকি জমা করুন
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer py-2">
                            <FileText className="mr-2 h-4 w-4 text-slate-500" /> পেমেন্টের তালিকা
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {(isAdmin || tx.status === 'Pending') && (
                            <>
                              <DropdownMenuItem className="cursor-pointer py-2" onClick={() => {
                                setEditingTransaction(tx);
                                setIsDialogOpen(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> এডিট
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer py-2 hover:!text-rose-600 focus:!text-rose-600" onClick={() => handleDelete(tx._id)}>
                                <Trash className="mr-2 h-4 w-4 text-slate-500 group-hover:text-rose-600 group-focus:text-rose-600" /> ডিলিট
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex justify-between items-start px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">তারিখ</span>
                      <div className="text-right">
                        <div>{format(new Date(tx.date), 'dd-MMM-yyyy')}</div>
                        {tx.employee?.email && <div className="text-[11px] text-slate-500 mt-0.5">By: {tx.employee.email}</div>}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">ক্যাটাগরি</span>
                      <span>{tx.title}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">স্টাফ</span>
                      <span className="uppercase">{tx.employee?.name || '-'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">এমাউন্ট</span>
                      <span>{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">পেইড এমাউন্ট</span>
                      <span className="text-emerald-600 font-semibold">{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
                      <span className="font-bold">বাকি</span>
                      <span className="text-rose-600 font-semibold">0.00</span>
                    </div>

                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="font-bold">নোট</span>
                      <span className="text-slate-600">{tx.description || '...'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="py-4 bg-background px-2 md:px-6">
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

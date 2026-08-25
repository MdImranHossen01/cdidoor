'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Search,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Wallet,
  Landmark,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { AdminLedgerSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { useLanguage } from '@/contexts/LanguageContext';

function AccountsLedgerContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'super_admin';

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalSearchTerm, setJournalSearchTerm] = useState('');
  
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    };
  });
  const [filterByDate, setFilterByDate] = useState(true);

  // Editing Opening Balance state
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(0);
  const [updatingOpening, setUpdatingOpening] = useState(false);

  // Manual Transaction Dialog state
  const [isTxOpen, setIsTxOpen] = useState(false);
  
  const initialTab = (searchParams.get('tab') as 'journal' | 'transfer') || 'journal';
  const [activeTab, setActiveTab] = useState<'journal' | 'transfer'>(initialTab);

  const [accountCode, setAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [fromAccountCode, setFromAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [toAccountCode, setToAccountCode] = useState<'CASH' | 'BANK'>('BANK');
  const [journalType, setJournalType] = useState<'in' | 'out'>('out');
  const [journalAmount, setJournalAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creatingTx, setCreatingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(false);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (activeTab !== 'journal') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    router.push(`/admin/ledger?${params.toString()}`);
  }, [currentPage, activeTab]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/ledger?${params.toString()}`);
  }, [journalSearchTerm, filterByDate, dateFilter.from, dateFilter.to]);

  useEffect(() => {
    if (status === 'authenticated' && !isSuperAdmin) {
      router.push('/admin/dashboard');
    }
  }, [status, isSuperAdmin, router]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ledger/accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      toast.error('Failed to load accounts');
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ledger/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to load transaction logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (status === 'authenticated' && isSuperAdmin) {
        await Promise.all([fetchAccounts(), fetchTransactions()]);
      }
    };
    if (isMounted) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [status, isSuperAdmin, fetchAccounts, fetchTransactions]);

  if (status === 'loading') {
    return <AdminLedgerSkeleton />;
  }

  if (status === 'authenticated' && !isSuperAdmin) {
    return null;
  }


  const handleUpdateOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      setUpdatingOpening(true);
      const res = await fetch('/api/admin/ledger/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editingAccount.code,
          openingBalance: newOpeningBalance,
        }),
      });

      if (!res.ok) throw new Error('Failed to update opening balance');
      toast.success(`${editingAccount.name} opening balance updated!`);
      setEditingAccount(null);
      fetchAccounts();
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to update opening balance');
    } finally {
      setUpdatingOpening(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Title is required');
      return;
    }

    let finalEntryType: 'deposit' | 'withdrawal' | 'transfer' = 'deposit';
    let finalAmount = 0;

    if (activeTab === 'journal') {
      const amtVal = parseFloat(journalAmount) || 0;
      if (amtVal <= 0) {
        toast.error('Please enter a positive amount.');
        return;
      }

      if (journalType === 'in') {
        finalEntryType = 'deposit';
        finalAmount = amtVal;
      } else {
        finalEntryType = 'withdrawal';
        finalAmount = amtVal;
      }
    } else {
      const transVal = parseFloat(transferAmount) || 0;
      if (transVal <= 0) {
        toast.error('Please enter a positive transfer amount.');
        return;
      }
      finalEntryType = 'transfer';
      finalAmount = transVal;
    }

    try {
      setCreatingTx(true);
      const payload = {
        entryType: finalEntryType,
        amount: finalAmount,
        description,
        date,
        accountCode: finalEntryType !== 'transfer' ? accountCode : undefined,
        fromAccountCode: finalEntryType === 'transfer' ? fromAccountCode : undefined,
        toAccountCode: finalEntryType === 'transfer' ? toAccountCode : undefined,
      };

      const url = editingTx ? `/api/admin/ledger/transactions/${editingTx._id}` : '/api/admin/ledger/transactions';
      const method = editingTx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Transaction saving failed');
      }

      toast.success(editingTx ? 'Ledger entry updated successfully!' : 'Ledger entry recorded successfully!');
      
      if (editingTx) {
        setIsTxOpen(false);
        setEditingTx(null);
        resetTxForm();
      } else {
        setJournalAmount('');
        setTransferAmount('');
        setDescription('');
        setTimeout(() => {
          titleRef.current?.focus();
        }, 50);
      }
      
      fetchAccounts();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setCreatingTx(false);
    }
  };

  const handleEditClick = (tx: any) => {
    setEditingTx(tx);
    const tab = tx.reference === 'manual-transfer' ? 'transfer' : 'journal';
    setActiveTab(tab);
    
    setAccountCode(tx.account?.code || 'CASH');
    setJournalType(tx.type === 'debit' ? 'in' : 'out');
    
    const cleanDesc = tx.description.replace(/^(Transfer to |Transfer from |Manual Deposit: |Manual Withdrawal: |Transfer to CASH: |Transfer to BANK: |Transfer from CASH: |Transfer from BANK: )/g, '');
    setDescription(cleanDesc);
    setDate(format(new Date(tx.date), 'yyyy-MM-dd'));

    if (tab === 'journal') {
      setJournalAmount(tx.amount.toString());
    } else {
      setTransferAmount(tx.amount.toString());
      if (tx.type === 'debit') {
        setToAccountCode(tx.account?.code || 'BANK');
        setFromAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      } else {
        setFromAccountCode(tx.account?.code || 'CASH');
        setToAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      }
    }
    setIsTxOpen(true);
  };

  const handleDeleteTx = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Ledger Entry?',
      text: 'Are you sure you want to delete this manual transaction? This will update the running balances of the ledger.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/ledger/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaction deleted successfully');
        fetchAccounts();
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const resetTxForm = () => {
    setActiveTab('journal');
    setAccountCode('CASH');
    setFromAccountCode('CASH');
    setToAccountCode('BANK');
    setJournalType('out');
    setJournalAmount('');
    setTransferAmount('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingTx(null);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const term = journalSearchTerm.toLowerCase();
    const name = tx.account?.name?.toLowerCase() || '';
    const desc = tx.description?.toLowerCase() || '';
    const ref = tx.reference?.toLowerCase() || '';
    const matchesSearch = name.includes(term) || desc.includes(term) || ref.includes(term);

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

    return matchesSearch && matchesDate;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isFiltered = !!((filterByDate && (dateFilter.from || dateFilter.to)) || journalSearchTerm);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("ledger.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("ledger.subtitle")}
          </p>
        </div>
        <Button onClick={() => setIsTxOpen(true)} className="w-full md:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> {t("ledger.new_journal_entry")}
        </Button>
      </div>

      {/* Account Balance Card (TallyPay Inspired) */}
      <Card className="relative overflow-hidden rounded-2xl border-none md:border bg-transparent md:bg-card shadow-none md:shadow-sm p-0 md:p-6">
        {/* 4 Cards in 1 Row */}
        <div className="grid grid-cols-4 gap-2 md:gap-6">
          {accounts.map((acc) => {
            const isCash = acc.code === 'CASH';
            const isBank = acc.code === 'BANK';
            const isAR = acc.code === 'AR';
            const isAP = acc.code === 'AP';

            let iconBg = "bg-rose-50 dark:bg-rose-950/30 text-rose-500";
            let IconComponent = DollarSign;
            if (isCash) {
              iconBg = "bg-amber-50 dark:bg-amber-950/30 text-amber-500";
              IconComponent = Wallet;
            } else if (isBank) {
              iconBg = "bg-blue-50 dark:bg-blue-950/30 text-blue-500";
              IconComponent = Landmark;
            } else if (isAR) {
              iconBg = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500";
              IconComponent = ArrowDownCircle;
            } else if (isAP) {
              iconBg = "bg-purple-50 dark:bg-purple-950/30 text-purple-500";
              IconComponent = ArrowUpCircle;
            }

            return (
              <div key={acc._id} className="flex flex-col items-center text-center p-1 md:p-2 rounded-xl hover:bg-muted/50 transition-colors group relative">
                {/* Icon Wrapper */}
                <div className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full ${iconBg} mb-2`}>
                  <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                
                {/* Account Name */}
                <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-full">
                  {acc.name}
                </span>

                {/* Account Balance */}
                <span className="text-xs md:text-lg font-bold text-foreground mt-0.5">
                  ৳{Math.round(acc.currentBalance)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Transactions Journal */}
      <Card className="border-0 md:border bg-transparent md:bg-card shadow-none md:shadow-sm">
        <CardHeader className="px-4 md:px-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>{t("ledger.transaction_journal")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("ledger.search_placeholder") as string}
                  className="pl-8 text-xs h-8"
                  value={journalSearchTerm}
                  onChange={(e) => setJournalSearchTerm(e.target.value)}
                />
              </div>

              {/* Date Filter Checkbox & Date Inputs */}
              <div className="flex items-center gap-1.5 text-xs">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-foreground shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={filterByDate}
                    onChange={(e) => setFilterByDate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                  />
                  {t("ledger.filter_by_date")}
                </label>

                <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="date"
                    aria-label="Start date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    disabled={!filterByDate}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0 font-medium">{t("ledger.to")}</span>
                  <Input
                    type="date"
                    aria-label="End date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
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
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setDateFilter({
                      from: format(start, 'yyyy-MM-dd'),
                      to: format(end, 'yyyy-MM-dd')
                    });
                    setFilterByDate(false);
                    setJournalSearchTerm('');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary shrink-0 h-8"
                >
                  {t("ledger.clear")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Plus className="h-10 w-10 mb-2 stroke-1" />
              <p>{t("ledger.no_journal_entries")}</p>
            </div>
          ) : (
            <div>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ledger.date")}</TableHead>
                      <TableHead>{t("ledger.account")}</TableHead>
                      <TableHead>{t("ledger.description")}</TableHead>
                      <TableHead>{t("ledger.type")}</TableHead>
                      <TableHead className="text-right">{t("ledger.amount")}</TableHead>
                      <TableHead className="text-right">{t("ledger.running_balance")}</TableHead>
                      <TableHead className="text-right">{t("ledger.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{tx.account?.name}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p>{tx.description}</p>
                            {tx.reference && (
                              <span className="text-xs text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                                {t("ledger.ref")}: {tx.reference}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.type === 'debit' ? 'default' : 'outline'}
                            className={tx.type === 'debit' ? 'bg-primary/20 text-primary hover:bg-primary/20 border-transparent' : ''}
                          >
                            {tx.type === 'debit' ? t("ledger.debit") : t("ledger.credit")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">৳{Math.round(tx.amount)}</TableCell>
                        <TableCell className="text-right font-semibold">৳{Math.round(tx.balanceAfter)}</TableCell>
                        <TableCell className="text-right">
                          {tx.reference && ['manual-deposit', 'manual-withdrawal', 'manual-transfer'].includes(tx.reference) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(tx)}>
                                    <Edit2 className="mr-2 h-4 w-4 text-indigo-600" /> {t("ledger.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteTx(tx._id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> {t("ledger.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View (Individual rounded cards matching products page) */}
              <div className="block md:hidden space-y-3">
                {paginatedTransactions.map((tx) => {
                  const isDebit = tx.type === 'debit';
                  return (
                    <div key={tx._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                      {/* Top Row: Date & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-semibold">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </span>
                        <Badge
                          variant={isDebit ? 'default' : 'outline'}
                          className={isDebit ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-transparent font-extrabold text-xs px-2 py-0.5' : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-transparent font-extrabold text-xs px-2 py-0.5'}
                        >
                          {isDebit ? t("ledger.received") : t("ledger.spent")}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="font-bold text-base leading-snug text-foreground">{tx.description}</p>

                      {/* Middle Row: Meta info */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded font-semibold text-muted-foreground">
                          {tx.account?.name}
                        </span>
                        {tx.reference && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded font-semibold text-muted-foreground uppercase">
                            {t("ledger.ref")}: {tx.reference}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Amount & Balance details */}
                      <div className="flex items-center justify-between border-t pt-2 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("ledger.balance")}</span>
                          <span className="text-xs font-bold text-foreground">৳{Math.round(tx.balanceAfter).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">{isDebit ? t("ledger.received") : t("ledger.spent")}</span>
                          <span className={`font-extrabold text-base ${isDebit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isDebit ? '+' : '-'}৳{Math.round(tx.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Manual entries quick actions menu on mobile */}
                      {tx.reference && ['manual-deposit', 'manual-withdrawal', 'manual-transfer'].includes(tx.reference) && (
                        <div className="flex justify-end gap-2 pt-2 border-t border-dashed">
                          <Button variant="outline" size="xs" onClick={() => handleEditClick(tx)} className="h-8 px-3 text-xs font-bold text-indigo-600">
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> {t("ledger.edit")}
                          </Button>
                          <Button variant="outline" size="xs" onClick={() => handleDeleteTx(tx._id)} className="h-8 px-3 text-xs font-bold text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("ledger.delete")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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

      {/* Edit Opening Balance Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ledger.edit_opening_balance")} — {editingAccount?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBal">{t("ledger.opening_balance_label")}</Label>
              <Input
                id="openingBal"
                type="number"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(parseFloat(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("ledger.opening_balance_note")}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                {t("ledger.cancel")}
              </Button>
              <Button type="submit" disabled={updatingOpening} className="bg-primary text-primary-foreground">
                {updatingOpening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("ledger.save_balance")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Transaction Dialog */}
      <Dialog open={isTxOpen} onOpenChange={(open) => { setIsTxOpen(open); if(!open) resetTxForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? t("ledger.edit_journal_entry") : t("ledger.new_journal_entry_title")}</DialogTitle>
          </DialogHeader>

          {/* Custom Tabs */}
          {!editingTx && (
            <div className="flex border-b border-muted">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'journal'
                    ? 'border-primary text-primary font-bold animate-pulse-subtle'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('journal')}
              >
                {t("ledger.cash_in_out")}
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'transfer'
                    ? 'border-primary text-primary font-bold animate-pulse-subtle'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('transfer')}
              >
                {t("ledger.account_transfer")}
              </button>
            </div>
          )}

          <form onSubmit={handleCreateTransaction} className="space-y-4 pt-2">
            {activeTab === 'journal' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="txDate">{t("ledger.transaction_date")}</Label>
                    <Input
                      id="txDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accCode">{t("ledger.target_account")}</Label>
                    <Select
                      value={accountCode}
                      onValueChange={(val: any) => setAccountCode(val)}
                    >
                      <SelectTrigger id="accCode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">{t("ledger.cash_account")}</SelectItem>
                        <SelectItem value="BANK">{t("ledger.bank_account")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("ledger.type_label")}</Label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="in"
                        checked={journalType === 'in'}
                        onChange={() => setJournalType('in')}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        {t("ledger.debit_cash_in")}
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="out"
                        checked={journalType === 'out'}
                        onChange={() => setJournalType('out')}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
                      />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold text-sm">
                        {t("ledger.credit_cash_out")}
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="txDate">{t("ledger.transaction_date")}</Label>
                  <Input
                    id="txDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromAcc">{t("ledger.from_account")}</Label>
                    <Select
                      value={fromAccountCode}
                      onValueChange={(val: any) => {
                        setFromAccountCode(val);
                        if (val === toAccountCode) {
                          setToAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="fromAcc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">{t("ledger.cash_account")}</SelectItem>
                        <SelectItem value="BANK">{t("ledger.bank_account")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toAcc">{t("ledger.to_account")}</Label>
                    <Select
                      value={toAccountCode}
                      onValueChange={(val: any) => {
                        setToAccountCode(val);
                        if (val === fromAccountCode) {
                          setFromAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="toAcc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">{t("ledger.cash_account")}</SelectItem>
                        <SelectItem value="BANK">{t("ledger.bank_account")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="txDesc">{t("ledger.title_description")}</Label>
              <Input
                id="txDesc"
                ref={titleRef}
                autoFocus
                placeholder={
                  activeTab === 'journal'
                    ? "e.g. Sales Income or Facebook Ads Cost"
                    : "e.g. Account Transfer"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {activeTab === 'journal' ? (
              <div className="space-y-2">
                <Label htmlFor="journalAmt">{t("ledger.amount_label")}</Label>
                <Input
                  id="journalAmt"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={journalAmount}
                  onChange={(e) => setJournalAmount(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="transferAmt">{t("ledger.transfer_amount")}</Label>
                <Input
                  id="transferAmt"
                  type="number"
                  min="1"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsTxOpen(false)}>
                {t("ledger.cancel")}
              </Button>
              <Button type="submit" disabled={creatingTx} className="bg-primary text-primary-foreground">
                {creatingTx && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("ledger.log_transaction")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountsLedgerPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AccountsLedgerContent />
    </Suspense>
  );
}

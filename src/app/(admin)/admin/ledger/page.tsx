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
  Landmark
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
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === 'super_admin' || userRole === 'admin';

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

  const isMounted = useRef(false);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    router.push(`/admin/ledger?${params.toString()}`);
  }, [currentPage]);

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
    if (status === 'authenticated' && !isAuthorized) {
      router.push('/admin/dashboard');
    }
  }, [status, isAuthorized, router]);

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
      if (status === 'authenticated' && isAuthorized) {
        await Promise.all([fetchAccounts(), fetchTransactions()]);
      }
    };
    if (isMounted) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [status, isAuthorized, fetchAccounts, fetchTransactions]);

  if (status === 'loading') {
    return <AdminLedgerSkeleton />;
  }

  if (status === 'authenticated' && !isAuthorized) {
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

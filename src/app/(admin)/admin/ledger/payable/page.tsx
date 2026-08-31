'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Search, Loader2, DollarSign, Wallet, Landmark, Calendar, Phone } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';

export default function PayablePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'supplier' | 'loan'>('supplier');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [loanList, setLoanList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  
  // Form fields
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ledger/payable');
      if (!res.ok) throw new Error('Failed to fetch payables');
      const data = await res.json();
      setSupplierList(data.suppliers || []);
      setLoanList(data.businessLoans || []);

      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPayDialog = (entity: any) => {
    setSelectedEntity(entity);
    setPayAmount('');
    setSelectedAccount('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes(activeTab === 'supplier' ? `Supplier Payment: ${entity.name}` : `Loan Repayment: ${entity.name}`);
    setIsDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    const payAccObj = accounts.find(a => a.code === selectedAccount);
    if (payAccObj && amountVal > payAccObj.currentBalance) {
      toast.error(`Insufficient balance in ${payAccObj.name}. Available: ৳${payAccObj.currentBalance.toLocaleString()}`);
      return;
    }

    if (amountVal > selectedEntity.totalDue) {
      const confirmResult = await Swal.fire({
        title: 'Amount Exceeds Outstanding',
        text: `Entered amount (৳${amountVal}) is greater than current due (৳${selectedEntity.totalDue}). Do you want to continue?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, post it',
        cancelButtonText: 'No, cancel',
        confirmButtonColor: '#9f1239',
      });
      if (!confirmResult.isConfirmed) return;
    }

    setSubmitting(true);
    try {
      if (activeTab === 'supplier') {
        // Record supplier bill payment (Expense transaction)
        const payload = {
          type: 'expense',
          category: 'Account payable',
          title: notes || `Supplier Payment: ${selectedEntity.name}`,
          amount: amountVal,
          accountCode: selectedAccount,
          date: paymentDate,
          supplier: selectedEntity.supplierId,
          description: `Supplier payment recorded at Account Payable page. Notes: ${notes}`
        };

        const res = await fetch('/api/admin/expenses-incomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to record supplier payment');
        }
      } else {
        // Record loan payment using the BusinessLoan payment PUT route
        const payAcc = accounts.find(a => a.code === selectedAccount);
        if (!payAcc) throw new Error('Selected payment account not found');

        const payload = {
          action: 'PAY',
          paymentAmount: amountVal,
          paymentAccountId: payAcc._id,
        };

        const res = await fetch(`/api/admin/business-loans/${selectedEntity.loanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to record loan payment');
        }
      }

      await Swal.fire({
        title: 'Success!',
        text: 'Payment recorded successfully and accounts adjusted!',
        icon: 'success',
        confirmButtonColor: '#851b47',
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Summaries
  const totalSupplierDue = supplierList.reduce((sum, item) => sum + (item.totalDue || 0), 0);
  const totalSupplierMatured = supplierList.reduce((sum, item) => sum + (item.maturedDue || 0), 0);
  const totalLoanDue = loanList.reduce((sum, item) => sum + (item.totalDue || 0), 0);
  const totalLoanMatured = loanList.reduce((sum, item) => sum + (item.maturedDue || 0), 0);

  const activeList = activeTab === 'supplier' ? supplierList : loanList;
  const filteredList = activeList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.phone && item.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="hidden md:block">
        <h1 className="text-xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {t("sidebar.account_payable") || "Account Payable"}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Track and settle outstanding bills for suppliers and active business loan providers.
        </p>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5 px-2 md:px-0">
          {/* Supplier Card */}
          <Card className="bg-rose-50/20 border-rose-500/10 dark:bg-rose-950/10 border shadow-sm relative overflow-hidden">
            <CardContent className="p-3 md:p-5 flex flex-col justify-between h-full gap-1.5 md:gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] md:text-sm font-bold text-rose-800 dark:text-rose-400 truncate max-w-[90px] sm:max-w-none block">
                    Supplier Dues
                  </span>
                  <div className="text-sm md:text-3xl font-black text-rose-950 dark:text-rose-200 mt-1 md:mt-2">
                    ৳{Math.round(totalSupplierDue).toLocaleString()}
                  </div>
                </div>
                <div className="p-1 md:p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 shrink-0">
                  <Wallet className="h-4.5 w-4.5 md:h-5 md:w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="flex gap-1 items-center text-[8px] md:text-xs font-semibold text-rose-600 mt-1.5 md:mt-2 bg-rose-50 dark:bg-rose-950/20 w-fit px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-rose-100 dark:border-rose-950/30">
                <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="truncate max-w-[85px] sm:max-w-none">Matured: ৳{Math.round(totalSupplierMatured).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Business Loan Card */}
          <Card className="bg-amber-50/20 border-amber-500/10 dark:bg-amber-950/10 border shadow-sm relative overflow-hidden">
            <CardContent className="p-3 md:p-5 flex flex-col justify-between h-full gap-1.5 md:gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] md:text-sm font-bold text-amber-800 dark:text-amber-400 truncate max-w-[90px] sm:max-w-none block">
                    Loan Dues
                  </span>
                  <div className="text-sm md:text-3xl font-black text-amber-950 dark:text-amber-200 mt-1 md:mt-2">
                    ৳{Math.round(totalLoanDue).toLocaleString()}
                  </div>
                </div>
                <div className="p-1 md:p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 shrink-0">
                  <Landmark className="h-4.5 w-4.5 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="flex gap-1 items-center text-[8px] md:text-xs font-semibold text-rose-600 mt-1.5 md:mt-2 bg-rose-50 dark:bg-rose-950/20 w-fit px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-rose-100 dark:border-rose-950/30">
                <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="truncate max-w-[85px] sm:max-w-none">Matured: ৳{Math.round(totalLoanMatured).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-muted/50 mx-2 md:mx-0">
          <div className="flex gap-1 bg-muted p-1 rounded-lg w-full md:w-auto">
            <button
              type="button"
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'supplier'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('supplier'); setSearchQuery(''); }}
            >
              Suppliers ({supplierList.length})
            </button>
            <button
              type="button"
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'loan'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('loan'); setSearchQuery(''); }}
            >
              Business Loans ({loanList.length})
            </button>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'supplier' ? "Search by supplier..." : "Search by lender..."}
              className="pl-9 h-9 text-xs md:text-sm bg-card border-muted-foreground/35"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Main List */}
        <Card className="border-muted overflow-hidden shadow-sm mx-2 md:mx-0">
          <CardContent className="p-0">
            {loading ? (
              <AdminTableSkeleton />
            ) : filteredList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm font-semibold">
                No outstanding payables found matching filters.
              </div>
            ) : (
              <div>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/35 border-b border-muted">
                      <TableRow>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">
                          {activeTab === 'supplier' ? 'Supplier Name' : 'Lender Provider'}
                        </TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">
                          {activeTab === 'supplier' ? 'Contact Phone' : 'Repayment Type'}
                        </TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">
                          {activeTab === 'supplier' ? 'Total Bills' : 'Installment Details'}
                        </TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4 text-right">Total Due</TableHead>
                        <TableHead className="font-bold text-rose-600 text-xs md:text-sm py-4 text-right">Matured Due</TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map((entity, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 transition-colors border-b border-muted">
                          <TableCell className="font-bold text-foreground py-4 text-xs md:text-sm">
                            {entity.name}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm">
                            {activeTab === 'supplier' ? (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{entity.phone}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="font-semibold text-[10px] md:text-xs">
                                {entity.repaymentType}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm font-medium">
                            {activeTab === 'supplier' ? (
                              <Badge variant="secondary">
                                {entity.billsCount} Bills Due
                              </Badge>
                            ) : (
                              <span>
                                {entity.repaymentType === 'Installment' 
                                  ? `৳${Math.round(entity.installmentAmount || 0).toLocaleString()} / Monthly`
                                  : 'One-time Repayment'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right font-extrabold text-foreground">
                            ৳{Math.round(entity.totalDue).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right font-black text-rose-600">
                            ৳{Math.round(entity.maturedDue).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right">
                            <Button
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-7.5 md:h-8"
                              onClick={() => openPayDialog(entity)}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              Pay Out
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3 p-3 bg-zinc-50/55">
                  {filteredList.map((entity, idx) => (
                    <div key={idx} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-base text-foreground">{entity.name}</div>
                          {activeTab === 'supplier' ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{entity.phone}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="font-semibold text-[10px] md:text-xs mt-1">
                              {entity.repaymentType}
                            </Badge>
                          )}
                        </div>
                        {activeTab === 'supplier' ? (
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {entity.billsCount} Bills Dues
                          </Badge>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {entity.repaymentType === 'Installment'
                              ? `৳${Math.round(entity.installmentAmount || 0).toLocaleString()} / Mo`
                              : 'One-time'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 mt-1">
                        <div>
                          <span className="text-muted-foreground font-semibold">Total Due:</span>
                          <p className="font-extrabold text-sm text-foreground">৳{Math.round(entity.totalDue).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-rose-600 font-semibold">Matured Due:</span>
                          <p className="font-black text-sm text-rose-600">৳{Math.round(entity.maturedDue).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2 pt-2 border-t border-dashed">
                        <Button
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 w-full"
                          onClick={() => openPayDialog(entity)}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          Pay Out Dues
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pay Out Dialog */}
      {selectedEntity && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <Landmark className="h-5 w-5 text-rose-600" />
                Record Payment / Repayment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter payout details to settle dues with <strong>{selectedEntity.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground font-semibold">Total Dues:</span>
                  <p className="font-extrabold text-sm text-foreground">৳{Math.round(selectedEntity.totalDue).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-rose-600 font-semibold">Matured Installments:</span>
                  <p className="font-black text-sm text-rose-600">৳{Math.round(selectedEntity.maturedDue).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="payAmount" className="text-xs font-semibold">Payment Amount (Tk) <span className="text-destructive">*</span></Label>
                <Input
                  id="payAmount"
                  type="number"
                  placeholder="Enter amount"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-9 text-xs md:text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="payAccount" className="text-xs font-semibold">Pay From Account <span className="text-destructive">*</span></Label>
                <Select value={selectedAccount} onValueChange={(val) => setSelectedAccount(val || '')}>
                  <SelectTrigger id="payAccount" className="h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => {
                      const amountVal = parseFloat(payAmount) || 0;
                      const hasInsufficient = amountVal > acc.currentBalance;
                      return (
                        <SelectItem 
                          key={acc.code} 
                          value={acc.code} 
                          disabled={hasInsufficient}
                          className="text-xs md:text-sm"
                        >
                          {acc.name} (৳{acc.currentBalance.toLocaleString()}) {hasInsufficient && " - Insufficient Balance"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="payDate" className="text-xs font-semibold">Payment Date <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="payDate"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="pl-9 h-9 text-xs md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="payNotes" className="text-xs font-semibold">Remarks/Notes</Label>
                <Input
                  id="payNotes"
                  placeholder="Remarks e.g. transaction ID, voucher details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs md:text-sm"
                />
              </div>

              <DialogFooter className="gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Confirm Payment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

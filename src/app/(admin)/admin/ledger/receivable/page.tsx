'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Search, Loader2, DollarSign, UserCheck, Smartphone, Landmark, Calendar } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';

export default function ReceivablePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'wholesale' | 'general'>('wholesale');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists
  const [wholesaleList, setWholesaleList] = useState<any[]>([]);
  const [generalList, setGeneralList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Form fields
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ledger/receivable');
      if (!res.ok) throw new Error('Failed to fetch receivables');
      const data = await res.json();
      setWholesaleList(data.wholesaleCustomers || []);
      setGeneralList(data.generalCustomers || []);

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

  const openCollectDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setPayAmount('');
    setSelectedAccount('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes(`Accounts Receivable Collection: ${customer.name}`);
    setIsDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }
    if (amountVal > selectedCustomer.totalDue) {
      const confirmResult = await Swal.fire({
        title: 'Amount Exceeds Due',
        text: `Entered amount (৳${amountVal}) is greater than customer's current due (৳${selectedCustomer.totalDue}). Do you want to continue?`,
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
      const payload = {
        type: 'income',
        category: 'Account receivable',
        title: notes || `Accounts Receivable Collection: ${selectedCustomer.name}`,
        amount: amountVal,
        accountCode: selectedAccount,
        date: paymentDate,
        customerPhone: selectedCustomer.phone,
        description: `Payment collected at Account Receivable page. Notes: ${notes}`
      };

      const res = await fetch('/api/admin/expenses-incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to record payment');
      }

      await Swal.fire({
        title: 'Success!',
        text: 'Payment collection logged successfully and outstanding dues updated!',
        icon: 'success',
        confirmButtonColor: '#851b47',
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment collection');
    } finally {
      setSubmitting(false);
    }
  };

  // Summaries
  const totalWholesaleDue = wholesaleList.reduce((sum, item) => sum + (item.totalDue || 0), 0);
  const totalWholesaleMatured = wholesaleList.reduce((sum, item) => sum + (item.maturedDue || 0), 0);
  const totalGeneralDue = generalList.reduce((sum, item) => sum + (item.totalDue || 0), 0);
  const totalGeneralMatured = generalList.reduce((sum, item) => sum + (item.maturedDue || 0), 0);

  const activeList = activeTab === 'wholesale' ? wholesaleList : generalList;
  const filteredList = activeList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="hidden md:block">
        <h1 className="text-xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {t("sidebar.account_receivable") || "Account Receivable"}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Track and collect matured dues from wholesalers and general customer orders/bills.
        </p>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5 px-2 md:px-0">
          {/* Wholesale Card */}
          <Card className="bg-emerald-50/20 border-emerald-500/10 dark:bg-emerald-950/10 border shadow-sm relative overflow-hidden">
            <CardContent className="p-3 md:p-5 flex flex-col justify-between h-full gap-1.5 md:gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[10px] md:text-sm font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-[90px] sm:max-w-none">
                    Wholesale Dues
                  </CardTitle>
                  <div className="text-sm md:text-3xl font-black text-emerald-950 dark:text-emerald-200 mt-1 md:mt-2">
                    ৳{Math.round(totalWholesaleDue).toLocaleString()}
                  </div>
                </div>
                <div className="p-1 md:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                  <Landmark className="h-4.5 w-4.5 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="flex gap-1 items-center text-[8px] md:text-xs font-semibold text-rose-600 mt-1.5 md:mt-2 bg-rose-50 dark:bg-rose-950/20 w-fit px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-rose-100 dark:border-rose-950/30">
                <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="truncate max-w-[85px] sm:max-w-none">Matured: ৳{Math.round(totalWholesaleMatured).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* General Card */}
          <Card className="bg-indigo-50/20 border-indigo-500/10 dark:bg-indigo-950/10 border shadow-sm relative overflow-hidden">
            <CardContent className="p-3 md:p-5 flex flex-col justify-between h-full gap-1.5 md:gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[10px] md:text-sm font-bold text-indigo-800 dark:text-indigo-400 truncate max-w-[90px] sm:max-w-none">
                    General Dues
                  </CardTitle>
                  <div className="text-sm md:text-3xl font-black text-indigo-950 dark:text-indigo-200 mt-1 md:mt-2">
                    ৳{Math.round(totalGeneralDue).toLocaleString()}
                  </div>
                </div>
                <div className="p-1 md:p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                  <UserCheck className="h-4.5 w-4.5 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="flex gap-1 items-center text-[8px] md:text-xs font-semibold text-rose-600 mt-1.5 md:mt-2 bg-rose-50 dark:bg-rose-950/20 w-fit px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-rose-100 dark:border-rose-950/30">
                <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="truncate max-w-[85px] sm:max-w-none">Matured: ৳{Math.round(totalGeneralMatured).toLocaleString()}</span>
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
                activeTab === 'wholesale'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('wholesale'); setSearchQuery(''); }}
            >
              Wholesale ({wholesaleList.length})
            </button>
            <button
              type="button"
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'general'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('general'); setSearchQuery(''); }}
            >
              General POS Customers ({generalList.length})
            </button>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
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
                No outstanding dues found matching filters.
              </div>
            ) : (
              <div>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/35 border-b border-muted">
                      <TableRow>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">Customer Name</TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">Contact Info</TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4">
                          {activeTab === 'wholesale' ? 'Orders Count' : 'Bills Count'}
                        </TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4 text-right">Total Due</TableHead>
                        <TableHead className="font-bold text-rose-600 text-xs md:text-sm py-4 text-right">Matured Due</TableHead>
                        <TableHead className="font-bold text-foreground text-xs md:text-sm py-4 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map((customer, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 transition-colors border-b border-muted">
                          <TableCell className="font-bold text-foreground py-4 text-xs md:text-sm">
                            {customer.name}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Smartphone className="h-3.5 w-3.5" />
                              <span>{customer.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm font-medium">
                            <Badge variant="secondary">
                              {activeTab === 'wholesale' ? customer.ordersCount : customer.billsCount} Records
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right font-extrabold text-foreground">
                            ৳{Math.round(customer.totalDue).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right font-black text-rose-600">
                            ৳{Math.round(customer.maturedDue).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 text-xs md:text-sm text-right">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7.5 md:h-8"
                              onClick={() => openCollectDialog(customer)}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              Collect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3 p-3 bg-zinc-50/55">
                  {filteredList.map((customer, idx) => (
                    <div key={idx} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-base text-foreground">{customer.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {activeTab === 'wholesale' ? customer.ordersCount : customer.billsCount} Recs
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 mt-1">
                        <div>
                          <span className="text-muted-foreground font-semibold">Total Due:</span>
                          <p className="font-extrabold text-sm text-foreground">৳{Math.round(customer.totalDue).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-rose-600 font-semibold">Matured Due:</span>
                          <p className="font-black text-sm text-rose-600">৳{Math.round(customer.maturedDue).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2 pt-2 border-t border-dashed">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 w-full"
                          onClick={() => openCollectDialog(customer)}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          Collect Dues
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

      {/* Collect Payment Dialog */}
      {selectedCustomer && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Collect Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter payment details from <strong>{selectedCustomer.name}</strong> to adjust outstanding dues.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground font-semibold">Total Outstanding:</span>
                  <p className="font-extrabold text-sm text-foreground">৳{Math.round(selectedCustomer.totalDue).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-rose-600 font-semibold">Matured Outstanding:</span>
                  <p className="font-black text-sm text-rose-600">৳{Math.round(selectedCustomer.maturedDue).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="payAmount" className="text-xs font-semibold">Collection Amount (Tk) <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="adjustAccount" className="text-xs font-semibold">Receiving Account <span className="text-destructive">*</span></Label>
                <Select value={selectedAccount} onValueChange={(val) => setSelectedAccount(val || '')}>
                  <SelectTrigger id="adjustAccount" className="h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.code} value={acc.code} className="text-xs md:text-sm">
                        {acc.name} (৳{acc.currentBalance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="payDate" className="text-xs font-semibold">Collection Date <span className="text-destructive">*</span></Label>
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
                  placeholder="Remarks e.g. cheque, bank transfer details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs md:text-sm"
                />
              </div>

              <DialogFooter className="gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Confirm Collection
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

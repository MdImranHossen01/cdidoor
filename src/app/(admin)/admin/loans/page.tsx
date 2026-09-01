'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Trash2, CheckCircle, Landmark, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AllLoansPage() {
  const { t } = useLanguage();
  const [loans, setLoans] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expectedRepaymentDate, setExpectedRepaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const [repaymentType, setRepaymentType] = useState<'One-time' | 'Installment'>('One-time');
  const [installmentCount, setInstallmentCount] = useState<number | ''>('');
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [installmentDayOfMonth, setInstallmentDayOfMonth] = useState<number | ''>('');

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchProviders();
    fetchLedgerAccounts();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/business-loans');
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      }
    } catch (error) {
      toast.error('Failed to load business loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/loans/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchLedgerAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setLedgerAccounts(Array.isArray(data) ? data : (data.accounts || []));
      }
    } catch (error) {
      console.error('Error fetching ledger accounts:', error);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const lender = loan.lenderId?.name || loan.lenderName || '';
      return lender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.loanId.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [loans, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || amount <= 0 || !receivingAccountId) {
      toast.error('Please fill all required fields correctly.');
      return;
    }

    const provider = providers.find(p => p._id === selectedProviderId);
    if (!provider) {
      toast.error('Selected provider is invalid.');
      return;
    }

    const totalRepayment = Number(amount) + Number(interestAmount || 0);

    try {
      setFormLoading(true);
      const res = await fetch('/api/admin/business-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderName: provider.name,
          lenderId: provider._id,
          amount,
          date,
          expectedRepaymentDate,
          receivingAccountId,
          repaymentType,
          interestAmount,
          totalRepaymentAmount: totalRepayment,
          installmentCount: repaymentType === 'Installment' ? (installmentCount || 0) : undefined,
          installmentAmount: repaymentType === 'Installment' ? (installmentAmount || 0) : undefined,
          installmentDayOfMonth: repaymentType === 'Installment' ? (installmentDayOfMonth || 1) : undefined,
        })
      });

      if (res.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Loan added successfully',
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
        });
        setIsCreateOpen(false);
        fetchLoans();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to create loan');
      }
    } catch (error) {
      toast.error('Error creating loan');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || paymentAmount <= 0 || paymentAmount > selectedLoan.dueAmount || !paymentAccountId) {
      toast.error('Invalid payment details');
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch(`/api/admin/business-loans/${selectedLoan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY',
          paymentAmount,
          paymentAccountId
        })
      });

      if (res.ok) {
        Swal.fire({
          title: 'Payment Recorded!',
          text: 'Repayment transaction completed successfully.',
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
        });
        setIsPaymentOpen(false);
        fetchLoans();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Error recording payment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will delete the loan record.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/business-loans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Loan deleted');
        fetchLoans();
      } else {
        toast.error('Failed to delete loan');
      }
    } catch (error) {
      toast.error('Error deleting loan');
    }
  };

  const openCreateDialog = () => {
    setSelectedProviderId('');
    setAmount(0);
    setInterestAmount(0);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setExpectedRepaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setReceivingAccountId('');
    setRepaymentType('One-time');
    setInstallmentCount('');
    setInstallmentAmount('');
    setInstallmentDayOfMonth('');
    setIsCreateOpen(true);
  };

  const openPaymentDialog = (loan: any) => {
    setSelectedLoan(loan);
    setPaymentAmount(loan.dueAmount);
    setPaymentAccountId('');
    setIsPaymentOpen(true);
  };

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold text-primary tracking-tight">All Business Loans</h1>
          <p className="text-muted-foreground mt-1">Add, track, and repay active business loans</p>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto rounded-none h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          <Plus className="h-4 w-4 mr-2" /> Add New Loan
        </Button>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <CardTitle className="hidden md:flex text-lg font-semibold text-primary items-center gap-2">
                <Landmark className="h-5 w-5" />
                Loans List
              </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lender or Loan ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Repayment Type</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : filteredLoans.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">No loans found</TableCell></TableRow>
              ) : (
                filteredLoans.map((loan) => (
                  <TableRow key={loan._id}>
                    <TableCell className="font-semibold">{loan.loanId}</TableCell>
                    <TableCell className="font-medium">{loan.lenderId?.name || loan.lenderName}</TableCell>
                    <TableCell>
                      <span className="capitalize">{loan.repaymentType || 'One-time'}</span>
                      {loan.repaymentType === 'Installment' && ` (${loan.installmentCount} months)`}
                    </TableCell>
                    <TableCell className={new Date(loan.expectedRepaymentDate) < new Date() && loan.status === 'Active' ? 'text-red-600 font-bold' : ''}>
                      {format(new Date(loan.expectedRepaymentDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">৳{loan.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(loan.interestAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">৳{(loan.totalRepaymentAmount || loan.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">৳{(loan.paidAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-rose-600 font-semibold">৳{loan.dueAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        loan.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {loan.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {loan.status === 'Active' && (
                        <Button variant="ghost" size="sm" onClick={() => openPaymentDialog(loan)} className="text-emerald-600 hover:text-emerald-700 mr-2">
                          <CheckCircle className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(loan._id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (open) fetchLedgerAccounts();
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Business Loan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lenderSelect" className="text-xs font-semibold text-foreground">Select Lender / Provider *</Label>
              <select
                id="lenderSelect"
                value={selectedProviderId}
                onChange={e => setSelectedProviderId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">-- Select Provider --</option>
                {providers.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loanAmount" className="text-xs font-semibold text-foreground">Loan Amount (৳) *</Label>
                <Input id="loanAmount" type="number" min="1" required value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interestAmount" className="text-xs font-semibold text-foreground">Interest Amount (৳)</Label>
                <Input id="interestAmount" type="number" min="0" value={interestAmount || ''} onChange={e => setInterestAmount(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="repaymentType" className="text-xs font-semibold text-foreground">Repayment Type</Label>
                <select
                  id="repaymentType"
                  value={repaymentType}
                  onChange={e => setRepaymentType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="One-time">One-time</option>
                  <option value="Installment">Installment</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loanDate" className="text-xs font-semibold text-foreground">Loan Date</Label>
                <Input id="loanDate" type="date" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            {repaymentType === 'One-time' ? (
              <div className="space-y-1.5">
                <Label htmlFor="expRepayDate" className="text-xs font-semibold text-foreground">Expected Repayment Date</Label>
                <Input id="expRepayDate" type="date" required value={expectedRepaymentDate} onChange={e => setExpectedRepaymentDate(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-4 border-t pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="instCount" className="text-xs font-semibold text-foreground">Installment Count (Months)</Label>
                    <Input id="instCount" type="number" min="1" required value={installmentCount} onChange={e => setInstallmentCount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="instAmount" className="text-xs font-semibold text-foreground">Installment Amount (৳)</Label>
                    <Input id="instAmount" type="number" min="1" required value={installmentAmount} onChange={e => setInstallmentAmount(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="instDay" className="text-xs font-semibold text-foreground">Day of Month (1-31)</Label>
                    <Input id="instDay" type="number" min="1" max="31" required value={installmentDayOfMonth} onChange={e => setInstallmentDayOfMonth(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maturityDate" className="text-xs font-semibold text-foreground">Final Maturity Date</Label>
                    <Input id="maturityDate" type="date" required value={expectedRepaymentDate} onChange={e => setExpectedRepaymentDate(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="receivingAccount" className="text-xs font-semibold text-foreground">Receiving Account (Where money is deposited) *</Label>
              <select
                id="receivingAccount"
                value={receivingAccountId}
                onChange={e => setReceivingAccountId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">-- Select Receiving Account --</option>
                {ledgerAccounts.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.code === 'CASH' ? '💵 ' : a.accountCategory === 'MFS' ? '📱 ' : '🏦 '}
                    {a.name} {a.accountNo ? `(${a.accountNo})` : ''} - ৳{(a.currentBalance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Add Loan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={(open) => {
        setIsPaymentOpen(open);
        if (open) fetchLedgerAccounts();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Loan Repayment</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded text-sm mb-4">
                <p><strong>Lender:</strong> {selectedLoan.lenderId?.name || selectedLoan.lenderName}</p>
                <p><strong>Due Amount:</strong> ৳{selectedLoan.dueAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="repayAmount" className="text-xs font-semibold text-foreground">Payment Amount (৳)</Label>
                <Input id="repayAmount" type="number" min="1" max={selectedLoan.dueAmount} required value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentFromAccount" className="text-xs font-semibold text-foreground">Payment From Account</Label>
                <select
                  id="paymentFromAccount"
                  value={paymentAccountId}
                  onChange={e => setPaymentAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">-- Select Account --</option>
                  {ledgerAccounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.code === 'CASH' ? '💵 ' : a.accountCategory === 'MFS' ? '📱 ' : '🏦 '}
                      {a.name} {a.accountNo ? `(${a.accountNo})` : ''} - ৳{(a.currentBalance || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={formLoading}>{formLoading ? 'Processing...' : 'Submit Payment'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

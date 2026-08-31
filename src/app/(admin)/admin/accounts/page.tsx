'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { Plus, CreditCard, ArrowRightLeft, FileText, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AllAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    accountNo: '',
    note: '',
    branchName: '',
    mfsProvider: '',
    mfsType: '',
    bankAccountType: ''
  });

  const handleEditClick = (acc: any) => {
    setEditingAccount(acc);
    setEditFormData({
      name: acc.name || '',
      accountNo: acc.accountNo || '',
      note: acc.note || '',
      branchName: acc.branchName || '',
      mfsProvider: acc.mfsProvider || 'bKash',
      mfsType: acc.mfsType || 'Merchant',
      bankAccountType: acc.bankAccountType || 'Savings'
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      const res = await fetch(`/api/accounts/${editingAccount._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update account');
      }
      toast.success('Account updated successfully!');
      setIsEditDialogOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  const handleDeleteClick = async (acc: any) => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: `Are you sure you want to delete ${acc.name}? All transaction history for this account will remain in general ledger.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/accounts/${acc._id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete account');
      }
      toast.success('Account deleted successfully!');
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="flex flex-col gap-0 sm:gap-6 pt-[1px] sm:pt-6 pb-20">
      <div className="hidden sm:flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("sidebar.all_accounts") || "All Accounts"}
        </h1>
        <Link href="/admin/accounts/new" className="hidden md:block">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {t("sidebar.add_account") || "Add Account"}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-4 shadow-sm bg-card">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ))
        ) : accounts.length === 0 ? (
          <div className="col-span-full p-8 text-center border rounded-lg text-muted-foreground">
            No accounts found. Create one to get started.
          </div>
        ) : (
          accounts.map((acc) => (
            <div key={acc._id} className="border rounded-xl shadow-sm bg-card overflow-hidden flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-center border-b pb-3 mb-3 text-sm">
                  <span className="font-semibold text-muted-foreground">{t("accounts.code")}</span>
                  <span className="font-mono text-primary font-bold">{acc.code}</span>
                </div>
                
                <div className="flex justify-between items-center border-b pb-3 mb-3 text-sm">
                  <span className="font-semibold text-muted-foreground">{t("accounts.name_and_no")}</span>
                  <div className="text-right">
                    <p className="font-bold text-base">
                      {acc.name} 
                      {acc.code === 'CASH' && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Default Cash Account
                        </span>
                      )}
                      {acc.accountCategory && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          ({acc.accountCategory}
                           {acc.accountCategory === 'MFS' && acc.mfsProvider ? ` - ${acc.mfsProvider}` : ''}
                           {acc.accountCategory === 'MFS' && acc.mfsType ? ` (${acc.mfsType})` : ''}
                           {acc.accountCategory === 'Bank' && acc.bankAccountType ? ` - ${acc.bankAccountType}` : ''})
                        </span>
                      )}
                    </p>
                    {acc.accountNo && <p className="text-xs font-mono text-muted-foreground">{acc.accountNo}</p>}
                    {acc.branchName && <p className="text-xs text-muted-foreground">Branch: {acc.branchName}</p>}
                  </div>
                </div>

                <div className="flex justify-between items-center border-b pb-3 mb-3 text-sm">
                  <span className="font-semibold text-muted-foreground">{t("accounts.current_balance")}</span>
                  <span className="font-bold text-lg">৳ {acc.currentBalance.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-start border-b pb-3 mb-3 text-sm">
                  <span className="font-semibold text-muted-foreground shrink-0 mr-4">{t("accounts.note")}</span>
                  <span className="text-right italic">{acc.note || '...'}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-muted-foreground shrink-0 mr-4">{t("accounts.created_by_date")}</span>
                  <div className="text-right">
                    <p>{format(new Date(acc.createdAt), 'dd-MMM-yyyy hh:mm a')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {acc.createdBy?.name || 'System'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-t flex flex-wrap justify-center gap-2">
                <Link href={`/admin/expenses-incomes?action=new&type=income&accountCode=${acc.code.startsWith('AC') ? acc.code : acc.code}`}>
                  <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {t("accounts.credit") || "Credit +"}
                  </Button>
                </Link>
                <Link href={`/admin/expenses-incomes?action=new&type=expense&accountCode=${acc.code.startsWith('AC') ? acc.code : acc.code}`}>
                  <Button size="sm" variant="destructive">
                    {t("accounts.debit") || "Debit -"}
                  </Button>
                </Link>
                <Link href={`/admin/expenses-incomes?action=new&tab=transfer`}>
                  <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ArrowRightLeft className="w-4 h-4 mr-1" /> {t("accounts.transfer") || "Transfer"}
                  </Button>
                </Link>
                <Link href={`/admin/ledger?search=${encodeURIComponent(acc.name)}`}>
                  <Button size="sm" variant="default" className="bg-teal-600 hover:bg-teal-700 text-white">
                    <FileText className="w-4 h-4 mr-1" /> {t("accounts.ledger") || "Ledger"}
                  </Button>
                </Link>
                
                {acc.code.startsWith('AC') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto text-slate-600 border-slate-300 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(acc)} className="text-emerald-600 cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" /> {t("accounts.edit") || "Edit"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(acc)} className="text-red-600 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" /> {t("accounts.delete") || "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px] w-full animate-in fade-in duration-200">
          <DialogHeader>
            <DialogTitle>Edit Account - {editingAccount?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Account Name</Label>
              <Input 
                value={editFormData.name} 
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required 
              />
            </div>
            
            {editingAccount?.accountCategory === 'MFS' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">MFS Provider</Label>
                  <Select value={editFormData.mfsProvider} onValueChange={(val) => setEditFormData({ ...editFormData, mfsProvider: val || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bKash">bKash</SelectItem>
                      <SelectItem value="Nagad">Nagad</SelectItem>
                      <SelectItem value="Rocket">Rocket</SelectItem>
                      <SelectItem value="Upay">Upay</SelectItem>
                      <SelectItem value="mCash">mCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">MFS Type</Label>
                  <Select value={editFormData.mfsType} onValueChange={(val) => setEditFormData({ ...editFormData, mfsType: val || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Merchant">Merchant</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editingAccount?.accountCategory === 'Bank' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Branch Name</Label>
                  <Input 
                    value={editFormData.branchName} 
                    onChange={(e) => setEditFormData({ ...editFormData, branchName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Bank Account Type</Label>
                  <Select value={editFormData.bankAccountType} onValueChange={(val) => setEditFormData({ ...editFormData, bankAccountType: val || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(editingAccount?.accountCategory === 'MFS' || editingAccount?.accountCategory === 'Bank') && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Account Number</Label>
                <Input 
                  value={editFormData.accountNo} 
                  onChange={(e) => setEditFormData({ ...editFormData, accountNo: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Note</Label>
              <Textarea 
                value={editFormData.note} 
                onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

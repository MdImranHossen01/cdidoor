'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { Plus, CreditCard, ArrowRightLeft, FileText, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="flex flex-col gap-0 sm:gap-6 pt-[2px] sm:pt-6 pb-20">
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
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {t("accounts.credit")}
                </Button>
                <Button size="sm" variant="destructive">
                  {t("accounts.debit")}
                </Button>
                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <ArrowRightLeft className="w-4 h-4 mr-1" /> {t("accounts.transfer")}
                </Button>
                <Button size="sm" variant="default" className="bg-teal-600 hover:bg-teal-700 text-white">
                  <FileText className="w-4 h-4 mr-1" /> {t("accounts.ledger")}
                </Button>
                
                {acc.code.startsWith('AC') && (
                  <>
                    <Button size="sm" variant="outline" className="ml-auto text-emerald-600 border-emerald-600 hover:bg-emerald-50">
                      <Edit className="w-4 h-4 mr-1" /> {t("accounts.edit")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-1" /> {t("accounts.delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

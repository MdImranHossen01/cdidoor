/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Gift,
  Briefcase,
  Loader2,
  FileText,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EmployeeSalaryPage() {
  const { t } = useLanguage();

  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisbursement, setSelectedDisbursement] = useState<any | null>(null);

  useEffect(() => {
    async function loadSalaryData() {
      try {
        const [statsRes, disbRes] = await Promise.all([
          fetch('/api/employee/dashboard/stats'),
          fetch('/api/employee/dashboard/salaries')
        ]);

        if (statsRes.ok) {
          const sData = await statsRes.json();
          setStats(sData);
        }

        if (disbRes.ok) {
          const dData = await disbRes.json();
          setDisbursements(dData.disbursements || []);
        }
      } catch (error) {
        console.error('Failed to load salary details:', error);
        toast.error('Failed to load salary information');
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      loadSalaryData();
    }
  }, [session]);

  const fmt = (n: number) => `৳${Math.round(n || 0).toLocaleString('en-BD')}`;

  const isMonthly = stats?.profile?.employeeType === 'monthly';
  const totalEarnedAllTime = disbursements.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalBonusAllTime = disbursements
    .filter(d => (d.description || d.title || '').toLowerCase().includes('bonus'))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const getDisbursementTypeLabel = (category: string) => {
    switch (category) {
      case 'Staff Salary':
        return { label: 'Monthly Salary', badge: 'default' };
      case 'Wages':
        return { label: 'Task Wage', badge: 'outline' };
      default:
        return { label: category || 'Salary Payment', badge: 'default' };
    }
  };

  if (loading) {
    return <AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-48" showStats={true} />;
  }

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isMonthly ? 'Salary & Payment History' : 'Earnings & Payout History'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isMonthly
              ? (t('store.employee.salary_desc_monthly') || 'আপনার বেতন ও পরিশোধিত পারিশ্রমিকের বিস্তারিত তথ্য ও হিসাব।')
              : (t('store.employee.salary_desc_task') || 'আপনার সম্পন্ন কাজের অর্জিত মজুরি ও পরিশোধিত পারিশ্রমিকের হিসাব বিবরণী।')}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {isMonthly ? 'Permanent (Monthly)' : 'Contractual (Task-based)'}
          </Badge>
          {isMonthly && (
            <Badge variant="secondary" className="text-xs">
              Base: {fmt(stats?.profile?.baseSalary)}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isMonthly ? t('store.employee.received_this_month_monthly') || 'à¦à¦‡ à¦®à¦¾à¦¸à§‡à¦° à¦ªà§à¦°à¦¾à¦ªà§à¦¤à¦¿' : t('store.employee.received_this_month_task') || 'à¦šà¦²à¦¤à¦¿ à¦®à¦¾à¦¸à§‡à¦° à¦ªà§à¦°à¦¾à¦ªà§à¦¤à¦¿'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-primary">
              {fmt(stats?.salary?.thisMonth || 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_payment_this_month') || 'à¦šà¦²à¦¤à¦¿ à¦®à¦¾à¦¸à§‡à¦° à¦®à§‹à¦Ÿ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ'}</p>
          </CardContent>
        </Card>

        {isMonthly ? (
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.base_salary_title') || 'à¦¬à§‡à¦¸ à¦¸à§à¦¯à¦¾à¦²à¦¾à¦°à¦¿'}</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {fmt(stats?.profile?.baseSalary || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.fixed_monthly_salary') || 'à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤ à¦®à¦¾à¦¸à¦¿à¦• à¦¬à§‡à¦¤à¦¨'}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.total_task_wage') || 'à¦•à¦¾à¦œà§‡à¦° à¦®à§‹à¦Ÿ à¦®à¦œà§à¦°à¦¿'}</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {fmt(stats?.tasks?.totalEarnings || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {t('store.employee.completed_prefix') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨: '}{(stats?.tasks?.completed || 0) + (stats?.tasks?.paid || 0)}{t('store.employee.task_suffix') || 'à¦Ÿà¦¿ à¦•à¦¾à¦œ'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isMonthly ? t('store.employee.total_received_salary') || 'à¦®à§‹à¦Ÿ à¦ªà§à¦°à¦¾à¦ªà§à¦¤ à¦¬à§‡à¦¤à¦¨' : t('store.employee.total_paid_bill') || 'à¦®à§‹à¦Ÿ à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤ à¦¬à¦¿à¦²'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {fmt(totalEarnedAllTime)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_received_all_time') || 'à¦¸à¦¬ à¦¸à¦®à¦¯à¦¼ à¦®à¦¿à¦²à¦¿à¦¯à¦¼à§‡ à¦ªà§à¦°à¦¾à¦ªà§à¦¤ à¦®à§‹à¦Ÿ'}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isMonthly ? t('store.employee.total_bonus_monthly') || 'à¦®à§‹à¦Ÿ à¦¬à§‹à¦¨à¦¾à¦¸' : t('store.employee.total_bonus_task') || 'à¦¬à§‹à¦¨à¦¾à¦¸ / à¦…à¦¤à¦¿à¦°à¦¿à¦•à§à¦¤'}
            </CardTitle>
            <Gift className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {fmt(totalBonusAllTime)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.earned_bonus') || 'à¦…à¦°à§à¦œà¦¿à¦¤ à¦¬à§‹à¦¨à¦¾à¦¸ / à¦‡à¦¨à¦¸à§‡à¦¨à§à¦Ÿà¦¿à¦­'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Disbursement History Table */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{t('store.employee.disbursements_list') || 'à¦¬à§‡à¦¤à¦¨ à¦ªà§à¦°à¦¦à¦¾à¦¨à§‡à¦° à¦¤à¦¾à¦²à¦¿à¦•à¦¾ (Disbursements)'}</CardTitle>
              <CardDescription className="text-xs">
                {t('store.employee.disbursements_desc') || 'à¦…à§à¦¯à¦¾à¦¡à¦®à¦¿à¦¨ à¦•à¦°à§à¦¤à§ƒà¦• à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤ à¦¸à¦•à¦² à¦¬à§‡à¦¤à¦¨ à¦“ à¦¬à§‹à¦¨à¦¾à¦¸à§‡à¦° à¦¹à¦¿à¦¸à§à¦Ÿà§‹à¦°à¦¿ à¦“ à¦¹à¦¿à¦¸à¦¾à¦¬ à¦¬à¦¿à¦¬à¦°à¦£à§€à¥¤'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {disbursements.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold">{t('store.employee.date_th') || 'à¦¤à¦¾à¦°à¦¿à¦– (Date)'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.payment_type_th') || 'à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦Ÿà¦¾à¦‡à¦ª'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.period_th') || 'à¦®à¦¾à¦¸ / à¦ªà¦¿à¦°à¦¿à¦¯à¦¼à¦¡'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.paid_amount_th') || 'à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤ à¦…à¦°à§à¦¥'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.remarks_th') || 'à¦®à¦¨à§à¦¤à¦¬à§à¦¯ (Remarks)'}</TableHead>
                  <TableHead className="text-right font-bold">{t('store.employee.slip_th') || 'à¦¬à¦¿à¦¬à¦°à¦£à§€ (Slip)'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground text-sm">{t('store.employee.no_disbursement_records') || 'à¦•à§‹à¦¨à§‹ à¦¬à§‡à¦¤à¦¨ à¦ªà§à¦°à¦¦à¦¾à¦¨à§‡à¦° à¦°à§‡à¦•à¦°à§à¦¡ à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿à¥¤'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  disbursements.map((item) => {
                    const badgeInfo = getDisbursementTypeLabel(item.category);
                    return (
                      <TableRow key={item._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs">
                          {item.date ? format(new Date(item.date), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeInfo.badge as any} className="text-xs">
                            {badgeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-xs truncate">
                          <span className="flex items-center gap-1" title={item.title}>
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-foreground">
                          {fmt(item.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {item.description || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDisbursement(item)}
                            className="h-8 text-xs font-semibold flex items-center gap-1 ml-auto"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden space-y-3 p-2 bg-muted/10">
            {disbursements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <FileText className="h-8 w-8 mx-auto opacity-20" />
                <p>{t('store.employee.no_disbursement_records') || 'à¦•à§‹à¦¨à§‹ à¦¬à§‡à¦¤à¦¨ à¦ªà§à¦°à¦¦à¦¾à¦¨à§‡à¦° à¦°à§‡à¦•à¦°à§à¦¡ à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿à¥¤'}</p>
              </div>
            ) : (
              disbursements.map((item) => {
                const badgeInfo = getDisbursementTypeLabel(item.category);
                return (
                  <div key={item._id} className="p-4 bg-background border rounded-xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={badgeInfo.badge as any} className="text-xs">
                        {badgeInfo.label}
                      </Badge>
                      <span className="text-base sm:text-lg font-black text-primary">
                        {fmt(item.amount)}
                      </span>
                    </div>

                    <div className="flex flex-col text-xs sm:text-sm text-muted-foreground gap-1">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {item.title}
                      </span>
                      <span>
                        {item.date ? format(new Date(item.date), 'dd MMM yyyy, p') : 'N/A'}
                      </span>
                    </div>

                    {item.description && (
                      <div className="text-xs sm:text-sm bg-muted/30 p-2.5 rounded-lg border text-foreground/90">
                        <span className="text-muted-foreground font-bold">Note:</span> {item.description}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDisbursement(item)}
                      className="w-full text-xs sm:text-sm h-9 font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" /> Details
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Salary Breakdown Modal */}
      <Dialog open={!!selectedDisbursement} onOpenChange={(open) => !open && setSelectedDisbursement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Salary & Payment Breakdown
            </DialogTitle>
            <DialogDescription>
              {selectedDisbursement?.title || 'Payment Summary'}
            </DialogDescription>
          </DialogHeader>

          {selectedDisbursement && (
            <div className="space-y-4 py-2 text-sm">
              {/* Employee Info Header */}
              <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-foreground">{session?.user?.name}</div>
                  <div className="text-muted-foreground">{session?.user?.email}</div>
                </div>
                <Badge variant="outline" className="font-mono">
                  {selectedDisbursement.date ? format(new Date(selectedDisbursement.date), 'dd MMM yyyy') : 'N/A'}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2 border rounded-lg p-3.5 bg-background">
                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">{t('store.employee.payment_type') || 'Payment Type:'}</span>
                  <span className="font-bold">{getDisbursementTypeLabel(selectedDisbursement.category).label}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-right max-w-[200px]">{selectedDisbursement.title}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b text-xs">
                  <span className="text-muted-foreground">{t('store.employee.remarks_details') || 'Description:'}</span>
                  <span className="text-right max-w-[200px]">{selectedDisbursement.description || '—'}</span>
                </div>
              </div>

              {/* Total Net Paid */}
              <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">{t('store.employee.net_paid') || 'Net Paid'}</div>
                  <div className="text-[10px] text-muted-foreground">Disbursed by Admin</div>
                </div>
                <div className="text-xl font-black text-primary">
                  {fmt(selectedDisbursement.amount)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


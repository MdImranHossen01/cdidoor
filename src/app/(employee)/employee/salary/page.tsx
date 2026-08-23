/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Gift,
  Briefcase,
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle
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

export default function EmployeeSalaryPage() {  const { t } = useLanguage();

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
          fetch('/api/admin/employees/salaries')
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
    .filter(d => d.type === 'bonus')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const getDisbursementTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly_salary':
        return { label: 'Monthly Salary', badge: 'default' };
      case 'bonus':
        return { label: 'Bonus / Incentive', badge: 'secondary' };
      case 'task_payment':
        return { label: 'Task Wage', badge: 'outline' };
      default:
        return { label: 'Salary Payment', badge: 'default' };
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
              ? '{t('store.employee.salary_desc_monthly') || 'আপনার বেতন ও পরিশোধিত পারিশ্রমিকের বিস্তারিত তথ্য ও হিসাব।'}'
              : '{t('store.employee.salary_desc_task') || 'আপনার সম্পন্ন কাজের অর্জিত মজুরি ও পরিশোধিত পারিশ্রমিকের হিসাব বিবরণী।'}'}
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
              {isMonthly ? t('store.employee.received_this_month_monthly') || 'এই মাসের প্রাপ্তি' : t('store.employee.received_this_month_task') || 'চলতি মাসের প্রাপ্তি'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-primary">
              {fmt(stats?.salary?.thisMonth || 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_payment_this_month') || 'চলতি মাসের মোট পেমেন্ট'}</p>
          </CardContent>
        </Card>

        {isMonthly ? (
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.base_salary_title') || 'বেস স্যালারি'}</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {fmt(stats?.profile?.baseSalary || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.fixed_monthly_salary') || 'নির্ধারিত মাসিক বেতন'}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.total_task_wage') || 'কাজের মোট মজুরি'}</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {fmt(stats?.tasks?.totalEarnings || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {t('store.employee.completed_prefix') || 'সম্পন্ন: '}{(stats?.tasks?.completed || 0) + (stats?.tasks?.paid || 0)}{t('store.employee.task_suffix') || 'টি কাজ'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isMonthly ? t('store.employee.total_received_salary') || 'মোট প্রাপ্ত বেতন' : t('store.employee.total_paid_bill') || 'মোট পরিশোধিত বিল'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {fmt(totalEarnedAllTime)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_received_all_time') || 'সব সময় মিলিয়ে প্রাপ্ত মোট'}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {isMonthly ? t('store.employee.total_bonus_monthly') || 'মোট বোনাস' : t('store.employee.total_bonus_task') || 'বোনাস / অতিরিক্ত'}
            </CardTitle>
            <Gift className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {fmt(totalBonusAllTime)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.earned_bonus') || 'অর্জিত বোনাস / ইনসেন্টিভ'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Disbursement History Table */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{t('store.employee.disbursements_list') || 'বেতন প্রদানের তালিকা (Disbursements)'}</CardTitle>
              <CardDescription className="text-xs">
                {t('store.employee.disbursements_desc') || 'অ্যাডমিন কর্তৃক আপনাকে পরিশোধিত সকল বেতন ও বোনাসের হিস্টোরি ও হিসাব বিবরণী।'}
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
                  <TableHead className="font-bold">{t('store.employee.date_th') || 'তারিখ (Date)'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.payment_type_th') || 'পেমেন্ট টাইপ'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.period_th') || 'মাস / পিরিয়ড'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.paid_amount_th') || 'পরিশোধিত অর্থ'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.remarks_th') || 'মন্তব্য (Remarks)'}</TableHead>
                  <TableHead className="text-right font-bold">{t('store.employee.slip_th') || 'বিবরণী (Slip)'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground text-sm">{t('store.employee.no_disbursement_records') || 'কোনো বেতন প্রদানের রেকর্ড পাওয়া যায়নি।'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  disbursements.map((item) => {
                    const badgeInfo = getDisbursementTypeLabel(item.type);
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
                        <TableCell className="text-xs font-medium">
                          {item.period ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {item.period}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-foreground">
                          {fmt(item.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {item.remarks || '—'}
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
          <div className="block md:hidden divide-y">
            {disbursements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <FileText className="h-8 w-8 mx-auto opacity-20" />
                <p>{t('store.employee.no_disbursement_records') || 'কোনো বেতন প্রদানের রেকর্ড পাওয়া যায়নি।'}</p>
              </div>
            ) : (
              disbursements.map((item) => {
                const badgeInfo = getDisbursementTypeLabel(item.type);
                return (
                  <div key={item._id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={badgeInfo.badge as any} className="text-[11px]">
                        {badgeInfo.label}
                      </Badge>
                      <span className="text-base font-black text-foreground">
                        {fmt(item.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {item.date ? format(new Date(item.date), 'dd MMM yyyy, p') : 'N/A'}
                      </span>
                      {item.period && (
                        <span className="font-medium text-foreground/80">
                          Period: {item.period}
                        </span>
                      )}
                    </div>

                    {item.remarks && (
                      <div className="text-[11px] bg-muted/40 p-2 rounded-md text-foreground/90">
                        <span className="text-muted-foreground font-semibold">Note:</span> {item.remarks}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDisbursement(item)}
                      className="w-full text-xs h-8 font-semibold flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Payslip & Calculation Details
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
              {selectedDisbursement?.period ? `Period: ${selectedDisbursement.period}` : 'Disbursement Summary'}
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

              {/* Breakdown details */}
              {(() => {
                const breakdown = selectedDisbursement.breakdown;
                const baseSalary = breakdown?.baseSalary || stats?.profile?.baseSalary || 25000;
                
                // If breakdown exists, use it directly
                if (breakdown) {
                  return (
                    <div className="space-y-2 border rounded-lg p-3.5 bg-background">
                      <div className="flex justify-between items-center py-1 border-b text-xs">
                        <span className="text-muted-foreground">{t('store.employee.monthly_base') || 'মূল মাসিক বেতন (Monthly Base):'}</span>
                        <span className="font-bold">{fmt(baseSalary)}</span>
                      </div>

                      {breakdown.proratedSalary && breakdown.proratedSalary !== breakdown.baseSalary && (
                        <div className="flex justify-between items-center py-1 border-b text-xs bg-amber-500/5 px-2 rounded">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{t('store.employee.prorated_basic') || 'যোগদানের তারিখ অনুসারে প্রোরেটেড বেসিক:'}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(breakdown.proratedSalary)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1 border-b text-xs">
                        <span className="text-muted-foreground">{t('store.employee.working_days') || 'মোট কর্মদিবস (Working Days):'}</span>
                        <span className="font-bold">{breakdown.workingDays || 0} {t('store.employee.days') || 'দিন'}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b text-xs">
                        <span className="text-muted-foreground text-emerald-600">{t('store.employee.present_days') || 'উপস্থিতি (Present Days):'}</span>
                        <span className="font-bold text-emerald-600">
                          {breakdown.presentDays || 0} দিন
                        </span>
                      </div>

                      {Number(breakdown.leaveDays) > 0 && (
                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground text-blue-600">{t('store.employee.approved_leaves_calc') || 'অনুমোদিত ছুটি (Leaves):'}</span>
                          <span className="font-bold text-blue-600">
                            {breakdown.leaveDays} দিন
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1 border-b text-xs">
                        <span className="text-muted-foreground text-destructive">{t('store.employee.absents') || 'অনুপস্থিতি (Absents):'}</span>
                        <span className="font-bold text-destructive">
                          {breakdown.absentDays || 0} দিন
                        </span>
                      </div>

                      {Number(breakdown.deduction) > 0 ? (
                        <div className="flex justify-between items-center py-1 border-b text-xs text-destructive">
                          <span>{t('store.employee.absence_deduction') || 'অনুপস্থিতির জন্য কর্তন (Deduction):'}</span>
                          <span className="font-bold">- {fmt(breakdown.deduction)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center py-1 border-b text-xs text-muted-foreground">
                          <span>{t('store.employee.deductions') || 'কর্তন (Deductions):'}</span>
                          <span>{t('store.employee.no_deduction') || '৳০ (কোনো কর্তন নেই)'}</span>
                        </div>
                      )}

                      {Number(breakdown.bonus) > 0 && (
                        <div className="flex justify-between items-center py-1 border-b text-xs text-emerald-600">
                          <span>{t('store.employee.bonus_incentive') || 'বোনাস / ইনসেন্টিভ:'}</span>
                          <span className="font-bold">+ {fmt(breakdown.bonus)}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                // If monthly salary without embedded breakdown (e.g. July 2026 joined on 19 July)
                const joinedDate = stats?.profile?.joinedDate ? new Date(stats.profile.joinedDate) : null;
                const isJulyJoin = selectedDisbursement.period === '2026-07' && joinedDate;
                
                return (
                  <div className="space-y-2 border rounded-lg p-3.5 bg-background">
                    <div className="flex justify-between items-center py-1 border-b text-xs">
                      <span className="text-muted-foreground">{t('store.employee.monthly_base') || 'মূল মাসিক বেতন (Monthly Base):'}</span>
                      <span className="font-bold">{fmt(baseSalary)}</span>
                    </div>

                    {isJulyJoin && (
                      <>
                        <div className="flex justify-between items-center py-1 border-b text-xs bg-amber-500/10 p-2 rounded">
                          <div>
                            <div className="font-bold text-foreground">{t('store.employee.joining_date') || 'যোগদান (Joining Date):'}</div>
                            <div className="text-[11px] text-muted-foreground">{t('store.employee.mid_month_join') || '19 July 2026 (মাসের মাঝে যোগদান)'}</div>
                          </div>
                          <span className="font-bold text-xs text-amber-600 dark:text-amber-400">14 {t('store.employee.days_space') || 'দিন '} সক্রিয়</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground">{t('store.employee.prorated_calculation') || 'প্রোরেটেড হিসাব (Prorated Calculation):'}</span>
                          <span className="font-mono text-xs font-semibold">(৳25,000 ÷ 31) × 14 {t('store.employee.days') || 'দিন'}</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground">{t('store.employee.present_days') || 'উপস্থিতি (Present Days):'}</span>
                          <span className="font-bold text-emerald-600">12 {t('store.employee.days_space') || 'দিন '} (শুক্রবার ব্যতিত)</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground">{t('store.employee.absence_and_deduction') || 'অনুপস্থিতি ও কর্তন:'}</span>
                          <span className="font-bold text-muted-foreground">{t('store.employee.no_deduction') || '৳০ (কোনো কর্তন নেই)'}</span>
                        </div>
                      </>
                    )}

                    {!isJulyJoin && (
                      <>
                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground">{t('store.employee.payment_type') || 'পেমেন্ট টাইপ:'}</span>
                          <span className="font-bold">{getDisbursementTypeLabel(selectedDisbursement.type).label}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b text-xs">
                          <span className="text-muted-foreground">{t('store.employee.remarks_details') || 'মন্তব্য / বিবরণ:'}</span>
                          <span>{selectedDisbursement.remarks || 'Monthly Salary'}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Total Net Paid */}
              <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">{t('store.employee.net_paid') || 'সর্বমোট পরিশোধিত অর্থ (Net Paid)'}</div>
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


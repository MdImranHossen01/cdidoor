'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import {
  DollarSign, CalendarOff, CheckSquare, Clock,
  Loader2, AlertTriangle, ArrowRight, Briefcase, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

function StatCard({ title, value, sub, icon: Icon, href }: {
  title: string; value: string | number; sub?: string; icon: any; href?: string;
}) {
  const content = (
    <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary relative overflow-hidden group h-full min-h-[85px] sm:min-h-0 shadow-sm hover:shadow transition-shadow">
      {/* Mobile Layout */}
      <div className="flex flex-col p-2.5 sm:hidden justify-between h-full gap-2 items-center text-center">
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm font-black text-primary leading-none">
            {value}
          </span>
        </div>
        <span className="text-[10px] font-bold text-zinc-600 leading-tight mt-auto">
          {title}
        </span>
      </div>
      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-semibold leading-tight text-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-primary shrink-0" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-lg md:text-2xl font-extrabold text-primary">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
        </CardContent>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:scale-[1.02] active:scale-95">
        {content}
      </Link>
    );
  }

  return content;
}

export default function EmployeeDashboard() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/employee/dashboard/stats')
      .then(res => res.ok ? res.json() : res.json().then(e => Promise.reject(e.message)))
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(typeof err === 'string' ? err : 'Failed to load dashboard'); setLoading(false); });
  }, []);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const fmt = (n: number) => `৳${n.toLocaleString('en-BD')}`;
  const isMonthly = data?.profile?.employeeType === 'monthly';

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">{t('store.employee.welcome') || 'à¦¸à§à¦¬à¦¾à¦—à¦¤à¦®,'} {session?.user?.name}!</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t('store.employee.dashboard_desc') || 'আপনার কর্মক্ষেত্রের সামগ্রিক তথ্য এখানে দেখুন।'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {isMonthly ? (t('store.employee.monthly_staff') || 'মাসিক কর্মী') : (t('store.employee.contractual_staff') || 'চুক্তিভিত্তিক কর্মী')}
          </Badge>
          {data?.profile?.joinedDate && (
            <Badge variant="secondary" className="text-xs">
              {t('store.employee.joined') || 'যোগদান: '} {format(new Date(data.profile.joinedDate), 'dd MMM yyyy')}
            </Badge>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {isMonthly ? (
        <div className="grid gap-2 sm:gap-4 grid-cols-3">
          <StatCard
            title={t('store.employee.this_month_salary') || 'à¦à¦‡ à¦®à¦¾à¦¸à§‡à¦° à¦¬à§‡à¦¤à¦¨'}
            value={fmt(data?.salary?.thisMonth || 0)}
            sub={`{t('store.employee.base_salary') || 'à¦¬à§‡à¦¸ à¦¸à§à¦¯à¦¾à¦²à¦¾à¦°à¦¿: '} ${fmt(data?.profile?.baseSalary || 0)}`}
            icon={DollarSign}
            href="/employee/salary"
          />
          <StatCard
            title={t('store.employee.this_month_attendance') || 'à¦à¦‡ à¦®à¦¾à¦¸à§‡à¦° à¦‰à¦ªà¦¸à§à¦¥à¦¿à¦¤à¦¿'}
            value={`${data?.attendance?.presentThisMonth || 0} à¦¦à¦¿à¦¨`}
            sub={t('store.employee.total_attendance_this_month') || 'à¦šà¦²à¦¤à¦¿ à¦®à¦¾à¦¸à§‡ à¦®à§‹à¦Ÿ à¦‰à¦ªà¦¸à§à¦¥à¦¿à¦¤à¦¿'}
            icon={CheckCircle2}
          />
          <StatCard
            title={t('store.employee.leave_status') || 'à¦²à¦¿à¦­ à¦¸à§à¦Ÿà§à¦¯à¦¾à¦Ÿà¦¾à¦¸'}
            value={`${data?.leaves?.approved || 0}à¦Ÿà¦¿`}
            sub={`{t('store.employee.pending') || 'à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚: '} ${data?.leaves?.pending || 0}à¦Ÿà¦¿`}
            icon={CalendarOff}
            href="/employee/leaves"
          />
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title={t('store.employee.total_earned_wages') || 'à¦®à§‹à¦Ÿ à¦…à¦°à§à¦œà¦¿à¦¤ à¦®à¦œà§à¦°à¦¿'}
            value={fmt(data?.tasks?.totalEarnings || 0)}
            sub={t('store.employee.total_completed_wages') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦¾à¦œà§‡à¦° à¦®à§‹à¦Ÿ à¦®à¦œà§à¦°à¦¿'}
            icon={DollarSign}
            href="/employee/tasks"
          />
          <StatCard
            title={t('store.employee.paid_amount') || 'à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤ à¦…à¦°à§à¦¥'}
            value={fmt(data?.salary?.thisMonth || 0)}
            sub={t('store.employee.received_this_month') || 'à¦šà¦²à¦¤à¦¿ à¦®à¦¾à¦¸à§‡ à¦ªà§à¦°à¦¾à¦ªà§à¦¤'}
            icon={CheckCircle2}
            href="/employee/salary"
          />
          <StatCard
            title={t('store.employee.pending_tasks') || 'à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚ à¦Ÿà¦¾à¦¸à§à¦•'}
            value={`${data?.tasks?.pending || 0}`}
            sub={t('store.employee.ongoing_work') || 'à¦šà¦²à¦®à¦¾à¦¨ à¦•à¦¾à¦œ'}
            icon={Clock}
            href="/employee/tasks"
          />
          <StatCard
            title={t('store.employee.completed_work') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦¾à¦œ'}
            value={fmt(data?.tasks?.pendingPayout || 0)}
            sub={t('store.employee.payment_processing') || 'à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦ªà§à¦°à¦•à§à¦°à¦¿à§Ÿà¦¾à¦§à§€à¦¨'}
            icon={CheckSquare}
            href="/employee/tasks"
          />
        </div>
      )}

      {/* Detail Sections */}
      <div className={`grid grid-cols-1 ${isMonthly ? 'md:grid-cols-2' : ''} gap-6`}>
        {/* Recent Tasks (Only for Contractual / Task-based) */}
        {!isMonthly && (
          <Card className="shadow-sm border">
            <CardHeader className="p-4 sm:p-6 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{t('store.employee.recent_tasks_progress') || 'à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦Ÿà¦¾à¦¸à§à¦• à¦“ à¦•à¦¾à¦œà§‡à¦° à¦…à¦—à§à¦°à¦—à¦¤à¦¿'}</CardTitle>
                <CardDescription className="text-xs">{t('store.employee.assigned_contractual_tasks') || 'à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦…à§à¦¯à¦¾à¦¸à¦¾à¦‡à¦¨ à¦•à¦°à¦¾ à¦šà§à¦•à§à¦¤à¦¿à¦­à¦¿à¦¤à§à¦¤à¦¿à¦• à¦•à¦¾à¦œà§‡à¦° à¦¤à¦¾à¦²à¦¿à¦•à¦¾'}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold">
                <Link href="/employee/tasks">{t('store.employee.see_all') || 'à¦¸à¦¬ à¦¦à§‡à¦–à§à¦¨'} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {data?.tasks?.recent?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">{t('store.employee.no_tasks_assigned') || 'à¦•à§‹à¦¨à§‹ à¦Ÿà¦¾à¦¸à§à¦• à¦…à§à¦¯à¦¾à¦¸à¦¾à¦‡à¦¨ à¦•à¦°à¦¾ à¦¨à§‡à¦‡'}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.tasks?.recent?.map((task: any) => (
                    <div key={task._id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {task.status === 'Paid' ? (
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        ) : task.status === 'Completed' ? (
                          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                            <CheckSquare className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                            <Clock className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground line-clamp-1">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="font-bold text-primary">{fmt(task.payout || 0)}</span>
                            {task.dueDate && <span>â€¢ Due: {format(new Date(task.dueDate), 'dd MMM yyyy')}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={task.status === 'Paid' ? 'default' : task.status === 'Completed' ? 'secondary' : 'outline'}
                        className="text-xs font-semibold"
                      >
                        {task.status === 'Paid' ? t('store.employee.paid') || 'à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤' : task.status === 'Completed' ? t('store.employee.completed') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨' : t('store.employee.ongoing') || 'à¦šà¦²à¦®à¦¾à¦¨'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Leaves (Shown ONLY for Monthly staff) */}
        {isMonthly && (
          <Card className="shadow-sm border">
            <CardHeader className="p-4 sm:p-6 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{t('store.employee.leave_request') || 'à¦²à¦¿à¦­ à¦°à¦¿à¦•à§‹à¦¯à¦¼à§‡à¦¸à§à¦Ÿ'}</CardTitle>
                <CardDescription className="text-xs">{t('store.employee.recent_leave_applications') || 'à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦›à§à¦Ÿà¦¿à¦° à¦†à¦¬à§‡à¦¦à¦¨à¦¸à¦®à§‚à¦¹'}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold">
                <Link href="/employee/leaves">{t('store.employee.see_all') || 'à¦¸à¦¬ à¦¦à§‡à¦–à§à¦¨'} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {data?.leaves?.recent?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CalendarOff className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">à¦•à§‹à¦¨à§‹ {t('store.employee.leave_request') || 'à¦²à¦¿à¦­ à¦°à¦¿à¦•à§‹à¦¯à¦¼à§‡à¦¸à§à¦Ÿ'} à¦¨à§‡à¦‡</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.leaves?.recent?.map((leave: any) => (
                    <div key={leave._id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-foreground line-clamp-1">{leave.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(leave.startDate), 'dd MMM')} â€“ {format(new Date(leave.endDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <Badge
                        variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                        className="text-xs font-semibold"
                      >
                        {leave.status === 'Approved' ? t('store.employee.approved') || 'à¦…à¦¨à§à¦®à§‹à¦¦à¦¿à¦¤' : leave.status === 'Rejected' ? t('store.employee.rejected') || 'à¦ªà§à¦°à¦¤à§à¦¯à¦¾à¦–à§à¦¯à¦¾à¦¤' : t('store.employee.pending') || 'à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

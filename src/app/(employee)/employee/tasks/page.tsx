/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function EmployeeTasksPage() {  const { t } = useLanguage();

  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/admin/employees/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load assigned tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchTasks();
    }
  }, [session]);

  const handleMarkCompleted = async (taskId: string) => {
    setCompletingId(taskId);
    try {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Task marked as Completed!');
        fetchTasks();
      } else {
        toast.error(data.message || 'Failed to update task status');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setCompletingId(null);
    }
  };

  const fmt = (n: number) => `৳${Math.round(n || 0).toLocaleString('en-BD')}`;

  if (loading) {
    return <AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-48" showStats={true} />;
  }

  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const totalEarnedFromTasks = completedTasks.reduce((acc, curr) => acc + (curr.payout || 0), 0);

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Assigned Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('store.employee.task_list_desc') || 'à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦…à§à¦¯à¦¾à¦¸à¦¾à¦‡à¦¨ à¦•à¦°à¦¾ à¦šà§à¦•à§à¦¤à¦¿à¦­à¦¿à¦¤à§à¦¤à¦¿à¦• à¦•à¦¾à¦œà§‡à¦° à¦¤à¦¾à¦²à¦¿à¦•à¦¾ à¦à¦¬à¦‚ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦°à¦¾à¦° à¦¬à¦¿à¦¬à¦°à¦£à¥¤'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.pending_task_title') || 'à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚ à¦Ÿà¦¾à¦¸à§à¦•'}</CardTitle>
            <Clock className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-primary">
              {pendingTasks.length} {t('store.employee.pcs') || 'à¦Ÿà¦¿'}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.ongoing_task_subtitle') || 'à¦šà¦²à¦®à¦¾à¦¨ à¦•à¦¾à¦œ'}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.completed_task_title') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦Ÿà¦¾à¦¸à§à¦•'}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {completedTasks.length} {t('store.employee.pcs') || 'à¦Ÿà¦¿'}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_completed_task') || 'à¦®à§‹à¦Ÿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦¾à¦œ'}</p>
          </CardContent>
        </Card>

        <div className="col-span-2 md:col-span-1">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-amber-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.total_earned_task_wage') || 'à¦•à¦¾à¦œà§‡à¦° à¦®à§‹à¦Ÿ à¦…à¦°à§à¦œà¦¿à¦¤ à¦®à¦œà§à¦°à¦¿'}</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {fmt(totalEarnedFromTasks)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.due_on_completed_task') || 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦¾à¦œà§‡à¦° à¦­à¦¿à¦¤à§à¦¤à¦¿à¦¤à§‡ à¦ªà§à¦°à¦¾à¦ªà§à¦¯'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task List Table */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
          <CardTitle className="text-base font-bold">{t('store.employee.task_list_heading') || 'à¦•à¦¾à¦œà§‡à¦° à¦¤à¦¾à¦²à¦¿à¦•à¦¾ (Task List)'}</CardTitle>
          <CardDescription className="text-xs">
            {t('store.employee.task_list_instruction') || 'à¦•à¦¾à¦œ à¦¶à§‡à¦· à¦¹à¦²à§‡ \'Mark Completed\' à¦¬à¦¾à¦Ÿà¦¨à§‡ à¦•à§à¦²à¦¿à¦• à¦•à¦°à§‡ à¦•à¦¾à¦œ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦°à§à¦¨à¥¤'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold">{t('store.employee.task_desc_th') || 'à¦Ÿà¦¾à¦¸à§à¦• à¦¬à¦¿à¦¬à¦°à¦£'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.payout_th') || 'à¦®à¦œà§à¦°à¦¿ (Payout)'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.due_date_th') || 'à¦¡à§‡à¦¡à¦²à¦¾à¦‡à¦¨ (Due Date)'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.status_th') || 'à¦¸à§à¦Ÿà§à¦¯à¦¾à¦Ÿà¦¾à¦¸'}</TableHead>
                  <TableHead className="text-right font-bold">{t('store.employee.action_th') || 'à¦…à§à¦¯à¦¾à¦•à¦¶à¦¨'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <CheckSquare className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground text-sm">{t('store.employee.no_assigned_task') || 'à¦•à§‹à¦¨à§‹ à¦•à¦¾à¦œ à¦…à§à¦¯à¦¾à¦¸à¦¾à¦‡à¦¨ à¦•à¦°à¦¾ à¦¨à§‡à¦‡à¥¤'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-md">
                        <div className="font-bold text-foreground text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Assigned: {task.assignedDate ? format(new Date(task.assignedDate), 'dd MMM yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-sm text-foreground">
                        {fmt(task.payout)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {task.dueDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(task.dueDate), 'dd MMM yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">â€”</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={task.status === 'Completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {task.status === 'Completed' ? t('store.employee.completed_badge') || 'সম্পন্ন' : t('store.employee.pending_badge') || 'চলমান (Pending)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {task.status === 'Pending' ? (
                          <Button
                            size="sm"
                            disabled={completingId === task._id}
                            onClick={() => handleMarkCompleted(task._id)}
                            className="text-white text-xs h-8"
                          >
                            {completingId === task._id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Mark Completed
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Finished
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden space-y-3 p-2 bg-muted/10">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm space-y-2">
                <CheckSquare className="h-8 w-8 mx-auto opacity-20" />
                <p>{t('store.employee.no_assigned_task') || 'কোনো কাজ অ্যাসাইন করা নেই।'}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task._id} className="p-4 bg-background border rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base sm:text-lg font-black text-primary">
                      {fmt(task.payout)}
                    </span>
                    <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                      {task.status === 'Completed' ? t('store.employee.completed_badge') || 'সম্পন্ন' : t('store.employee.ongoing_badge') || 'চলমান'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-foreground">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 bg-muted/30 p-2.5 rounded-lg border">{task.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground pt-1.5 border-t">
                    <span>Assigned: {task.assignedDate ? format(new Date(task.assignedDate), 'dd MMM yyyy') : 'N/A'}</span>
                    {task.dueDate && <span className="font-semibold text-foreground">Due: {format(new Date(task.dueDate), 'dd MMM yyyy')}</span>}
                  </div>

                  {task.status === 'Pending' && (
                    <Button
                      size="sm"
                      disabled={completingId === task._id}
                      onClick={() => handleMarkCompleted(task._id)}
                      className="w-full text-white text-xs h-9 mt-2"
                    >
                      {completingId === task._id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Mark Completed
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

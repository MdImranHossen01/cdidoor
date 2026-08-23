/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import {
  CalendarOff,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function EmployeeLeavesPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employeeType, setEmployeeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRes, statsRes] = await Promise.all([
        fetch('/api/admin/employees/leaves'),
        fetch('/api/employee/dashboard/stats')
      ]);

      if (!statsRes.ok) {
        throw new Error('Failed to load employee classification');
      }

      const statsData = await statsRes.json();
      const type = statsData.profile?.employeeType;
      if (!type) {
        throw new Error('Invalid employee classification received');
      }
      setEmployeeType(type);

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data.leaves || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch leaves:', err);
      const errMsg = err?.message || 'Failed to load leave records';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const [leavesRes, statsRes] = await Promise.all([
          fetch('/api/admin/employees/leaves'),
          fetch('/api/employee/dashboard/stats')
        ]);

        if (!statsRes.ok) {
          throw new Error('Failed to load employee classification');
        }

        const statsData = await statsRes.json();
        const type = statsData.profile?.employeeType;
        if (!type) {
          throw new Error('Invalid employee classification received');
        }

        if (isMounted) {
          setEmployeeType(type);
        }

        if (leavesRes.ok) {
          const data = await leavesRes.json();
          if (isMounted) {
            setLeaves(data.leaves || []);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch leaves:', err);
        const errMsg = err?.message || 'Failed to load leave records';
        if (isMounted) {
          setError(errMsg);
          toast.error(errMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeType !== 'monthly') {
      toast.error('Only monthly employees are eligible for leave requests');
      return;
    }

    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/employees/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Leave request submitted successfully!');
        setIsDialogOpen(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        toast.error(data.message || 'Failed to submit leave request');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center space-y-4 text-center px-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={fetchLeaves} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (employeeType !== 'monthly') {
    return (
      <div className="flex-1 space-y-6 py-6 md:p-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t('store.employee.leave_management') || 'Leave Management'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('store.employee.leave_info') || 'ছুটি সংক্রান্ত তথ্যাবলী।'}
          </p>
        </div>

        <Card className="border border-amber-200 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <CalendarOff className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-foreground">{t('store.employee.leave_not_applicable') || 'ছুটির আবেদন প্রযোজ্য নয়'}</h3>
              <p className="text-sm text-muted-foreground">
                {t('store.employee.leave_only_monthly') || 'ছুটির আবেদন সুবিধাটি শুধুমাত্র নিয়মিত মাসিক (Monthly) কর্মীদের জন্য প্রযোজ্য। আপনার বর্তমান কর্মী শ্রেণিবিভাগে কোনো ছুটির আবেদন অনুমোদিত নয়।'}
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="text-white">
                <Link href="/employee/tasks">{t('store.employee.see_task_list') || 'আমার কাজের তালিকা দেখুন'}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;

  return (
    <div className="flex-1 space-y-6 py-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t('store.employee.leave_management') || 'Leave Management'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('store.employee.leave_desc') || 'ছুটির আবেদন করুন এবং পূর্ববর্তী ছুটির হিস্টোরি ও স্ট্যাটাস ট্র্যাক করুন।'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="font-bold flex items-center gap-2 self-start md:self-auto text-white" />}>
            <Plus className="h-4 w-4" /> {t('store.employee.apply_for_leave') || 'Apply for Leave'}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleSubmitLeave}>
              <DialogHeader>
                <DialogTitle>{t('store.employee.apply_for_leave') || 'Apply for Leave'}</DialogTitle>
                <DialogDescription>
                  {t('store.employee.leave_apply_desc') || 'আপনার ছুটির শুরুর তারিখ, শেষের তারিখ ও ছুটির কারণ উল্লেখ করে আবেদন জমা দিন।'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">{t('store.employee.start_date') || 'Start Date *'}</Label>
                    <Input
                      id="start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">{t('store.employee.end_date') || 'End Date *'}</Label>
                    <Input
                      id="end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reason">{t('store.employee.reason_for_leave') || 'Reason for Leave *'}</Label>
                  <Textarea
                    id="reason"
                    placeholder="{t('store.employee.reason_placeholder') || 'ছুটির কারণ বিস্তারিত লিখুন...'}"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="text-white">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('store.employee.submit_application') || 'Submit Application'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.total_applications') || 'মোট আবেদন'}</CardTitle>
            <CalendarOff className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-primary">
              {leaves.length} {t('store.employee.pcs') || 'টি'}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.total_leave_requests') || 'সর্বমোট ছুটির রিকোয়েস্ট'}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.pending_applications') || 'পেন্ডিং আবেদন'}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-lg sm:text-2xl font-black text-foreground">
              {pendingCount} {t('store.employee.pcs') || 'টি'}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.awaiting_approval') || 'অনুমোদনের অপেক্ষায়'}</p>
          </CardContent>
        </Card>

        <div className="col-span-2 md:col-span-1">
          <Card className="bg-primary/5 border-primary/10 border-l-2 border-l-emerald-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t('store.employee.approved_leaves') || 'অনুমোদিত ছুটি'}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {approvedCount} {t('store.employee.pcs') || 'টি'}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('store.employee.approved_by_admin') || 'অ্যাডমিন কর্তৃক অনুমোদিত'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave List Table */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
          <CardTitle className="text-base font-bold">{t('store.employee.leave_history') || 'ছুটির আবেদন হিস্টোরি (Leave Requests)'}</CardTitle>
          <CardDescription className="text-xs">
            {t('store.employee.leave_history_desc') || 'আপনার করা সকল ছুটির আবেদনের বর্তমান স্ট্যাটাস ও বিবরণ।'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold">{t('store.employee.application_date') || 'আবেদনের তারিখ'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.leave_duration') || 'ছুটির সময়সীমা'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.leave_reason') || 'ছুটির কারণ (Reason)'}</TableHead>
                  <TableHead className="font-bold">{t('store.employee.status') || 'স্ট্যাটাস'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarOff className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground text-sm">{t('store.employee.no_leave_applications') || 'কোনো ছুটির আবেদন পাওয়া যায়নি।'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs">
                        {leave.createdAt ? format(new Date(leave.createdAt), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex items-center gap-1 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(leave.startDate), 'dd MMM yyyy')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-sm">
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(leave.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden divide-y">
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <CalendarOff className="h-8 w-8 mx-auto opacity-20" />
                <p>{t('store.employee.no_leave_applications') || 'কোনো ছুটির আবেদন পাওয়া যায়নি।'}</p>
              </div>
            ) : (
              leaves.map((leave) => (
                <div key={leave._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {t('store.employee.applied') || 'Applied: '} {leave.createdAt ? format(new Date(leave.createdAt), 'dd MMM yyyy') : 'N/A'}
                    </span>
                    {getStatusBadge(leave.status)}
                  </div>

                  <div className="text-xs font-bold text-foreground">
                    {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md">
                    {leave.reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, Plus, Loader2, Clock, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export default function EmployeeLeavesPage() {
  const { data: session } = useSession();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchLeaves();
    }
  }, [session]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/employees/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Submitted',
          text: 'Leave request submitted successfully',
          confirmButtonColor: '#eab308'
        });
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Leave Applications</h1>
        <p className="text-sm text-muted-foreground mt-1">Apply for time off and track your approval status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Form */}
        <Card className="lg:col-span-1 border border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Apply for Leave</CardTitle>
            <CardDescription>Submit your leave period and reason for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start Date</Label>
                <Input 
                  id="start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End Date</Label>
                <Input 
                  id="end"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for Leave</Label>
                <Textarea 
                  id="reason"
                  required
                  placeholder="Describe your reason here..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="lg:col-span-2 border border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-lg font-bold">Leave Requests History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No leave applications logged yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {leaves.map((leave) => (
                  <div key={leave._id} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-zinc-800 text-sm">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium">
                        Duration: {Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                      </div>
                      <p className="text-sm text-zinc-600 mt-1.5">{leave.reason}</p>
                    </div>
                    <Badge 
                      className="font-bold shrink-0" 
                      variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                    >
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DollarSign, Loader2, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function EmployeePaymentsPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/employees/salaries');
        if (res.ok) {
          const data = await res.json();
          setPayments(data.disbursements || []);
        }
      } catch (err) {
        toast.error('Failed to load salary disbursements');
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      fetchPayments();
    }
  }, [session]);

  const totalEarned = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Salary & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your earnings and payment logs.</p>
        </div>
        <Card className="bg-green-500/5 border-none shadow-none px-6 py-3 shrink-0 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Earnings Received</div>
            <div className="text-2xl font-black text-green-600">৳{totalEarned.toLocaleString()}</div>
          </div>
        </Card>
      </div>

      <Card className="border border-zinc-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
          <CardTitle className="text-lg font-bold">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No payment records found.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {payments.map((pay) => (
                <div key={pay._id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold">
                        {pay.type === 'monthly_salary' ? 'Monthly Salary' : 'Task Compensation'}
                      </Badge>
                      {pay.remarks && (
                        <span className="text-xs text-zinc-500 italic">({pay.remarks})</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Paid on: {new Date(pay.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg text-green-600">৳{pay.amount?.toLocaleString()}</span>
                    <ArrowUpRight className="h-4 w-4 text-green-500 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

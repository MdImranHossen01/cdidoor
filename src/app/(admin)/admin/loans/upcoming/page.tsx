'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Calendar, CalendarClock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UpcomingPayablePage() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/loans/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcoming(data);
      }
    } catch (error) {
      toast.error('Failed to load upcoming payables');
    } finally {
      setLoading(false);
    }
  };

  const totalUpcomingAmount = upcoming.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Upcoming Payables</h1>
        <p className="text-muted-foreground mt-1">Repayments and installments scheduled within the next 30 days</p>
      </div>

      <div className="grid gap-2 grid-cols-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3 px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border-l-4 border-l-rose-500 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Total Upcoming Due (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">৳{totalUpcomingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {upcoming.length} scheduled payments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Pending Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Payments requiring cash flow prep</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="hidden md:flex text-lg font-semibold text-primary items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              30-Day Repayment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
                ) : upcoming.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <span>No upcoming payments due in the next 30 days.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  upcoming.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold">{item.loanId}</TableCell>
                      <TableCell className="font-medium">{item.lenderName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          item.type === 'Installment' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-amber-600">
                        {format(new Date(item.dueDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-bold">
                        ৳{item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-3 p-4 bg-muted/10">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs">No upcoming payments due in the next 30 days.</span>
                </div>
              </div>
            ) : (
              upcoming.map((item, idx) => (
                <div key={idx} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                  {/* Top Row: Loan ID & Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-primary">{item.loanId}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      item.type === 'Installment' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.type}
                    </span>
                  </div>

                  {/* Lender & Date Details */}
                  <div className="space-y-2 text-sm md:text-xs border-t pt-2">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground">Lender:</span>
                      <span className="font-semibold text-foreground">{item.lenderName}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                      <span className="text-muted-foreground">Scheduled Date:</span>
                      <span className="text-amber-600 font-bold">{format(new Date(item.dueDate), 'dd MMM yyyy')}</span>
                    </div>
                  </div>

                  {/* Bottom Row: Amount Due */}
                  <div className="flex items-center justify-between border-t pt-2 mt-1">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Amount Due</span>
                    <span className="font-extrabold text-base text-rose-600">৳{item.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

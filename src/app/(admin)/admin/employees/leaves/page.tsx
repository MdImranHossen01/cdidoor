/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EmployeeTabs } from '@/components/admin/EmployeeTabs';

function calculateLeaveDays(startDateStr: string | Date, endDateStr: string | Date): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Normalize to calendar dates (UTC midnight) to avoid daylight-saving issues:
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endUtc - startUtc) / millisecondsPerDay) + 1;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/admin/employees/leaves');
      if (!response.ok) {
        throw new Error('Failed to load leave requests');
      }
      const data = await response.json();
      setLeaves(data.leaves || []);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching leaves:', error);
      setError(error.message || 'Failed to load leave requests');
      toast.error(error.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchData(false);
    };
    load();
  }, [fetchData]);

  const handleUpdateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    const result = await Swal.fire({
      title: `Are you sure to mark this leave as ${status.toLowerCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/employees/leaves/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          toast.success(`Leave request ${status.toLowerCase()}!`);
          fetchData();
        } else {
          toast.error('Failed to update leave request');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  return (
    <div className="space-y-6 px-0 py-4 md:p-6">
      <div className="px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black text-zinc-950">Leave Applications</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">Review, approve, or reject employee leave requests.</p>
      </div>

      <EmployeeTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card className="border border-zinc-200 shadow-sm">
          <CardContent className="p-0">
            {error ? (
              <div className="text-center py-16 text-red-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-60 text-red-400" />
                <p className="font-medium">{error}</p>
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-60" />
                <p className="font-medium">No leave applications found.</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">Employee</th>
                        <th className="p-4">Leave Duration</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((leave) => (
                        <tr key={leave._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 font-bold text-zinc-900">
                            {leave.employee?.name || 'Unknown User'}
                            <div className="text-xs text-zinc-400 font-normal">{leave.employee?.email}</div>
                          </td>
                          <td className="p-4 text-zinc-700">
                            <div>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</div>
                            <div className="text-xs text-zinc-400 font-bold mt-0.5">
                              {calculateLeaveDays(leave.startDate, leave.endDate)} Days
                            </div>
                          </td>
                          <td className="p-4 text-zinc-600 max-w-[200px] truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="p-4">
                            <Badge 
                              className="font-bold" 
                              variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                            >
                              {leave.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            {leave.status === 'Pending' && (
                              <div className="flex justify-end gap-1.5">
                                <Button 
                                  onClick={() => handleUpdateLeaveStatus(leave._id, 'Approved')}
                                  size="sm"
                                  className="bg-green-600 text-white hover:bg-green-700 h-8"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button 
                                  onClick={() => handleUpdateLeaveStatus(leave._id, 'Rejected')}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3 p-3">
                  {leaves.map((leave) => (
                    <div key={leave._id} className="p-3.5 border border-zinc-150 rounded-xl bg-background shadow-sm space-y-3">
                      {/* Header info */}
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-zinc-900 truncate">{leave.employee?.name || 'Unknown User'}</h4>
                        <p className="text-xs text-zinc-500 truncate">{leave.employee?.email}</p>
                      </div>

                      {/* Detail Rows */}
                      <div className="space-y-1.5 text-xs pt-1 border-t border-zinc-100">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Duration:</span>
                          <span className="text-zinc-700 font-medium">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Total Days:</span>
                          <Badge variant="secondary" className="font-bold text-[10px] px-2 py-0">
                            {calculateLeaveDays(leave.startDate, leave.endDate)} Days
                          </Badge>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-zinc-500">Reason:</span>
                          <span className="text-zinc-650 font-medium text-right max-w-[180px] break-words">{leave.reason}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Status:</span>
                          <Badge 
                            className="font-bold text-[10px] px-2 py-0" 
                            variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                          >
                            {leave.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Action Bar */}
                      {leave.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-100">
                          <Button 
                            onClick={() => handleUpdateLeaveStatus(leave._id, 'Approved')}
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 h-8 text-xs flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button 
                            onClick={() => handleUpdateLeaveStatus(leave._id, 'Rejected')}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

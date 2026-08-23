/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,

  Trash2,
  Edit2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { EmployeeTabs } from '@/components/admin/EmployeeTabs';

export default function SalariesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Disbursement inputs state
  const [disbursingAmounts, setDisbursingAmounts] = useState<Record<string, string>>({});
  const [disbursingRemarks, setDisbursingRemarks] = useState<Record<string, string>>({});
  const [disbursingTypes, setDisbursingTypes] = useState<Record<string, 'monthly_salary' | 'bonus' | 'task_payment'>>({});

  // Attendance Ledger states
  const [selectedLedgerEmp, setSelectedLedgerEmp] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toLocaleDateString('sv').split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('sv').split('T')[0];
  });

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const ts = Date.now();
      const [empRes, salRes, attRes] = await Promise.all([
        fetch(`/api/admin/employees?_t=${ts}`),
        fetch(`/api/admin/employees/salaries?_t=${ts}`),
        fetch(`/api/admin/employees/attendance?_t=${ts}`)
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
        if (empData.employees?.length > 0) {
          const firstMonthly = empData.employees.find((e: any) => e.employeeType === 'monthly');
          if (firstMonthly) {
            setSelectedLedgerEmp(String(firstMonthly._id));
          }
        }
      }
      if (salRes.ok) {
        const salData = await salRes.json();
        setDisbursements(salData.disbursements || []);
      }
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payroll details');
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

  const handleIndividualDisburse = async (emp: any, amount: string, remarks: string, type: string, breakdown?: any) => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Disbursement',
      text: `Are you sure you want to disburse ${Number(amount).toLocaleString()} Tk as ${type === 'bonus' ? 'Bonus' : 'Salary/Commission'} to ${emp.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Disburse',
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const today = new Date();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const response = await fetch('/api/admin/employees/salaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: emp._id,
            amount: Number(amount),
            type: type,
            remarks: remarks,
            period: type === 'monthly_salary' ? prevMonthPeriod : undefined,
            breakdown: breakdown || undefined
          })
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Paid!',
            text: `Successfully disbursed payment to ${emp.name}`,
            confirmButtonColor: '#eab308'
          });
          setDisbursingRemarks(prev => ({ ...prev, [emp._id]: '' }));
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to process payment');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleDeleteDisbursement = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete History',
      text: 'Are you sure you want to delete this disbursement record? This will affect the employee\'s remaining payable balance.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#71717a'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/employees/salaries/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Disbursement history deleted');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to delete');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleEditAttendance = async (log: any) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Attendance Status',
      input: 'select',
      inputOptions: {
        'Present': 'Present',
        'Late': 'Late',
        'Leave': 'Leave',
        'Absent': 'Absent'
      },
      inputValue: log.status,
      showCancelButton: true,
      confirmButtonText: 'Update',
      confirmButtonColor: '#eab308'
    });

    if (newStatus && newStatus !== log.status) {
      try {
        const response = await fetch(`/api/admin/employees/attendance/${log._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          toast.success('Attendance updated');
          fetchData();
        } else {
          toast.error('Failed to update attendance');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  // Ledger calculation helper
  const getLedgerStats = () => {
    if (!selectedLedgerEmp || !startDate || !endDate) return null;
    const emp = employees.find(e => e._id === selectedLedgerEmp);
    if (!emp) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all calendar dates in range
    const dateList: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dateList.push(current.toLocaleDateString('sv').split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const totalDays = dateList.length;
    const weekendDaysList = emp.weekendDays || ['Friday'];

    let expectedWorkingDays = 0;
    let weekendCount = 0;

    dateList.forEach(d => {
      const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
      if (weekendDaysList.includes(dayName)) {
        weekendCount++;
      } else {
        expectedWorkingDays++;
      }
    });

    // Filter attendance logs in range
    const rangeLogs = attendance.filter(att => {
      const attEmpId = att.employee?._id ? att.employee._id.toString() : att.employee?.toString();
      return attEmpId === selectedLedgerEmp && att.date >= startDate && att.date <= endDate;
    });

    const presentCount = rangeLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
    const leaveCount = rangeLogs.filter(l => l.status === 'Leave').length;
    const absentCount = rangeLogs.filter(l => l.status === 'Absent').length;

    // Any missing non-weekend days are treated as present
    const missingDaysCount = Math.max(0, expectedWorkingDays - presentCount - leaveCount - absentCount);
    const totalAbsents = absentCount;
    const finalPresentCount = presentCount + missingDaysCount;

    // Filter disbursements in range to find already paid amounts
    const rangeDisbursements = disbursements.filter(dis => {
      const disEmpId = dis.employee?._id ? dis.employee._id.toString() : dis.employee?.toString();
      const disDate = new Date(dis.date).toLocaleDateString('sv').split('T')[0];
      return disEmpId === selectedLedgerEmp && dis.type === 'monthly_salary' && disDate >= startDate && disDate <= endDate;
    });
    const totalPaidInPeriod = rangeDisbursements.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Deductions calculation
    const allowedAbsents = emp.allowedAbsents ?? 1;
    const absentDeductionRate = emp.absentDeductionRate || 0;
    const netAbsents = Math.max(0, totalAbsents - allowedAbsents);
    const deduction = netAbsents * absentDeductionRate;
    const netPayable = Math.max(0, emp.baseSalary - deduction - totalPaidInPeriod);

    return {
      emp,
      totalDays,
      weekendCount,
      expectedWorkingDays,
      presentCount: finalPresentCount,
      leaveCount,
      totalAbsents,
      deduction,
      netPayable,
      totalPaidInPeriod,
      rangeLogs
    };
  };

  const ledger = getLedgerStats();

  return (
    <div className="space-y-6 px-0 py-4 md:p-6">
      <div className="px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black text-zinc-950">Employee Disbursements</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">Record monthly salaries, task payouts, and review detailed attendance ledgers.</p>
      </div>

      <EmployeeTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Section A: Attendance & Salary Ledger */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 p-5">
              <CardTitle className="text-lg font-black text-zinc-900">Attendance & Salary Ledger</CardTitle>
              <CardDescription className="text-sm text-zinc-500">Calculate net payable compensation based on historical attendance logs, leave records, and absent rules.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ledgerEmp">Select Employee</Label>
                  <select
                    id="ledgerEmp"
                    value={selectedLedgerEmp}
                    onChange={(e) => setSelectedLedgerEmp(e.target.value)}
                    className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus:border-zinc-400"
                  >
                    <option value="" disabled>Choose employee</option>
                    {employees.filter(e => e.employeeType === 'monthly' && e.status !== 'discontinued').map((emp) => (
                      <option key={emp._id.toString()} value={emp._id.toString()}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ledgerStart">Start Date</Label>
                  <Input
                    id="ledgerStart"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ledgerEnd">End Date</Label>
                  <Input
                    id="ledgerEnd"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {ledger && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <div className="text-xs font-bold text-zinc-400 uppercase">Expected Work Days</div>
                      <div className="text-2xl font-black text-zinc-800 mt-1">{ledger.expectedWorkingDays} Days</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Excludes {ledger.weekendCount} weekends</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <div className="text-xs font-bold text-emerald-600 uppercase">Days Present</div>
                      <div className="text-2xl font-black text-emerald-800 mt-1">{ledger.presentCount} Days</div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">Checked In / Late</div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <div className="text-xs font-bold text-rose-600 uppercase">Total Absents</div>
                      <div className="text-2xl font-black text-rose-800 mt-1">{ledger.totalAbsents} Days</div>
                      <div className="text-[10px] text-rose-500 mt-0.5">Allowed: {ledger.emp.allowedAbsents} / deduction rate: ৳{ledger.emp.absentDeductionRate}</div>
                    </div>
                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                      <div className="text-xs font-bold text-sky-600 uppercase">Total Leaves</div>
                      <div className="text-2xl font-black text-sky-800 mt-1">{ledger.leaveCount} Days</div>
                      <div className="text-[10px] text-sky-500 mt-0.5">Approved leave records</div>
                    </div>
                  </div>

                  <div className="border border-zinc-100 rounded-xl overflow-hidden">
                    <div className="bg-zinc-50/50 p-3.5 border-b border-zinc-100 font-bold text-sm text-zinc-700">Daily Logs in Date Range</div>
                    {ledger.rangeLogs.length === 0 ? (
                      <div className="text-center py-6 text-zinc-400 text-sm">No daily check-in logs found in this range.</div>
                    ) : (
                      <>
                        {/* Desktop View */}
                        <div className="hidden md:block">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold">
                                <th className="p-3">Date</th>
                                <th className="p-3">Check In</th>
                                <th className="p-3">Check Out</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.rangeLogs.map((log) => (
                                <tr key={log._id} className="border-b border-zinc-50 hover:bg-zinc-50/20">
                                  <td className="p-3 font-semibold text-zinc-700">{log.date}</td>
                                  <td className="p-3 text-zinc-500">{log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                  <td className="p-3 text-zinc-500">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                  <td className="p-3">
                                    <Badge variant={log.status === 'Present' ? 'default' : log.status === 'Late' ? 'secondary' : 'destructive'} className="font-bold text-[10px] px-1.5 py-0.5">
                                      {log.status}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditAttendance(log)}
                                      className="text-primary hover:text-primary hover:bg-primary/10 h-7 w-7 p-0"
                                      title="Update Status"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View */}
                        <div className="block md:hidden space-y-2 p-2.5">
                          {ledger.rangeLogs.map((log) => (
                            <div key={log._id} className="p-2.5 border border-zinc-150 rounded-lg bg-background shadow-xs text-xs space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-zinc-700">{log.date}</span>
                                <Badge variant={log.status === 'Present' ? 'default' : log.status === 'Late' ? 'secondary' : 'destructive'} className="font-bold text-[10px] px-1.5 py-0.5">
                                  {log.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-zinc-500 text-[11px]">
                                <span>Check In: {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                <span>Check Out: {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                              </div>
                              <div className="flex justify-end pt-1.5 border-t border-zinc-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAttendance(log)}
                                  className="text-primary hover:text-primary hover:bg-primary/10 h-7 w-7 p-0"
                                  title="Update Status"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section B: Disburse Salary/Compensation */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 p-5">
              <CardTitle className="text-lg font-black text-zinc-900">Disburse Salary/Compensation</CardTitle>
              <CardDescription className="text-sm text-zinc-500">Record payments to individual employees. Adjust the amounts and add remarks as needed.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {employees.filter(emp => emp.employeeType !== 'task-based' && emp.status !== 'discontinued').length === 0 ? (
                <div className="text-center py-10 text-zinc-400">No monthly salary employees registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                            <th className="p-4">Employee</th>
                            <th className="p-4">Type</th>
                            <th className="p-4 w-[180px]">Payable Amount (Tk)</th>
                            <th className="p-4 max-w-[280px]">Remarks / Period</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.filter(emp => emp.employeeType !== 'task-based' && emp.status !== 'discontinued').map((emp) => {
                            const today = new Date();
                            const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            const prevYear = prevMonthDate.getFullYear();
                            const prevMonthIdx = prevMonthDate.getMonth();

                            const prevMonthStart = new Date(Date.UTC(prevYear, prevMonthIdx, 1, 0, 0, 0, 0));
                            const prevMonthEnd = new Date(Date.UTC(prevYear, prevMonthIdx + 1, 0, 23, 59, 59, 999));
                            const totalDaysInPrevMonth = new Date(prevYear, prevMonthIdx + 1, 0).getDate();

                            const joinedDate = emp.joinedDate ? new Date(emp.joinedDate) : new Date(0);

                            let payableSalary = 0;
                            let isNewJoiner = false;
                            let proratedBaseSalary = emp.baseSalary || 0;
                            let activeExpectedWorkingDays = 0;
                            let presentCount = 0;
                            let leaveCount = 0;
                            let totalAbsents = 0;
                            let deduction = 0;

                            if (joinedDate <= prevMonthEnd) {
                              let activeStartDate = new Date(prevMonthStart);
                              if (joinedDate > prevMonthStart) {
                                activeStartDate = new Date(joinedDate);
                                isNewJoiner = true;
                              }

                              const activeDays = Math.ceil((prevMonthEnd.getTime() - activeStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                              if (isNewJoiner) {
                                proratedBaseSalary = Math.round(((emp.baseSalary || 0) / totalDaysInPrevMonth) * activeDays);
                              }

                              const weekendDaysList = emp.weekendDays || ['Friday'];

                              const tempDate = new Date(activeStartDate);
                              while (tempDate <= prevMonthEnd) {
                                const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
                                if (!weekendDaysList.includes(dayName)) {
                                  activeExpectedWorkingDays++;
                                }
                                tempDate.setDate(tempDate.getDate() + 1);
                              }

                              const activePeriodLogs = attendance.filter(att => {
                                const empId = att.employee?._id || att.employee;
                                const attDate = new Date(att.date);
                                return empId === emp._id && attDate >= activeStartDate && attDate <= prevMonthEnd;
                              });

                              presentCount = activePeriodLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
                              leaveCount = activePeriodLogs.filter(l => l.status === 'Leave').length;
                              const absentCount = activePeriodLogs.filter(l => l.status === 'Absent').length;

                              const missingDaysCount = Math.max(0, activeExpectedWorkingDays - presentCount - leaveCount - absentCount);
                              presentCount += missingDaysCount;
                              totalAbsents = absentCount;

                              const allowedAbsents = emp.allowedAbsents ?? 1;
                              const absentDeductionRate = emp.absentDeductionRate || 0;
                              const netAbsents = Math.max(0, totalAbsents - allowedAbsents);
                              deduction = netAbsents * absentDeductionRate;

                              const prevMonthStartStr = prevMonthStart.toLocaleDateString('sv').split('T')[0];
                              const prevMonthEndStr = prevMonthEnd.toLocaleDateString('sv').split('T')[0];
                              const prevMonthPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
                              const empPaidInPrevMonth = disbursements.filter(dis => {
                                const disEmpId = dis.employee?._id ? dis.employee._id.toString() : dis.employee?.toString();
                                const currentEmpId = emp._id.toString();
                                if (disEmpId !== currentEmpId) return false;
                                if (dis.type !== 'monthly_salary') return false;
                                if (dis.period) {
                                  return dis.period === prevMonthPeriod;
                                }
                                const disDate = new Date(dis.date).toLocaleDateString('sv').split('T')[0];
                                return disDate >= prevMonthStartStr && disDate <= prevMonthEndStr;
                              }).reduce((sum, d) => sum + (d.amount || 0), 0);

                              payableSalary = Math.max(0, proratedBaseSalary - deduction - empPaidInPrevMonth);
                            }

                            const currentType = disbursingTypes[emp._id] ?? (emp.employeeType === 'monthly' ? 'monthly_salary' : 'task_payment');

                            const prevMonthName = prevMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                            let defaultAmount = '0';
                            let defaultRemarks = '';
                            if (currentType === 'monthly_salary') {
                              defaultAmount = payableSalary.toString();
                              defaultRemarks = `${prevMonthName} Salary`;
                            } else if (currentType === 'task_payment') {
                              defaultAmount = '0';
                              defaultRemarks = 'Task Commission';
                            } else if (currentType === 'bonus') {
                              defaultAmount = '';
                              defaultRemarks = 'Performance Bonus';
                            }

                            const currentAmount = disbursingAmounts[emp._id] ?? defaultAmount;
                            const currentRemarks = disbursingRemarks[emp._id] ?? defaultRemarks;

                            return (
                              <tr key={emp._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                                <td className="p-4 font-bold text-zinc-900">
                                  {emp.name}
                                  <div className="text-xs text-zinc-400 font-normal">{emp.email}</div>
                                </td>
                                <td className="p-4">
                                  <select
                                    value={currentType}
                                    onChange={(e) => {
                                      const newType = e.target.value as 'monthly_salary' | 'bonus' | 'task_payment';
                                      setDisbursingTypes(prev => ({ ...prev, [emp._id]: newType }));

                                      let resetAmount = '0';
                                      let resetRemarks = '';
                                      if (newType === 'monthly_salary') {
                                        resetAmount = payableSalary.toString();
                                        resetRemarks = `${prevMonthName} Salary`;
                                      } else if (newType === 'task_payment') {
                                        resetAmount = '';
                                        resetRemarks = 'Task Commission';
                                      } else if (newType === 'bonus') {
                                        resetAmount = '';
                                        resetRemarks = 'Performance/Eid Bonus';
                                      }
                                      setDisbursingAmounts(prev => ({ ...prev, [emp._id]: resetAmount }));
                                      setDisbursingRemarks(prev => ({ ...prev, [emp._id]: resetRemarks }));
                                    }}
                                    className="h-8 rounded-lg border border-input bg-white px-2 py-1 text-xs shadow-xs outline-none focus:border-zinc-400 font-bold"
                                  >
                                    {emp.employeeType === 'monthly' ? (
                                      <>
                                        <option value="monthly_salary">Monthly Salary</option>
                                        <option value="bonus">Bonus</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="task_payment">Task Commission</option>
                                        <option value="bonus">Bonus</option>
                                      </>
                                    )}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <Input
                                    type="number"
                                    value={currentAmount}
                                    onChange={(e) => setDisbursingAmounts({
                                      ...disbursingAmounts,
                                      [emp._id]: e.target.value
                                    })}
                                    className="h-8 max-w-[140px] font-bold text-sm bg-white border-zinc-200"
                                  />
                                </td>
                                <td className="p-4">
                                  <Input
                                    type="text"
                                    placeholder="e.g. Eid Bonus"
                                    value={currentRemarks}
                                    onChange={(e) => setDisbursingRemarks({
                                      ...disbursingRemarks,
                                      [emp._id]: e.target.value
                                    })}
                                    className="h-8 w-full max-w-[240px] text-xs bg-white border-zinc-200"
                                  />
                                </td>
                                <td className="p-4 text-right">
                                  <Button
                                    onClick={() => handleIndividualDisburse(
                                      emp,
                                      currentAmount,
                                      currentRemarks,
                                      currentType,
                                      currentType === 'monthly_salary' ? {
                                        baseSalary: emp.baseSalary || 0,
                                        proratedSalary: proratedBaseSalary,
                                        workingDays: activeExpectedWorkingDays,
                                        presentDays: presentCount,
                                        leaveDays: leaveCount,
                                        absentDays: totalAbsents,
                                        deduction: deduction,
                                        netPayable: payableSalary
                                      } : undefined
                                    )}
                                    size="sm"
                                    className="bg-primary text-primary-foreground font-bold h-8 flex items-center gap-1.5"
                                  >
                                    <DollarSign className="h-3.5 w-3.5" /> Disburse
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 p-3">
                      {employees.filter(emp => emp.employeeType !== 'task-based' && emp.status !== 'discontinued').map((emp) => {
                        const today = new Date();
                        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const prevYear = prevMonthDate.getFullYear();
                        const prevMonthIdx = prevMonthDate.getMonth();

                        const prevMonthStart = new Date(Date.UTC(prevYear, prevMonthIdx, 1, 0, 0, 0, 0));
                        const prevMonthEnd = new Date(Date.UTC(prevYear, prevMonthIdx + 1, 0, 23, 59, 59, 999));
                        const totalDaysInPrevMonth = new Date(prevYear, prevMonthIdx + 1, 0).getDate();

                        const joinedDate = emp.joinedDate ? new Date(emp.joinedDate) : new Date(0);

                        let payableSalary = 0;
                        let isNewJoiner = false;
                        let proratedBaseSalary = emp.baseSalary || 0;
                        let activeExpectedWorkingDays = 0;
                        let presentCount = 0;
                        let leaveCount = 0;
                        let totalAbsents = 0;
                        let deduction = 0;

                        if (joinedDate <= prevMonthEnd) {
                          let activeStartDate = new Date(prevMonthStart);
                          if (joinedDate > prevMonthStart) {
                            activeStartDate = new Date(joinedDate);
                            isNewJoiner = true;
                          }

                          const activeDays = Math.ceil((prevMonthEnd.getTime() - activeStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                          if (isNewJoiner) {
                            proratedBaseSalary = Math.round(((emp.baseSalary || 0) / totalDaysInPrevMonth) * activeDays);
                          }

                          const weekendDaysList = emp.weekendDays || ['Friday'];

                          const tempDate = new Date(activeStartDate);
                          while (tempDate <= prevMonthEnd) {
                            const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
                            if (!weekendDaysList.includes(dayName)) {
                              activeExpectedWorkingDays++;
                            }
                            tempDate.setDate(tempDate.getDate() + 1);
                          }

                          const activePeriodLogs = attendance.filter(att => {
                            const empId = att.employee?._id || att.employee;
                            const attDate = new Date(att.date);
                            return empId === emp._id && attDate >= activeStartDate && attDate <= prevMonthEnd;
                          });

                          presentCount = activePeriodLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
                          leaveCount = activePeriodLogs.filter(l => l.status === 'Leave').length;
                          const absentCount = activePeriodLogs.filter(l => l.status === 'Absent').length;

                          const missingDaysCount = Math.max(0, activeExpectedWorkingDays - presentCount - leaveCount - absentCount);
                          presentCount += missingDaysCount;
                          totalAbsents = absentCount;

                          const allowedAbsents = emp.allowedAbsents ?? 1;
                          const absentDeductionRate = emp.absentDeductionRate || 0;
                          const netAbsents = Math.max(0, totalAbsents - allowedAbsents);
                          deduction = netAbsents * absentDeductionRate;

                          const prevMonthStartStr = prevMonthStart.toLocaleDateString('sv').split('T')[0];
                          const prevMonthEndStr = prevMonthEnd.toLocaleDateString('sv').split('T')[0];
                          const prevMonthPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
                          const empPaidInPrevMonth = disbursements.filter(dis => {
                            const disEmpId = dis.employee?._id ? dis.employee._id.toString() : dis.employee?.toString();
                            const currentEmpId = emp._id.toString();
                            if (disEmpId !== currentEmpId) return false;
                            if (dis.type !== 'monthly_salary') return false;
                            if (dis.period) {
                              return dis.period === prevMonthPeriod;
                            }
                            const disDate = new Date(dis.date).toLocaleDateString('sv').split('T')[0];
                            return disDate >= prevMonthStartStr && disDate <= prevMonthEndStr;
                          }).reduce((sum, d) => sum + (d.amount || 0), 0);

                          payableSalary = Math.max(0, proratedBaseSalary - deduction - empPaidInPrevMonth);
                        }

                        const currentType = disbursingTypes[emp._id] ?? (emp.employeeType === 'monthly' ? 'monthly_salary' : 'task_payment');

                        const prevMonthName = prevMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                        let defaultAmount = '0';
                        let defaultRemarks = '';
                        if (currentType === 'monthly_salary') {
                          defaultAmount = payableSalary.toString();
                          defaultRemarks = `${prevMonthName} Salary`;
                        } else if (currentType === 'task_payment') {
                          defaultAmount = '0';
                          defaultRemarks = 'Task Commission';
                        } else if (currentType === 'bonus') {
                          defaultAmount = '';
                          defaultRemarks = 'Performance Bonus';
                        }

                        const currentAmount = disbursingAmounts[emp._id] ?? defaultAmount;
                        const currentRemarks = disbursingRemarks[emp._id] ?? defaultRemarks;

                        return (
                          <div key={emp._id} className="p-3.5 border border-zinc-150 rounded-xl bg-background shadow-sm space-y-3">
                            {/* Header info */}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-zinc-900 truncate">{emp.name}</h4>
                              <p className="text-xs text-zinc-500 truncate">{emp.email}</p>
                            </div>

                            {/* Input & dropdown fields */}
                            <div className="space-y-2 text-xs pt-1 border-t border-zinc-100">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500 font-medium">Type:</span>
                                <select
                                  value={currentType}
                                  onChange={(e) => {
                                    const newType = e.target.value as 'monthly_salary' | 'bonus' | 'task_payment';
                                    setDisbursingTypes(prev => ({ ...prev, [emp._id]: newType }));

                                    let resetAmount = '0';
                                    let resetRemarks = '';
                                    if (newType === 'monthly_salary') {
                                      resetAmount = payableSalary.toString();
                                      resetRemarks = `${prevMonthName} Salary`;
                                    } else if (newType === 'task_payment') {
                                      resetAmount = '';
                                      resetRemarks = 'Task Commission';
                                    } else if (newType === 'bonus') {
                                      resetAmount = '';
                                      resetRemarks = 'Performance/Eid Bonus';
                                    }
                                    setDisbursingAmounts(prev => ({ ...prev, [emp._id]: resetAmount }));
                                    setDisbursingRemarks(prev => ({ ...prev, [emp._id]: resetRemarks }));
                                  }}
                                  className="h-8 rounded-lg border border-input bg-white px-2 py-1 text-xs shadow-xs outline-none focus:border-zinc-400 font-bold"
                                >
                                  {emp.employeeType === 'monthly' ? (
                                    <>
                                      <option value="monthly_salary">Monthly Salary</option>
                                      <option value="bonus">Bonus</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="task_payment">Task Commission</option>
                                      <option value="bonus">Bonus</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500 font-medium">Payable (Tk):</span>
                                <Input
                                  type="number"
                                  value={currentAmount}
                                  onChange={(e) => setDisbursingAmounts({
                                    ...disbursingAmounts,
                                    [emp._id]: e.target.value
                                  })}
                                  className="h-8 w-32 font-bold text-xs bg-white border-zinc-200"
                                />
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500 font-medium">Remarks / Period:</span>
                                <Input
                                  type="text"
                                  placeholder="e.g. Eid Bonus"
                                  value={currentRemarks}
                                  onChange={(e) => setDisbursingRemarks({
                                    ...disbursingRemarks,
                                    [emp._id]: e.target.value
                                  })}
                                  className="h-8 w-44 text-xs bg-white border-zinc-200"
                                />
                              </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
                              <Button
                                onClick={() => handleIndividualDisburse(
                                  emp,
                                  currentAmount,
                                  currentRemarks,
                                  currentType,
                                  currentType === 'monthly_salary' ? {
                                    baseSalary: emp.baseSalary || 0,
                                    proratedSalary: proratedBaseSalary,
                                    workingDays: activeExpectedWorkingDays,
                                    presentDays: presentCount,
                                    leaveDays: leaveCount,
                                    absentDays: totalAbsents,
                                    deduction: deduction,
                                    netPayable: payableSalary
                                  } : undefined
                                )}
                                size="sm"
                                className="bg-primary text-primary-foreground font-bold h-8 flex items-center gap-1.5 text-xs px-3"
                              >
                                <DollarSign className="h-3.5 w-3.5" /> Disburse
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: Disbursement History */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 p-5">
              <CardTitle className="text-lg font-black text-zinc-900">Disbursement History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {disbursements.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-60" />
                  <p className="font-medium">No disbursements recorded yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                          <th className="p-4">Employee</th>
                          <th className="p-4">Payment Type</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Remarks</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disbursements.map((dis) => (
                          <tr key={dis._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 font-bold text-zinc-900">
                              {dis.employee?.name || 'Unknown User'}
                              <div className="text-xs text-zinc-400 font-normal">{dis.employee?.email}</div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-bold">
                                {dis.type === 'monthly_salary'
                                  ? 'Monthly salary'
                                  : dis.type === 'bonus'
                                    ? 'Bonus'
                                    : 'Task compensation'}
                              </Badge>
                            </td>
                            <td className="p-4 font-black text-green-600">
                              +{dis.amount?.toLocaleString()} Tk
                            </td>
                            <td className="p-4 text-zinc-500">
                              {new Date(dis.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                            </td>
                            <td className="p-4 text-zinc-600 italic">
                              {dis.remarks || 'N/A'}
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDisbursement(dis._id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                title="Delete History"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="block md:hidden space-y-3 p-3">
                    {disbursements.map((dis) => (
                      <div key={dis._id} className="p-3.5 border border-zinc-150 rounded-xl bg-background shadow-sm space-y-3">
                        {/* Header info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-900 truncate">{dis.employee?.name || 'Unknown User'}</h4>
                          <p className="text-xs text-zinc-500 truncate">{dis.employee?.email}</p>
                        </div>

                        {/* Detail Rows */}
                        <div className="space-y-1.5 text-xs pt-1 border-t border-zinc-100">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Payment Type:</span>
                            <Badge variant="outline" className="font-bold text-[10px] px-2 py-0">
                              {dis.type === 'monthly_salary'
                                ? 'Monthly salary'
                                : dis.type === 'bonus'
                                  ? 'Bonus'
                                  : 'Task compensation'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Amount:</span>
                            <span className="font-black text-green-600">+{dis.amount?.toLocaleString()} Tk</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Date:</span>
                            <span className="text-zinc-700 font-medium">{new Date(dis.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-zinc-500">Remarks:</span>
                            <span className="text-zinc-600 italic text-right max-w-[180px] break-words">{dis.remarks || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDisbursement(dis._id)}
                            className="text-red-500 hover:text-red-650 hover:bg-red-50 h-8 px-2.5 rounded-full flex items-center gap-1 text-xs"
                            title="Delete History"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Record
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}

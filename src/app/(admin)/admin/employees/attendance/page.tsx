/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { EmployeeTabs } from '@/components/admin/EmployeeTabs';

export default function AttendancePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);

  const [attendanceFilterDate, setAttendanceFilterDate] = useState<string>(() => new Date().toLocaleDateString('sv').split('T')[0]);
  const [rowInputs, setRowInputs] = useState<Record<string, { status: string; checkIn: string; checkOut: string }>>({});

  const fetchData = async (date?: string) => {
    setLoading(true);
    try {
      const attUrl = date ? `/api/admin/employees/attendance?date=${encodeURIComponent(date)}` : '/api/admin/employees/attendance';
      const [empRes, attRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch(attUrl)
      ]);

      let loadedEmployees = [];
      let loadedAttendance = [];

      if (empRes.ok) {
        const empData = await empRes.json();
        loadedEmployees = empData.employees || [];
        setEmployees(loadedEmployees);
      }
      if (attRes.ok) {
        const attData = await attRes.json();
        loadedAttendance = attData.attendance || [];
        setAttendance(loadedAttendance);
      }

      const initialInputs: Record<string, { status: string; checkIn: string; checkOut: string }> = {};
      loadedEmployees.filter((emp: any) => emp.employeeType === 'monthly' && emp.status !== 'discontinued').forEach((emp: any) => {
        const log = loadedAttendance.find((att: any) => {
          const empId = att.employee?._id || att.employee;
          return empId === emp._id;
        });
        
        let checkInStr = '09:00';
        if (log?.checkIn) {
          const d = new Date(log.checkIn);
          checkInStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else if (log && (log.status === 'Absent' || log.status === 'Leave')) {
          checkInStr = '';
        }
        
        let checkOutStr = '18:00';
        if (log?.checkOut) {
          const d = new Date(log.checkOut);
          checkOutStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else if (log && (log.status === 'Absent' || log.status === 'Leave')) {
          checkOutStr = '';
        }

        initialInputs[emp._id] = {
          status: log?.status || 'Present',
          checkIn: checkInStr,
          checkOut: checkOutStr
        };
      });
      setRowInputs(initialInputs);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (attendanceFilterDate) {
      Promise.resolve().then(() => {
        fetchData(attendanceFilterDate);
      });
    }
  }, [attendanceFilterDate]);

  const handleRowAttendanceUpdate = async (employeeId: string) => {
    const input = rowInputs[employeeId];
    if (!input || !input.status) {
      toast.error('Invalid input data');
      return;
    }

    let checkInISO = undefined;
    let checkOutISO = undefined;

    if (input.status !== 'Absent' && input.status !== 'Leave') {
      if (input.checkIn) {
        checkInISO = new Date(`${attendanceFilterDate}T${input.checkIn}`).toISOString();
      }
      if (input.checkOut) {
        checkOutISO = new Date(`${attendanceFilterDate}T${input.checkOut}`).toISOString();
      }
    }

    setSavingEmployeeId(employeeId);
    try {
      const response = await fetch('/api/admin/employees/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual',
          employeeId: employeeId,
          date: attendanceFilterDate,
          status: input.status,
          checkIn: checkInISO,
          checkOut: checkOutISO
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Attendance status updated successfully',
          confirmButtonColor: '#eab308'
        });
        fetchData(attendanceFilterDate);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to update attendance');
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setSavingEmployeeId(null);
    }
  };

  return (
    <div className="space-y-6 px-0 py-4 md:p-6">
      <div className="px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black text-zinc-950">Daily Attendance Sheet</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">Review and log daily attendance for permanent staff members.</p>
      </div>

      <EmployeeTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 p-5 flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg font-black text-zinc-900">Attendance Sheet</CardTitle>
              <CardDescription className="text-sm text-zinc-500">Track and update employee attendance status and times for any date.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sheetDate" className="text-xs font-bold text-zinc-600">Select Date:</Label>
              <Input 
                id="sheetDate"
                type="date"
                className="w-40 bg-white"
                value={attendanceFilterDate}
                onChange={(e) => setAttendanceFilterDate(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employees.filter(emp => emp.employeeType === 'monthly' && emp.status !== 'discontinued').length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-60" />
                <p className="font-medium">No permanent employees found to mark attendance.</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">Employee</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Check In</th>
                        <th className="p-4">Check Out</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(emp => emp.employeeType === 'monthly' && emp.status !== 'discontinued').map((emp) => {
                        const state = rowInputs[emp._id] || { status: 'Present', checkIn: '09:00', checkOut: '18:00' };
                        const isTimeDisabled = state.status === 'Absent' || state.status === 'Leave';
                        return (
                          <tr key={emp._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 font-bold text-zinc-900">
                              {emp.name}
                              <div className="text-xs text-zinc-400 font-normal">{emp.email}</div>
                            </td>
                            <td className="p-4">
                              <Select
                                value={state.status}
                                onValueChange={(val: any) => {
                                  setRowInputs(prev => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      status: val,
                                      checkIn: (val === 'Present' || val === 'Late') && !prev[emp._id]?.checkIn ? '09:00' : prev[emp._id]?.checkIn || '',
                                      checkOut: (val === 'Present' || val === 'Late') && !prev[emp._id]?.checkOut ? '18:00' : prev[emp._id]?.checkOut || ''
                                    }
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present">Present</SelectItem>
                                  <SelectItem value="Late">Late</SelectItem>
                                  <SelectItem value="Absent">Absent</SelectItem>
                                  <SelectItem value="Leave">Leave</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4">
                              <Input 
                                type="time"
                                disabled={isTimeDisabled}
                                value={state.checkIn}
                                onChange={(e) => {
                                  setRowInputs(prev => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      checkIn: e.target.value
                                    }
                                  }));
                                }}
                                className="w-28 bg-white"
                              />
                            </td>
                            <td className="p-4">
                              <Input 
                                type="time"
                                disabled={isTimeDisabled}
                                value={state.checkOut}
                                onChange={(e) => {
                                  setRowInputs(prev => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      checkOut: e.target.value
                                    }
                                  }));
                                }}
                                className="w-28 bg-white"
                              />
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                onClick={() => handleRowAttendanceUpdate(emp._id)}
                                disabled={savingEmployeeId === emp._id}
                                className="bg-primary text-primary-foreground font-bold hover:bg-primary/95"
                              >
                                Update
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
                  {employees.filter(emp => emp.employeeType === 'monthly' && emp.status !== 'discontinued').map((emp) => {
                    const state = rowInputs[emp._id] || { status: 'Present', checkIn: '09:00', checkOut: '18:00' };
                    const isTimeDisabled = state.status === 'Absent' || state.status === 'Leave';
                    return (
                      <div key={emp._id} className="p-3.5 border border-zinc-150 rounded-xl bg-background shadow-sm space-y-3">
                        {/* Header info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-900 truncate">{emp.name}</h4>
                          <p className="text-xs text-zinc-500 truncate">{emp.email}</p>
                        </div>

                        {/* Status Select & Time Inputs */}
                        <div className="space-y-2 text-xs pt-1 border-t border-zinc-100">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-medium">Status:</span>
                            <Select
                              value={state.status}
                              onValueChange={(val: any) => {
                                setRowInputs(prev => ({
                                  ...prev,
                                  [emp._id]: {
                                    ...prev[emp._id],
                                    status: val,
                                    checkIn: (val === 'Present' || val === 'Late') && !prev[emp._id]?.checkIn ? '09:00' : prev[emp._id]?.checkIn || '',
                                    checkOut: (val === 'Present' || val === 'Late') && !prev[emp._id]?.checkOut ? '18:00' : prev[emp._id]?.checkOut || ''
                                  }
                                }));
                              }}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Leave">Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-medium">Check In:</span>
                            <Input 
                              type="time"
                              disabled={isTimeDisabled}
                              value={state.checkIn}
                              onChange={(e) => {
                                setRowInputs(prev => ({
                                  ...prev,
                                  [emp._id]: {
                                    ...prev[emp._id],
                                    checkIn: e.target.value
                                  }
                                }));
                              }}
                              className="w-32 h-8 text-xs bg-white"
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-medium">Check Out:</span>
                            <Input 
                              type="time"
                              disabled={isTimeDisabled}
                              value={state.checkOut}
                              onChange={(e) => {
                                setRowInputs(prev => ({
                                  ...prev,
                                  [emp._id]: {
                                    ...prev[emp._id],
                                    checkOut: e.target.value
                                  }
                                }));
                              }}
                              className="w-32 h-8 text-xs bg-white"
                            />
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
                          <Button
                            onClick={() => handleRowAttendanceUpdate(emp._id)}
                            disabled={savingEmployeeId === emp._id}
                            className="bg-primary text-primary-foreground font-bold hover:bg-primary/95 text-xs h-8 px-4"
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

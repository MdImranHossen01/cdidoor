/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, UserPlus, Trash2, DollarSign, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EmployeeTabs } from '@/components/admin/EmployeeTabs';

export default function TasksPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Task states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignPayout, setAssignPayout] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [empRes, taskRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/employees/tasks')
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks details:', error);
      toast.error('Failed to load tasks details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchData(false);
    };
    loadData();
  }, [fetchData]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmployeeId || !assignTitle || !assignPayout) {
      toast.error('Employee, Title, and Payout amount are required');
      return;
    }
    try {
      const response = await fetch('/api/admin/employees/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignEmployeeId,
          title: assignTitle,
          description: assignDescription,
          payout: Number(assignPayout),
          dueDate: assignDueDate || undefined
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Assigned!',
          text: 'Task assigned successfully to the employee',
          confirmButtonColor: '#eab308'
        });
        setShowAssignModal(false);
        setAssignEmployeeId('');
        setAssignTitle('');
        setAssignDescription('');
        setAssignPayout('');
        setAssignDueDate('');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to assign task');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleDisburseTaskPayout = async (task: any) => {
    const result = await Swal.fire({
      title: 'Disburse Task Payout',
      text: `Are you sure you want to disburse ${task.payout?.toLocaleString()} Tk for "${task.title}" to ${task.employee?.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Disburse',
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const salResponse = await fetch('/api/admin/employees/salaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: task.employee?._id || task.employee,
            amount: task.payout,
            type: 'task_payment',
            remarks: `Payout for completed task: ${task.title}`
          })
        });

        if (!salResponse.ok) {
          const data = await salResponse.json();
          toast.error(data.message || 'Failed to disburse salary record');
          return;
        }

        const taskResponse = await fetch(`/api/admin/employees/tasks/${task._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Paid' })
        });

        if (taskResponse.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Payout Disbursed!',
            text: 'Disbursement logged and task marked as Paid',
            confirmButtonColor: '#eab308'
          });
          fetchData();
        } else {
          toast.error('Payment logged, but failed to update task status to Paid');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the pending task assignment!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/employees/tasks/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Task has been deleted.',
            confirmButtonColor: '#eab308'
          });
          fetchData();
        } else {
          toast.error('Failed to delete task');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  return (
    <div className="space-y-6 px-0 py-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 md:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-950">Task Assignments</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Manage and assign tasks to contractual (task-based) staff.</p>
        </div>
        <Button
          onClick={() => {
            const taskEmps = employees.filter(e => e.employeeType === 'task-based' && e.status !== 'discontinued');
            if (taskEmps.length > 0) {
              setAssignEmployeeId(taskEmps[0]._id);
              setAssignPayout('');
            } else {
              setAssignEmployeeId('');
              setAssignPayout('');
            }
            setShowAssignModal(true);
          }}
          className="bg-primary text-primary-foreground font-bold flex items-center gap-1.5 rounded-full"
        >
          <UserPlus className="h-4 w-4" /> Assign New Task
        </Button>
      </div>

      <EmployeeTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card className="border border-zinc-200 shadow-sm">
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-60" />
                <p className="font-medium">No tasks assigned yet.</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">Employee</th>
                        <th className="p-4">Task Details</th>
                        <th className="p-4">Payout</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Dates</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 font-bold text-zinc-900">
                            {task.employee?.name || 'Unknown User'}
                            <div className="text-xs text-zinc-400 font-normal">{task.employee?.email}</div>
                          </td>
                          <td className="p-4 max-w-[280px]">
                            <div className="font-bold text-zinc-900">{task.title}</div>
                            {task.description && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2" title={task.description}>{task.description}</div>}
                          </td>
                          <td className="p-4 font-black text-zinc-800">
                            {task.payout?.toLocaleString()} Tk
                          </td>
                          <td className="p-4">
                            <Badge
                              className="font-bold"
                              variant={
                                task.status === 'Paid'
                                  ? 'default'
                                  : task.status === 'Completed'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {task.status === 'Paid' ? 'Paid Out' : task.status === 'Completed' ? 'Completed' : 'Pending Work'}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-zinc-500">
                            <div><span className="font-semibold">Assigned:</span> {new Date(task.assignedDate).toLocaleDateString()}</div>
                            {task.dueDate && (
                              <div className="mt-0.5 text-amber-600 font-medium"><span className="font-semibold text-zinc-500">Due:</span> {new Date(task.dueDate).toLocaleDateString()}</div>
                            )}
                            {task.completedDate && (
                              <div className="mt-0.5 text-emerald-600"><span className="font-semibold text-zinc-500">Completed:</span> {new Date(task.completedDate).toLocaleDateString()}</div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {task.status === 'Completed' && (
                                <Button
                                  onClick={() => handleDisburseTaskPayout(task)}
                                  size="sm"
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 flex items-center gap-1"
                                >
                                  <DollarSign className="h-3.5 w-3.5" /> Disburse
                                </Button>
                              )}
                              {task.status === 'Pending' && (
                                <Button
                                  onClick={() => handleDeleteTask(task._id)}
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:bg-red-50 h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3 p-3">
                  {tasks.map((task) => (
                    <div key={task._id} className="p-3.5 border border-zinc-150 rounded-xl bg-background shadow-sm space-y-3">
                      {/* Header info */}
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-zinc-900 truncate">{task.employee?.name || 'Unknown User'}</h4>
                        <p className="text-xs text-zinc-500 truncate">{task.employee?.email}</p>
                      </div>

                      {/* Detail Rows */}
                      <div className="space-y-1.5 text-xs pt-1 border-t border-zinc-100">
                        <div className="flex justify-between items-start">
                          <span className="text-zinc-500">Task Title:</span>
                          <span className="text-zinc-800 font-bold text-right max-w-[180px] break-words">{task.title}</span>
                        </div>
                        {task.description && (
                          <div className="flex justify-between items-start">
                            <span className="text-zinc-500">Description:</span>
                            <span className="text-zinc-500 text-right max-w-[180px] break-words">{task.description}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Payout:</span>
                          <span className="font-black text-zinc-800">{task.payout?.toLocaleString()} Tk</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Status:</span>
                          <Badge
                            className="font-bold text-[10px] px-2 py-0"
                            variant={
                              task.status === 'Paid'
                                ? 'default'
                                : task.status === 'Completed'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {task.status === 'Paid' ? 'Paid Out' : task.status === 'Completed' ? 'Completed' : 'Pending Work'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-start pt-1 border-t border-zinc-50">
                          <span className="text-zinc-500">Dates:</span>
                          <div className="text-right text-[10px] text-zinc-500 space-y-0.5">
                            <div>Assigned: {new Date(task.assignedDate).toLocaleDateString()}</div>
                            {task.dueDate && <div className="text-amber-600">Due: {new Date(task.dueDate).toLocaleDateString()}</div>}
                            {task.completedDate && <div className="text-emerald-600">Completed: {new Date(task.completedDate).toLocaleDateString()}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      {(task.status === 'Completed' || task.status === 'Pending') && (
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-100">
                          {task.status === 'Completed' && (
                            <Button
                              onClick={() => handleDisburseTaskPayout(task)}
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs flex items-center gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Disburse
                            </Button>
                          )}
                          {task.status === 'Pending' && (
                            <Button
                              onClick={() => handleDeleteTask(task._id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 h-8 px-2.5 rounded-full flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Task
                            </Button>
                          )}
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

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black text-zinc-900">Assign Task to Staff</CardTitle>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleAssignTask}>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assignEmp">Select Employee</Label>
                  <select
                    id="assignEmp"
                    value={assignEmployeeId}
                    onChange={(e) => setAssignEmployeeId(e.target.value)}
                    required
                    className="w-full h-9 rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs outline-none focus:border-zinc-400 font-medium"
                  >
                    <option value="" disabled>Choose task-based staff member</option>
                    {employees
                      .filter(e => e.employeeType === 'task-based' && e.status !== 'discontinued')
                      .map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskTitle">Task Title</Label>
                  <Input
                    id="taskTitle"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Design main entrance double door"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDesc">Description (Optional)</Label>
                  <Input
                    id="taskDesc"
                    value={assignDescription}
                    onChange={(e) => setAssignDescription(e.target.value)}
                    placeholder="Describe specific requirements, dimensions, etc."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskPayout">Payout Amount (Tk)</Label>
                  <Input
                    id="taskPayout"
                    type="number"
                    required
                    value={assignPayout}
                    onChange={(e) => setAssignPayout(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDueDate">Expected Completion Date</Label>
                  <Input
                    id="taskDueDate"
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">Assign Task</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  UserPlus, 
  DollarSign, 
  Trash2,
  X,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminTaskManagementPage() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignPayout, setAssignPayout] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, taskRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/employees/tasks')
      ]);

      if (empRes.ok) {
        const empData = await empRes.ok ? await empRes.json() : {};
        setEmployees(empData.employees || []);
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching task management data:', error);
      toast.error('Failed to load tasks and staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          toast.success('Task deleted successfully');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to delete task');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleDisburseTaskPayout = async (task: any) => {
    const result = await Swal.fire({
      title: 'Disburse Task Payout',
      text: `Are you sure you want to disburse ${task.payout.toLocaleString()} Tk for "${task.title}" to ${task.employee?.name}?`,
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

  const taskEmps = employees.filter(e => e.employeeType === 'task-based');

  if (loading) {
    return <AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-56" />;
  }

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-3xl font-black text-zinc-950">{t("task_management.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t("task_management.subtitle")}</p>
        </div>
        <Button 
          onClick={() => {
            if (taskEmps.length > 0) {
              setAssignEmployeeId(taskEmps[0]._id);
            } else {
              setAssignEmployeeId('');
            }
            setAssignPayout('');
            setAssignDueDate('');
            setShowAssignModal(true);
          }}
          className="bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto rounded-none h-10"
        >
          <Plus className="h-4 w-4" /> {t("task_management.assign_new_task")}
        </Button>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border border-zinc-200">
          <CardHeader className="hidden md:block bg-zinc-50/50 border-b border-zinc-200 p-5">
            <CardTitle className="text-lg font-black text-zinc-900">{t("task_management.directory")}</CardTitle>
            <CardDescription className="text-sm text-zinc-500">{t("task_management.directory_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-60" />
                <p className="font-medium">{t("task_management.no_tasks")}</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                      <th className="font-bold p-4">{t("task_management.assigned_employee")}</th>
                      <th className="font-bold p-4">{t("task_management.task_details")}</th>
                      <th className="font-bold p-4">{t("task_management.payout")}</th>
                      <th className="font-bold p-4">{t("task_management.status")}</th>
                      <th className="font-bold p-4">{t("task_management.timeline")}</th>
                      <th className="font-bold p-4 text-right">{t("task_management.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 p-4 font-bold text-zinc-900">
                          {task.employee?.name || t("task_management.unknown_user")}
                          <div className="text-xs text-zinc-400 font-normal">{task.employee?.email}</div>
                          {task.employee?.phone && <div className="text-[11px] text-zinc-500 font-normal mt-0.5">{task.employee.phone}</div>}
                        </td>
                        <td className="py-4 p-4 max-w-[280px]">
                          <div className="font-bold text-zinc-900">{task.title}</div>
                          {task.description && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2" title={task.description}>{task.description}</div>}
                        </td>
                        <td className="py-4 p-4 font-black text-zinc-800">
                          {task.payout?.toLocaleString()} Tk
                        </td>
                        <td className="py-4 p-4">
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
                            {task.status === 'Paid' ? t("task_management.paid_out") : task.status === 'Completed' ? t("task_management.completed") : t("task_management.pending_work")}
                          </Badge>
                        </td>
                        <td className="py-4 p-4 text-xs text-zinc-500 space-y-0.5">
                          <div><span className="font-semibold">{t("task_management.assigned_on")}</span> {new Date(task.assignedDate).toLocaleDateString()}</div>
                          {task.dueDate && (
                            <div className="text-amber-600 font-medium"><span className="font-semibold text-zinc-500">{t("task_management.expected_complete")}</span> {new Date(task.dueDate).toLocaleDateString()}</div>
                          )}
                          {task.completedDate && (
                            <div className="text-emerald-600"><span className="font-semibold text-zinc-500">{t("task_management.completed_on")}</span> {new Date(task.completedDate).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="py-4 text-right p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 bg-white border shadow-sm">
                              {task.status === 'Completed' && (
                                <DropdownMenuItem onClick={() => handleDisburseTaskPayout(task)} className="cursor-pointer text-emerald-600 flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>Disburse</span>
                                </DropdownMenuItem>
                              )}
                              {task.status === 'Pending' && (
                                <DropdownMenuItem onClick={() => handleDeleteTask(task._id)} className="cursor-pointer text-destructive flex items-center gap-2">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              )}
                              {task.status === 'Paid' && (
                                <DropdownMenuItem disabled className="text-zinc-400 italic">
                                  <span>Paid & Cleared</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden space-y-3 p-3 bg-zinc-50/55">
                {tasks.map((task) => (
                  <div key={task._id} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
                    {/* Top Row: Employee Name & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-base text-foreground">
                        {task.employee?.name || t("task_management.unknown_user")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="font-bold text-xs px-2 py-0.5" 
                          variant={
                            task.status === 'Paid' 
                              ? 'default' 
                              : task.status === 'Completed' 
                              ? 'secondary' 
                              : 'outline'
                          }
                        >
                          {task.status === 'Paid' ? t("task_management.paid_out") : task.status === 'Completed' ? t("task_management.completed") : t("task_management.pending_work")}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 bg-white border shadow-sm">
                            {task.status === 'Completed' && (
                              <DropdownMenuItem onClick={() => handleDisburseTaskPayout(task)} className="cursor-pointer text-emerald-600 flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Disburse</span>
                              </DropdownMenuItem>
                            )}
                            {task.status === 'Pending' && (
                              <DropdownMenuItem onClick={() => handleDeleteTask(task._id)} className="cursor-pointer text-destructive flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                            {task.status === 'Paid' && (
                              <DropdownMenuItem disabled className="text-zinc-400 italic">
                                <span>Paid & Cleared</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Task Title & Description */}
                    <div className="border-t border-border/30 pt-2">
                      <p className="font-bold text-sm text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded border border-border/30 leading-relaxed whitespace-pre-line">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Contact & Timeline Details */}
                    <div className="space-y-2 text-xs text-muted-foreground pt-1">
                      {task.employee?.phone && (
                        <div className="flex justify-between items-center py-0.5">
                          <span>Phone:</span>
                          <span className="font-semibold text-foreground text-sm">{task.employee.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                        <span>Assigned On:</span>
                        <span className="font-medium text-foreground">{new Date(task.assignedDate).toLocaleDateString()}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                          <span>Expected Complete:</span>
                          <span className="font-semibold text-amber-600">{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.completedDate && (
                        <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                          <span>Completed On:</span>
                          <span className="font-semibold text-emerald-600">{new Date(task.completedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Payout */}
                    <div className="flex items-center justify-between border-t pt-2.5 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Payout</span>
                        <span className="font-extrabold text-base text-zinc-900">{task.payout?.toLocaleString()} Tk</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-black text-zinc-900">{t("task_management.assign_to_staff")}</CardTitle>
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
                  <Label htmlFor="assignEmp">{t("task_management.select_employee")}</Label>
                  <Select 
                    onValueChange={(val: any) => setAssignEmployeeId(val || '')} 
                    value={assignEmployeeId}
                  >
                    <SelectTrigger id="assignEmp">
                      <SelectValue placeholder={t("task_management.choose_staff")} />
                    </SelectTrigger>
                    <SelectContent>
                      {taskEmps.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskTitle">{t("task_management.task_title")}</Label>
                  <Input 
                    id="taskTitle"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder={t("task_management.task_title_placeholder") as string}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDesc">{t("task_management.task_desc")}</Label>
                  <Input 
                    id="taskDesc"
                    value={assignDescription}
                    onChange={(e) => setAssignDescription(e.target.value)}
                    placeholder={t("task_management.task_desc_placeholder") as string}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskPayout">{t("task_management.payout_amount")}</Label>
                  <Input 
                    id="taskPayout"
                    type="number"
                    required
                    value={assignPayout}
                    onChange={(e) => setAssignPayout(e.target.value)}
                    placeholder={t("task_management.payout_amount_placeholder") as string}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDueDate">{t("task_management.expected_completion")}</Label>
                  <Input 
                    id="taskDueDate"
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>{t("task_management.cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">{t("task_management.assign_task_btn")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

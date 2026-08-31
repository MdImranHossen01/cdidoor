/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Users, 
  UserPlus, 
  FileText, 
  X, 
  Briefcase, 
  Trash2,
  AlertCircle,
  MoreVertical,
  Edit
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { EmployeeTabs } from '@/components/admin/EmployeeTabs';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminEmployeesPage() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formType, setFormType] = useState<'monthly' | 'task-based'>('monthly');
  const [formWeekendDays, setFormWeekendDays] = useState<string[]>(['Friday']);
  const [formAllowedAbsents, setFormAllowedAbsents] = useState<number>(1);
  const [formAbsentDeductionRate, setFormAbsentDeductionRate] = useState<number>(0);
  const [formBasicSalary, setFormBasicSalary] = useState('');
  const [formAllowance, setFormAllowance] = useState<number>(0);
  const [formDeduction, setFormDeduction] = useState<number>(0);
  const [formLetter, setFormLetter] = useState('');
  const [formImage, setFormImage] = useState('');

  const computedBaseSalary = Math.max(0, Number(formBasicSalary || 0) + Number(formAllowance || 0) - Number(formDeduction || 0));

  const openEditModal = (emp: any) => {
    setEditingEmployeeId(emp._id);
    setFormName(emp.name || '');
    setFormEmail(emp.email || '');
    setFormPhone(emp.phone || '');
    setFormImage(emp.image || '');
    setFormType(emp.employeeType || 'monthly');
    setFormBasicSalary(emp.basicSalary ? emp.basicSalary.toString() : '');
    setFormAllowance(emp.allowance || 0);
    setFormDeduction(emp.deduction || 0);
    setFormWeekendDays(emp.weekendDays || ['Friday']);
    setFormAllowedAbsents(emp.allowedAbsents ?? 1);
    setFormAbsentDeductionRate(emp.absentDeductionRate || 0);
    setShowEditModal(true);
  };

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/admin/employees');
      if (response.ok) {
        const empData = await response.json();
        setEmployees(empData.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employee details');
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

  const handleAddEmployee = async (e: React.FormEvent) => {
    if (formWeekendDays && formWeekendDays.length >= 7) {
      toast.error('All 7 days cannot be selected as weekends.');
      return;
    }
    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          phone: formPhone,
          image: formImage,
          employeeType: formType,
          baseSalary: computedBaseSalary,
          weekendDays: formWeekendDays,
          allowedAbsents: formAllowedAbsents,
          absentDeductionRate: formAbsentDeductionRate,
          basicSalary: formBasicSalary ? Number(formBasicSalary) : 0,
          allowance: formAllowance,
          deduction: formDeduction
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Employee added successfully',
          confirmButtonColor: '#eab308'
        });
        setShowAddModal(false);
        // Reset form
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormPhone('');
        setFormImage('');
        setFormType('monthly');
        setFormBasicSalary('');
        setFormAllowance(0);
        setFormDeduction(0);
        setFormWeekendDays(['Friday']);
        setFormAllowedAbsents(1);
        setFormAbsentDeductionRate(0);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to add employee');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formWeekendDays && formWeekendDays.length >= 7) {
      toast.error('All 7 days cannot be selected as weekends.');
      return;
    }
    try {
      const response = await fetch(`/api/admin/employees/${editingEmployeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          image: formImage,
          employeeType: formType,
          baseSalary: formType === 'monthly' ? computedBaseSalary : 0,
          weekendDays: formWeekendDays,
          allowedAbsents: formAllowedAbsents,
          absentDeductionRate: formAbsentDeductionRate,
          basicSalary: formBasicSalary ? Number(formBasicSalary) : 0,
          allowance: formAllowance,
          deduction: formDeduction
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Employee updated successfully',
          confirmButtonColor: '#eab308'
        });
        setShowEditModal(false);
        setEditingEmployeeId(null);
        // Reset form
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormPhone('');
        setFormImage('');
        setFormType('monthly');
        setFormBasicSalary('');
        setFormAllowance(0);
        setFormDeduction(0);
        setFormWeekendDays(['Friday']);
        setFormAllowedAbsents(1);
        setFormAbsentDeductionRate(0);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to update employee');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleDiscontinueEmployee = async (id: string) => {
    const result = await Swal.fire({
      title: 'Discontinue Employee?',
      text: 'This will stop their salary calculation and set their status to discontinued.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Discontinue',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/employees/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Discontinued',
            text: 'Employee status changed to discontinued.',
            confirmButtonColor: '#eab308'
          });
          fetchData();
        } else {
          toast.error('Failed to change status');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleReAppointEmployee = async (id: string) => {
    const result = await Swal.fire({
      title: 'Re-appoint Employee?',
      text: 'This will re-appoint the employee and set their status back to active.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Re-appoint',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' })
        });
        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Re-appointed',
            text: 'Employee is now active again.',
            confirmButtonColor: '#eab308'
          });
          fetchData();
        } else {
          toast.error('Failed to activate employee');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-black text-zinc-950">{t("employees.title")}</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">{t("employees.subtitle")}</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 h-10 text-xs md:text-sm md:h-11 px-4 rounded-none w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4" /> {t("employees.add_employee")}
        </Button>
      </div>

      <div className="!mt-[1px] md:!mt-4 px-0 md:px-0">
        <EmployeeTabs />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-2xl bg-card">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium">{t("employees.no_employees_found")}</p>
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block !mt-4 px-[1px] md:px-0">
            <Card className="border border-zinc-200 shadow-sm bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">{t("employees.name")}</th>
                        <th className="p-4">{t("employees.type")}</th>
                        <th className="p-4">{t("employees.compensation")}</th>
                        <th className="p-4">{t("employees.joined_date")}</th>
                        <th className="p-4">{t("employees.appointment_letter")}</th>
                        <th className="p-4 text-right">{t("employees.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp._id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 font-bold text-zinc-900">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-zinc-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200">
                                {emp.image ? (
                                  <Image src={emp.image} alt={emp.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                                ) : (
                                  <Users className="h-5 w-5 text-zinc-400" />
                                )}
                              </div>
                              <div>
                                <div>{emp.name}</div>
                                <div className="text-xs text-zinc-400 font-normal">{emp.email}</div>
                                {emp.phone && <div className="text-[11px] text-zinc-400 font-normal">{emp.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <Badge variant={emp.employeeType === 'monthly' ? 'default' : 'secondary'} className="font-bold w-fit">
                                {emp.employeeType === 'monthly' ? t("employees.permanent") : t("employees.contractual")}
                              </Badge>
                              {emp.status === 'discontinued' ? (
                                <Badge variant="destructive" className="font-bold text-[10px] w-fit">
                                  {t("employees.discontinued")}
                                </Badge>
                              ) : (
                                <Badge className="font-bold text-[10px] bg-green-600 hover:bg-green-700 text-white w-fit">
                                  {t("employees.active")}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-black text-zinc-950">
                            {emp.employeeType === 'monthly' ? (
                              <div>
                                <div>৳{emp.baseSalary?.toLocaleString()} / mo</div>
                                <div className="text-[11px] text-zinc-500 font-normal mt-0.5">{t("employees.paid")}: ৳{emp.totalEarned?.toLocaleString() || 0}</div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-zinc-500 text-xs block">{t("employees.task_based")}</span>
                                <span className="text-[11px] text-zinc-500 font-normal mt-0.5 block">{t("employees.paid")}: ৳{emp.totalEarned?.toLocaleString() || 0}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-zinc-500">
                            {new Date(emp.joinedDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                          </td>
                          <td className="p-4">
                            <a 
                              href={`/appointment-letter/${emp._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-bold hover:underline inline-flex items-center gap-1 text-xs"
                            >
                              <FileText className="h-3.5 w-3.5" /> {t("employees.view_letter")}
                            </a>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(emp)} className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" /> {t("employees.edit_details")}
                                </DropdownMenuItem>
                                {emp.status !== 'discontinued' ? (
                                  <DropdownMenuItem onClick={() => handleDiscontinueEmployee(emp._id)} className="text-red-600 hover:text-red-700 cursor-pointer">
                                    <Trash2 className="h-4 w-4 mr-2" /> {t("employees.discontinue_staff")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleReAppointEmployee(emp._id)} className="text-green-600 hover:text-green-700 cursor-pointer">
                                    <UserPlus className="h-4 w-4 mr-2" /> {t("employees.reappoint_staff")}
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
              </CardContent>
            </Card>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-3 px-[1px] py-1 bg-zinc-50/55 !mt-[1px] md:!mt-4">
            {employees.map((emp) => (
              <div key={emp._id} className="relative p-4 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 animate-in fade-in duration-200">
                {/* Dropdown Menu at Top Right */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full flex items-center justify-center">
                        <MoreVertical className="h-4.5 w-4.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(emp)} className="cursor-pointer">
                        <Edit className="h-4 w-4 mr-2" /> {t("employees.edit_details")}
                      </DropdownMenuItem>
                      {emp.status !== 'discontinued' ? (
                        <DropdownMenuItem onClick={() => handleDiscontinueEmployee(emp._id)} className="text-red-600 hover:text-red-700 cursor-pointer">
                          <Trash2 className="h-4 w-4 mr-2" /> {t("employees.discontinue_staff")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleReAppointEmployee(emp._id)} className="text-green-600 hover:text-green-700 cursor-pointer">
                          <UserPlus className="h-4 w-4 mr-2" /> {t("employees.reappoint_staff")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Header info */}
                <div className="flex items-start gap-3 pr-8">
                  <div className="h-11 w-11 rounded-full bg-zinc-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200">
                    {emp.image ? (
                      <Image src={emp.image} alt={emp.name} width={44} height={44} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <Users className="h-5.5 w-5.5 text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-base text-zinc-900 truncate">{emp.name}</h4>
                    <p className="text-xs text-zinc-500 truncate">{emp.email}</p>
                    {emp.phone && <p className="text-xs text-zinc-500 mt-0.5">{emp.phone}</p>}
                  </div>
                </div>

                {/* Detail Rows */}
                <div className="space-y-2 text-sm md:text-xs pt-2 border-t border-border/30">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-500">{t("employees.employment_type")}:</span>
                    <Badge variant={emp.employeeType === 'monthly' ? 'default' : 'secondary'} className="font-bold text-xs px-2 py-0.5">
                      {emp.employeeType === 'monthly' ? t("employees.permanent") : t("employees.contractual")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                    <span className="text-zinc-500">{t("employees.status")}:</span>
                    <Badge variant={emp.status === 'discontinued' ? 'destructive' : 'default'} className="font-bold text-xs px-2 py-0.5">
                      {emp.status === 'discontinued' ? t("employees.discontinued") : t("employees.active")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                    <span className="text-zinc-500">{t("employees.compensation")}:</span>
                    <span className="font-semibold text-zinc-900">
                      {emp.employeeType === 'monthly' ? `৳${emp.baseSalary?.toLocaleString()} / mo` : t("employees.task_based")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                    <span className="text-zinc-500">{t("employees.total_paid")}:</span>
                    <span className="font-bold text-zinc-700">
                      ৳{emp.totalEarned?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                    <span className="text-zinc-500">{t("employees.joined_date")}:</span>
                    <span className="text-zinc-700 font-medium">{new Date(emp.joinedDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                    <span className="text-zinc-500">{t("employees.appointment_letter")}:</span>
                    <a 
                      href={`/appointment-letter/${emp._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" /> {t("employees.view_letter")}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900">{t("employees.register_new_staff")}</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">{t("employees.register_subtitle")}</CardDescription>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleAddEmployee} className="flex-1 overflow-y-auto flex flex-col">
              <CardContent className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="empName">{t("employees.full_name")}</Label>
                    <Input 
                      id="empName"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="empEmail">{t("employees.email_address")}</Label>
                    <Input 
                      id="empEmail"
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="empPassword">{t("employees.password")}</Label>
                    <Input 
                      id="empPassword"
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="empPhone">{t("employees.phone_number")}</Label>
                    <Input 
                      id="empPhone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 01700000000"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Profile Picture</Label>
                    <ImageUpload 
                      value={formImage} 
                      onUpload={setFormImage} 
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="empType">{t("employees.employment_type")}</Label>
                    <Select 
                      onValueChange={(val: any) => setFormType(val)} 
                      value={formType}
                    >
                      <SelectTrigger id="empType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Permanent (Monthly Salary)</SelectItem>
                        <SelectItem value="task-based">Contractual (Task Commission)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formType === 'monthly' && (
                  <div className="border-t border-zinc-100 pt-4 mt-2 space-y-4 animate-in fade-in duration-200">
                    <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-950 leading-relaxed">
                        <strong>{t("employees.permanent_rules")}</strong> {t("employees.permanent_rules_desc")}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="allowedAbsents">{t("employees.allowed_monthly_absents")}</Label>
                        <Input
                          id="allowedAbsents"
                          type="number"
                          required
                          value={formAllowedAbsents}
                          onChange={(e) => setFormAllowedAbsents(Number(e.target.value))}
                          placeholder="e.g. 1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="deductionRate">{t("employees.absent_deduction_rate")}</Label>
                        <Input
                          id="deductionRate"
                          type="number"
                          required
                          value={formAbsentDeductionRate}
                          onChange={(e) => setFormAbsentDeductionRate(Number(e.target.value))}
                          placeholder="e.g. 0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-emerald-850">{t("employees.salary_structure")}</Label>
                      <div className="grid grid-cols-3 gap-3 bg-zinc-50/50 p-3 rounded-lg border border-zinc-200">
                        <div className="space-y-1">
                          <Label htmlFor="basicSal" className="text-[11px] text-zinc-500">{t("employees.basic")}</Label>
                          <Input
                            id="basicSal"
                            type="number"
                            required
                            value={formBasicSalary}
                            onChange={(e) => setFormBasicSalary(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="allowanceSal" className="text-[11px] text-zinc-500">{t("employees.allowance")}</Label>
                          <Input
                            id="allowanceSal"
                            type="number"
                            value={formAllowance}
                            onChange={(e) => setFormAllowance(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="deductionSal" className="text-[11px] text-zinc-500">{t("employees.deduction")}</Label>
                          <Input
                            id="deductionSal"
                            type="number"
                            value={formDeduction}
                            onChange={(e) => setFormDeduction(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {computedBaseSalary > 0 && (
                        <p className="text-xs font-bold text-zinc-700 text-right mt-1.5">
                          {t("employees.calculated_base_salary")} <span className="text-emerald-700 font-extrabold">৳{computedBaseSalary.toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>{t("employees.cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">{t("employees.register_employee")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900">{t("employees.edit_staff_details")}</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">{t("employees.edit_staff_subtitle")}</CardDescription>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleEditEmployee} className="flex-1 overflow-y-auto flex flex-col">
              <CardContent className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editEmpName">{t("employees.full_name")}</Label>
                    <Input 
                      id="editEmpName"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editEmpEmail">{t("employees.email_read_only")}</Label>
                    <Input 
                      id="editEmpEmail"
                      type="email"
                      disabled
                      value={formEmail}
                      className="bg-zinc-50 border-zinc-250 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editEmpPhone">{t("employees.phone_number")}</Label>
                    <Input 
                      id="editEmpPhone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 01700000000"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editEmpType">{t("employees.employment_type")}</Label>
                    <Select 
                      onValueChange={(val: any) => setFormType(val)} 
                      value={formType}
                    >
                      <SelectTrigger id="editEmpType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{t("employees.permanent_monthly")}</SelectItem>
                        <SelectItem value="task-based">{t("employees.contractual_task")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>{t("employees.profile_picture")}</Label>
                    <ImageUpload 
                      value={formImage} 
                      onUpload={setFormImage} 
                    />
                  </div>
                </div>

                {formType === 'monthly' && (
                  <div className="border-t border-zinc-100 pt-4 mt-2 space-y-4 animate-in fade-in duration-200">
                    <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-950 leading-relaxed">
                        <strong>{t("employees.permanent_rules")}</strong> {t("employees.permanent_rules_desc")}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editAllowedAbsents">{t("employees.allowed_monthly_absents")}</Label>
                        <Input
                          id="editAllowedAbsents"
                          type="number"
                          required
                          value={formAllowedAbsents}
                          onChange={(e) => setFormAllowedAbsents(Number(e.target.value))}
                          placeholder="e.g. 1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editDeductionRate">{t("employees.absent_deduction_rate")}</Label>
                        <Input
                          id="editDeductionRate"
                          type="number"
                          required
                          value={formAbsentDeductionRate}
                          onChange={(e) => setFormAbsentDeductionRate(Number(e.target.value))}
                          placeholder="e.g. 0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-emerald-850">{t("employees.salary_structure")}</Label>
                      <div className="grid grid-cols-3 gap-3 bg-zinc-50/50 p-3 rounded-lg border border-zinc-200">
                        <div className="space-y-1">
                          <Label htmlFor="editBasicSal" className="text-[11px] text-zinc-500">{t("employees.basic")}</Label>
                          <Input
                            id="editBasicSal"
                            type="number"
                            required
                            value={formBasicSalary}
                            onChange={(e) => setFormBasicSalary(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="editAllowanceSal" className="text-[11px] text-zinc-500">{t("employees.allowance")}</Label>
                          <Input
                            id="editAllowanceSal"
                            type="number"
                            value={formAllowance}
                            onChange={(e) => setFormAllowance(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="editDeductionSal" className="text-[11px] text-zinc-500">{t("employees.deduction")}</Label>
                          <Input
                            id="editDeductionSal"
                            type="number"
                            value={formDeduction}
                            onChange={(e) => setFormDeduction(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {computedBaseSalary > 0 && (
                        <p className="text-xs font-bold text-zinc-700 text-right mt-1.5">
                          {t("employees.calculated_base_salary")} <span className="text-emerald-700 font-extrabold">৳{computedBaseSalary.toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>{t("employees.cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">{t("employees.save_changes")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

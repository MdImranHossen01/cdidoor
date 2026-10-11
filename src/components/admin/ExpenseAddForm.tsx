'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Printer, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

const expenseSchema = z.object({
  type: z.literal('expense'),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ message: 'Amount is required' }).min(1, 'Amount must be at least 1')
  ),
  category: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  title: z.string().optional(),
  employee: z.string().optional(),
  accountCode: z.string().min(1, 'Account is required'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseAddFormProps {
  initialData?: any;
  onSuccess: (wasEdit: boolean) => void;
}

export function ExpenseAddForm({ initialData, onSuccess }: ExpenseAddFormProps) {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [isPaidAmountTouched, setIsPaidAmountTouched] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      type: 'expense',
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : ('' as any),
      category: initialData?.category || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
      employee: initialData?.employee?._id || initialData?.employee || undefined,
      accountCode: initialData?.accountCode || '',
    },
  });

  useEffect(() => {
    if (initialData?.amount !== undefined) {
      setPaidAmount(String(initialData.amount));
    }
  }, [initialData]);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/employees')
        .then((res) => res.json())
        .then((data) => setEmployees(data.employees || []))
        .catch((err) => console.error('Error fetching employees:', err));
    }

    fetch('/api/admin/transaction-categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.filter((c) => c.type === 'expense'));
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));

    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (!initialData && !form.getValues('accountCode')) {
            const cashAcc = data.find((a) => a.name.toLowerCase().includes('cash')) || data[0];
            if (cashAcc) form.setValue('accountCode', cashAcc.code);
          }
        }
      })
      .catch((err) => console.error('Error fetching accounts:', err));
  }, [isAdmin, initialData, form]);

  const selectedCategory = form.watch('category');
  const selectedEmployeeId = form.watch('employee');

  useEffect(() => {
    if (!initialData) {
      if (['Staff Salary', 'Wages'].includes(selectedCategory) && selectedEmployeeId && selectedEmployeeId !== 'none') {
        const emp = employees.find((e) => e._id === selectedEmployeeId);
        if (emp) {
          const prefix = selectedCategory === 'Staff Salary' ? 'Staff salary' : 'Wages';
          form.setValue('title', `${prefix} paid to ${emp.name}`, { shouldValidate: true });
        }
      } else if (selectedCategory) {
        form.setValue('title', selectedCategory, { shouldValidate: true });
      }
    }
  }, [selectedCategory, selectedEmployeeId, employees, form, initialData]);

  const onSubmit = async (values: ExpenseFormValues) => {
    const selectedAcc = accounts.find((a) => a.code === values.accountCode);
    if (selectedAcc) {
      const isEditCurrentAccount = initialData && initialData.accountCode === values.accountCode && initialData.type === 'expense';
      const effectiveBalance = selectedAcc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
      if (values.amount > effectiveBalance) {
        toast.error(`Insufficient balance in ${selectedAcc.name}. Available: ৳${effectiveBalance.toLocaleString()}`);
        return;
      }
    }

    setLoading(true);
    try {
      const url = initialData ? `/api/admin/expenses-incomes/${initialData._id}` : '/api/admin/expenses-incomes';
      const method = initialData ? 'PUT' : 'POST';

      const payload = {
        ...values,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(t("messages.saved_successfully") || `Expense ${initialData ? 'updated' : 'created'} successfully`);
        if (initialData) {
          onSuccess(true);
        } else {
          onSuccess(false);
        }
      } else {
        toast.error(t("messages.failed_to_save") || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(t("messages.something_went_wrong") || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    form.handleSubmit(async (values) => {
      await onSubmit(values);
      setTimeout(() => {
        window.print();
      }, 500);
    })();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        {/* Strict 2-Column Grid on all screen sizes */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[13px] font-bold text-slate-800">
                  {t("expenses.category") || "ক্যাটাগরি"}
                  <span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] bg-white px-2.5 focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745]">
                      <SelectValue placeholder={t("expenses.select") || "সিলেক্ট..."}>
                        {field.value ? field.value : (t("expenses.select") || "সিলেক্ট...")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs sm:text-sm">No categories found</SelectItem>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat.name} className="text-xs sm:text-sm">{cat.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Staff */}
          <FormField
            control={form.control}
            name="employee"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[13px] font-bold text-slate-800">
                  {t("expenses.staff") || "স্টাফ"}
                </FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] bg-white px-2.5 focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745]">
                      <SelectValue placeholder={t("expenses.select_staff") || "স্টাফ সিলেক্ট করুন..."}>
                        {field.value && field.value !== 'none' 
                          ? employees.find((e) => e._id === field.value)?.name 
                          : (t("expenses.select_staff") || "স্টাফ সিলেক্ট করুন...")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs sm:text-sm">-- None --</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id} className="text-xs sm:text-sm">{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[13px] font-bold text-slate-800">
                  {t("expenses.date") || "তারিখ"}
                  <span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] px-2.5 bg-white text-slate-800 font-medium focus-visible:ring-1 focus-visible:ring-[#28a745] focus-visible:border-[#28a745]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Total Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[13px] font-bold text-slate-800">
                  {t("expenses.total") || "মোট"}
                  <span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={t("expenses.amount") || "এমাউন্ট"}
                    className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] px-2.5 bg-white focus-visible:ring-1 focus-visible:ring-[#28a745] focus-visible:border-[#28a745]"
                    value={field.value === undefined ? '' : field.value} 
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? '' : Number(val));
                      if (!isPaidAmountTouched) {
                        setPaidAmount(val);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Note - Spans 2 Columns */}
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[13px] font-bold text-slate-800">
                    {t("expenses.note") || "নোট"}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t("expenses.note") || "নোট"}
                      className="w-full min-h-[58px] h-[58px] text-[13px] p-2 border-slate-300 rounded-[4px] bg-white resize-none focus-visible:ring-1 focus-visible:ring-[#28a745] focus-visible:border-[#28a745]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Add Payment Subheading */}
        <div className="pt-1 pb-0.5">
          <div className="text-[13px] font-bold text-slate-800">
            {t("expenses.add_payment") || "অ্যাড পেমেন্ট"}
          </div>
        </div>

        {/* Payment Row - Strict 2-Column Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          
          {/* Paid Amount */}
          <div className="space-y-0.5">
            <Label className="text-[13px] font-bold text-slate-800">
              {t("expenses.paid_amount") || "পেইড এমাউন্ট"}
            </Label>
            <Input 
              type="number" 
              placeholder={t("expenses.amount") || "এমাউন্ট"}
              value={paidAmount}
              onChange={(e) => {
                setIsPaidAmountTouched(true);
                setPaidAmount(e.target.value);
              }}
              className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] px-2.5 bg-white focus-visible:ring-1 focus-visible:ring-[#28a745] focus-visible:border-[#28a745]"
            />
          </div>

          {/* Payment Account */}
          <FormField
            control={form.control}
            name="accountCode"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-[13px] font-bold text-slate-800">
                  {t("expenses.payment_account") || "পেমেন্ট অ্যাকাউন্ট"}
                  <span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full h-[35px] text-[13px] border-slate-300 rounded-[4px] bg-white px-2.5 focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745]">
                      <SelectValue placeholder={t("expenses.select") || "সিলেক্ট..."}>
                        {field.value
                          ? (() => {
                              const acc = accounts.find((a) => a.code === field.value);
                              if (!acc) return field.value;
                              const isEditCurrentAccount = initialData && initialData.accountCode === acc.code && initialData.type === 'expense';
                              const effectiveBalance = acc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
                              return `${acc.name} (${effectiveBalance.toLocaleString()})`;
                            })()
                          : (t("expenses.select") || "সিলেক্ট...")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((acc) => {
                      const isEditCurrentAccount = initialData && initialData.accountCode === acc.code && initialData.type === 'expense';
                      const effectiveBalance = acc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
                      const hasInsufficientBalance = form.watch('amount') > effectiveBalance;
                      return (
                        <SelectItem 
                          key={acc.code} 
                          value={acc.code} 
                          disabled={hasInsufficientBalance}
                          className="text-xs sm:text-sm"
                        >
                          {acc.name} ({effectiveBalance.toLocaleString()}) {hasInsufficientBalance && " - Insufficient Balance"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2.5 pt-3 pb-0.5">
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-[#28a745] hover:bg-[#218838] text-white h-[34px] px-5 rounded-full font-medium text-xs sm:text-sm flex items-center justify-center shadow-sm"
          >
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {t("expenses.save") || "সেভ"}
          </Button>
          <Button 
            type="button" 
            onClick={handlePrint}
            disabled={loading}
            className="bg-[#007bff] hover:bg-[#0069d9] text-white h-[34px] px-5 rounded-full font-medium text-xs sm:text-sm flex items-center justify-center shadow-sm"
          >
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}
            {t("expenses.save_print") || "সেভ ও প্রিন্ট"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

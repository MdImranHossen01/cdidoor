'use client';

import { useState, useEffect, useRef } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ message: 'Amount is required' }).min(1, 'Amount must be at least 1')
  ),
  category: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required').refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date format' }),
  description: z.string().optional(),
  showroom: z.string().optional(),
  employee: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: any;
  onSuccess: (wasEdit: boolean) => void;
}

export function TransactionForm({ initialData, onSuccess }: TransactionFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const userRole = (session?.user as any)?.role;
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

  // Refs for keyboard navigation
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const employeeRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: initialData?.type || 'expense',
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : '',
      category: initialData?.category || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
      showroom: initialData?.showroom || undefined,
      employee: initialData?.employee?._id || initialData?.employee || undefined,
    },
  });

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/showrooms')
        .then((res) => res.json())
        .then((data) => setShowrooms(data.showrooms || []))
        .catch((err) => console.error('Error fetching showrooms:', err));

      fetch('/api/admin/employees')
        .then((res) => res.json())
        .then((data) => setEmployees(data.employees || []))
        .catch((err) => console.error('Error fetching employees:', err));
    }

    fetch('/api/admin/transaction-categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, [isAdmin]);

  const selectedType = form.watch('type');
  const selectedCategory = form.watch('category');
  const selectedEmployeeId = form.watch('employee');
  const filteredCategories = categories.filter(c => c.type === selectedType);

  useEffect(() => {
    if (!initialData) {
      if (['Staff Salary', 'Wages'].includes(selectedCategory) && selectedEmployeeId && selectedEmployeeId !== 'none') {
        const emp = employees.find(e => e._id === selectedEmployeeId);
        if (emp) {
          const prefix = selectedCategory === 'Staff Salary' ? 'Staff salary' : 'Wages';
          form.setValue('title', `${prefix} paid to ${emp.name}`, { shouldValidate: true });
        }
      } else if (selectedCategory) {
        form.setValue('title', selectedCategory, { shouldValidate: true });
      }
    }
  }, [selectedCategory, selectedEmployeeId, employees, form, initialData]);

  const onSubmit = async (values: TransactionFormValues) => {
    setLoading(true);
    try {
      const url = initialData ? `/api/admin/expenses-incomes/${initialData._id}` : '/api/admin/expenses-incomes';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(`Transaction ${initialData ? 'updated' : 'created'} successfully`);
        if (initialData) {
          onSuccess(true);
        } else {
          form.reset({
            type: form.getValues('type'),
            title: '',
            amount: '' as any,
            category: '',
            date: form.getValues('date'),
            description: '',
            showroom: undefined,
            employee: undefined,
          });
          onSuccess(false);
          setTimeout(() => {
            categoryRef.current?.focus();
          }, 50);
        }
      } else {
        toast.error('Failed to save transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      categoryRef.current?.focus();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      amountRef.current?.focus();
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (['Staff Salary', 'Wages'].includes(selectedCategory)) {
        employeeRef.current?.focus();
      } else {
        titleRef.current?.focus();
      }
    }
  };

  const handleEmployeeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      descriptionRef.current?.focus();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitBtnRef.current?.click();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5 md:space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Date</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleDateKeyDown}
                  type="date" 
                  className="h-8 md:h-10 text-xs md:text-sm"
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    dateRef.current = e;
                  }}
                  autoFocus
                />
              </FormControl>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs md:text-sm">Type</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex items-center gap-6 pt-0.5"
                >
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="income" id="type-income" className="h-3.5 w-3.5" />
                    <Label htmlFor="type-income" className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer select-none text-xs md:text-sm">
                      Income
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="expense" id="type-expense" className="h-3.5 w-3.5" />
                    <Label htmlFor="type-expense" className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer select-none text-xs md:text-sm">
                      Expense
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Category</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger 
                    className="h-8 md:h-10 text-xs md:text-sm" 
                    ref={categoryRef}
                    onKeyDown={handleCategoryKeyDown}
                  >
                    <SelectValue placeholder="Select Category">
                      {field.value ? field.value : "Select Category"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="none" disabled className="text-xs md:text-sm">
                      No categories found
                    </SelectItem>
                  ) : (
                    filteredCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat.name} className="text-xs md:text-sm">
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        {['Staff Salary', 'Wages'].includes(selectedCategory) && (
          <FormField
            control={form.control}
            name="employee"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs md:text-sm">Employee</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                  <SelectTrigger 
                    className="h-8 md:h-10 text-xs md:text-sm"
                    ref={employeeRef}
                    onKeyDown={handleEmployeeKeyDown}
                  >
                    <SelectValue placeholder="Select Employee">
                        {field.value && field.value !== 'none' 
                          ? employees.find(e => e._id === field.value)?.name 
                          : "Select Employee"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.filter(emp => selectedCategory === 'Staff Salary' ? emp.employeeType === 'monthly' : emp.employeeType === 'task-based').length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs md:text-sm">
                        No employees found
                      </SelectItem>
                    ) : (
                      employees.filter(emp => selectedCategory === 'Staff Salary' ? emp.employeeType === 'monthly' : emp.employeeType === 'task-based').map((emp) => (
                        <SelectItem key={emp._id} value={emp._id} className="text-xs md:text-sm">
                          {emp.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px] md:text-xs" />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Title</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleTitleKeyDown}
                  placeholder={selectedType === 'expense' ? 'e.g. Facebook Ads April' : 'e.g. Client Project Payment'} 
                  className="h-8 md:h-10 text-xs md:text-sm"
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    titleRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Amount (Tk)</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleAmountKeyDown}
                  type="number" 
                  placeholder="Enter amount"
                  className="h-8 md:h-10 text-xs md:text-sm"
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                  ref={(e) => {
                    field.ref(e);
                    amountRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        {isAdmin && (
          <FormField
            control={form.control}
            name="showroom"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs md:text-sm">Showroom (Optional)</FormLabel>
                <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}>
                  <FormControl>
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="Select Showroom">
                        {field.value && field.value !== 'none'
                          ? showrooms.find(s => s._id === field.value)?.name
                          : "None (Global)"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs md:text-sm">None (Global)</SelectItem>
                    {showrooms.map((showroom) => (
                      <SelectItem key={showroom._id} value={showroom._id} className="text-xs md:text-sm">
                        {showroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px] md:text-xs" />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Description</FormLabel>
              <FormControl>
                <Textarea 
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Additional details..." 
                  className="min-h-[50px] md:min-h-[80px] text-xs md:text-sm py-1.5 md:py-2"
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    descriptionRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
        <Button ref={submitBtnRef} type="submit" className="w-full h-8 md:h-10 text-xs md:text-sm mt-1" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {initialData ? 'Update' : 'Create'} {selectedType === 'expense' ? 'Expense' : 'Income'}
        </Button>
      </form>
    </Form>
  );
}

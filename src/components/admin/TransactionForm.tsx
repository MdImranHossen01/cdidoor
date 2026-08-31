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
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

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
  accountCode: z.string().min(1, 'Account is required').default('CASH'),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: any;
  onSuccess: (wasEdit: boolean) => void;
}

export function TransactionForm({ initialData, onSuccess }: TransactionFormProps) {
  const searchParams = useSearchParams();
  const presetType = searchParams.get('type') as 'expense' | 'income' | null;
  const presetAccountCode = searchParams.get('accountCode') as 'CASH' | null;
  const presetCategory = searchParams.get('category') || '';
  const presetTab = searchParams.get('tab') as 'transaction' | 'transfer' | null;

  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loanProviders, setLoanProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const loanProviderRef = useRef<HTMLButtonElement>(null);

  const [dueCustomers, setDueCustomers] = useState<any[]>([]);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  const userRole = (session?.user as any)?.role;
  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const isSuperAdmin = userRole === 'super_admin';
  const { t } = useLanguage();

  // Tabs state
  const [activeTab, setActiveTab] = useState<'transaction' | 'transfer'>(presetTab || 'transaction');

  // Transfer state
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromAccountCode, setFromAccountCode] = useState<string>('CASH');
  const [toAccountCode, setToAccountCode] = useState<string>('CASH');
  const [transferTitle, setTransferTitle] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transferSubmitLoading, setTransferSubmitLoading] = useState(false);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    const amtVal = parseFloat(transferAmount) || 0;
    if (amtVal <= 0) {
      toast.error('Please enter a positive transfer amount.');
      return;
    }
    if (fromAccountCode === toAccountCode) {
      toast.error('From and To accounts must be different.');
      return;
    }
    const fromAcc = accounts.find(a => a.code === fromAccountCode);
    if (fromAcc && amtVal > fromAcc.currentBalance) {
      toast.error(`Insufficient balance in ${fromAcc.name}. Available: ৳${fromAcc.currentBalance.toLocaleString()}`);
      return;
    }

    setTransferSubmitLoading(true);
    try {
      const payload = {
        entryType: 'transfer',
        amount: amtVal,
        description: transferTitle,
        date: transferDate,
        fromAccountCode,
        toAccountCode,
      };

      const res = await fetch('/api/admin/ledger/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Transfer failed');
      }

      toast.success('Account transfer recorded successfully!');
      setTransferTitle('');
      setTransferAmount('');
      onSuccess(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transfer');
    } finally {
      setTransferSubmitLoading(false);
    }
  };

  // Refs for keyboard navigation
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const employeeRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const showroomRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const customerRef = useRef<HTMLButtonElement>(null);
  const supplierRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: initialData?.type || presetType || 'expense',
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : '',
      category: initialData?.category || presetCategory || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
      showroom: initialData?.showroom || undefined,
      employee: initialData?.employee?._id || initialData?.employee || undefined,
      accountCode: initialData?.accountCode || presetAccountCode || 'CASH',
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

    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .catch((err) => console.error('Error fetching accounts:', err));

    fetch('/api/admin/loans/providers')
      .then((res) => res.json())
      .then((data) => {
        const providers = data || [];
        setLoanProviders(providers);
        if (initialData && ['Loan Paid', 'Profit/Interest'].includes(initialData.category)) {
          const match = providers.find((p: any) => initialData.title.endsWith(p.name));
          if (match) {
            setSelectedProviderId(match._id);
          }
        }
      })
      .catch((err) => console.error('Error fetching loan providers:', err));

    fetch('/api/admin/customers/due')
      .then((res) => res.json())
      .then((data) => {
        const customers = data.customers || [];
        setDueCustomers(customers);
        if (initialData && initialData.category === 'Account receivable') {
          const match = customers.find((c: any) => initialData.title.endsWith(c.name));
          if (match) {
            setSelectedCustomerPhone(match.phone);
          }
        }
      })
      .catch((err) => console.error('Error fetching due customers:', err));

    fetch('/api/admin/suppliers')
      .then((res) => res.json())
      .then((data) => {
        const suppliersList = data || [];
        setSuppliers(suppliersList);
        if (initialData && initialData.category === 'Account payable') {
          const match = suppliersList.find((s: any) => initialData.title.endsWith(s.name) || initialData.title.endsWith(s.companyName));
          if (match) {
            setSelectedSupplierId(match._id);
          }
        }
      })
      .catch((err) => console.error('Error fetching suppliers:', err));
  }, [isAdmin, initialData]);

  const selectedType = form.watch('type');
  const selectedCategory = form.watch('category');
  const selectedEmployeeId = form.watch('employee');
  const selectedAmount = Number(form.watch('amount')) || 0;
  const filteredCategories = categories.filter(c => c.type === selectedType);

  useEffect(() => {
    if (!initialData) {
      if (['Staff Salary', 'Wages'].includes(selectedCategory) && selectedEmployeeId && selectedEmployeeId !== 'none') {
        const emp = employees.find(e => e._id === selectedEmployeeId);
        if (emp) {
          const prefix = selectedCategory === 'Staff Salary' ? 'Staff salary' : 'Wages';
          form.setValue('title', `${prefix} paid to ${emp.name}`, { shouldValidate: true });
        }
      } else if (['Loan Paid', 'Profit/Interest'].includes(selectedCategory) && selectedProviderId) {
        const provider = loanProviders.find(p => p._id === selectedProviderId);
        if (provider) {
          const prefix = selectedCategory === 'Loan Paid' ? 'Loan paid to' : 'Interest/profit paid to';
          form.setValue('title', `${prefix} ${provider.name}`, { shouldValidate: true });
        }
      } else if (selectedCategory === 'Account receivable' && selectedCustomerPhone) {
        const customer = dueCustomers.find(c => c.phone === selectedCustomerPhone);
        if (customer) {
          form.setValue('title', `Account receivable from ${customer.name}`, { shouldValidate: true });
        }
      } else if (selectedCategory === 'Account payable' && selectedSupplierId) {
        const supplier = suppliers.find(s => s._id === selectedSupplierId);
        if (supplier) {
          form.setValue('title', `Account payable to ${supplier.name || supplier.companyName}`, { shouldValidate: true });
        }
      } else if (selectedCategory) {
        form.setValue('title', selectedCategory, { shouldValidate: true });
      }
    }
  }, [selectedCategory, selectedEmployeeId, selectedProviderId, selectedCustomerPhone, selectedSupplierId, employees, loanProviders, dueCustomers, suppliers, form, initialData]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (values.type === 'expense') {
      const selectedAcc = accounts.find(a => a.code === values.accountCode);
      if (selectedAcc) {
        const isEditCurrentAccount = initialData && initialData.accountCode === values.accountCode && initialData.type === 'expense';
        const effectiveBalance = selectedAcc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
        if (values.amount > effectiveBalance) {
          toast.error(`Insufficient balance in ${selectedAcc.name}. Available: ৳${effectiveBalance.toLocaleString()}`);
          return;
        }
      }
    }
    setLoading(true);
    try {
      const url = initialData ? `/api/admin/expenses-incomes/${initialData._id}` : '/api/admin/expenses-incomes';
      const method = initialData ? 'PUT' : 'POST';

      const payload = {
        ...values,
        supplier: values.category === 'Account payable' ? selectedSupplierId : undefined,
        customerPhone: values.category === 'Account receivable' ? selectedCustomerPhone : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
            accountCode: 'CASH',
          });
          setSelectedCustomerPhone('');
          setSelectedSupplierId('');
          onSuccess(false);
          setTimeout(() => {
            dateRef.current?.focus();
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
      } else if (['Loan Paid', 'Profit/Interest'].includes(selectedCategory)) {
        loanProviderRef.current?.focus();
      } else if (selectedCategory === 'Account receivable') {
        customerRef.current?.focus();
      } else if (selectedCategory === 'Account payable') {
        supplierRef.current?.focus();
      } else {
        titleRef.current?.focus();
      }
    }
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
    }
  };

  const handleSupplierKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
    }
  };

  const handleLoanProviderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
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
      if (isAdmin && showrooms.length > 0) {
        showroomRef.current?.focus();
      } else {
        accountRef.current?.focus();
      }
    }
  };

  const handleShowroomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      accountRef.current?.focus();
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
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
    <div className="space-y-4">
      {/* Custom Tabs */}
      {isSuperAdmin && !initialData && (
        <div className="flex border-b border-muted">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'transaction'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('transaction')}
          >
            {t("ledger.cash_in_out")}
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'transfer'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('transfer')}
          >
            {t("ledger.account_transfer")}
          </button>
        </div>
      )}

      {activeTab === 'transaction' ? (
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
        {['Loan Paid', 'Profit/Interest'].includes(selectedCategory) && (
          <div className="space-y-1">
            <Label className="text-xs md:text-sm">Loan Provider</Label>
            <Select value={selectedProviderId} onValueChange={(val) => setSelectedProviderId(val || '')}>
              <SelectTrigger 
                className="h-8 md:h-10 text-xs md:text-sm"
                ref={loanProviderRef}
                onKeyDown={handleLoanProviderKeyDown}
              >
                <SelectValue placeholder="Select Loan Provider">
                  {selectedProviderId ? loanProviders.find(p => p._id === selectedProviderId)?.name : "Select Loan Provider"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {loanProviders.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs md:text-sm">
                    No loan providers found
                  </SelectItem>
                ) : (
                  loanProviders.map((provider) => (
                    <SelectItem key={provider._id} value={provider._id} className="text-xs md:text-sm">
                      {provider.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCategory === 'Account receivable' && (
          <div className="space-y-1">
            <Label className="text-xs md:text-sm">Customer (Due)</Label>
            <Select value={selectedCustomerPhone} onValueChange={(val) => setSelectedCustomerPhone(val || '')}>
              <SelectTrigger 
                className="h-8 md:h-10 text-xs md:text-sm"
                ref={customerRef}
                onKeyDown={handleCustomerKeyDown}
              >
                <SelectValue placeholder="Select Customer">
                  {selectedCustomerPhone ? (() => {
                    const match = dueCustomers.find(c => c.phone === selectedCustomerPhone);
                    return match ? `${match.name} (Due: ৳${match.due})` : "Select Customer";
                  })() : "Select Customer"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dueCustomers.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs md:text-sm">
                    No customers with outstanding dues
                  </SelectItem>
                ) : (
                  dueCustomers.map((customer) => (
                    <SelectItem key={customer.phone} value={customer.phone} className="text-xs md:text-sm">
                      {customer.name} ({customer.phone}) - Due: ৳{customer.due}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCategory === 'Account payable' && (
          <div className="space-y-1">
            <Label className="text-xs md:text-sm">Supplier</Label>
            <Select value={selectedSupplierId} onValueChange={(val) => setSelectedSupplierId(val || '')}>
              <SelectTrigger 
                className="h-8 md:h-10 text-xs md:text-sm"
                ref={supplierRef}
                onKeyDown={handleSupplierKeyDown}
              >
                <SelectValue placeholder="Select Supplier">
                  {selectedSupplierId ? (() => {
                    const match = suppliers.find(s => s._id === selectedSupplierId);
                    return match ? `${match.name || match.companyName} (Due: ৳${match.currentBalance})` : "Select Supplier";
                  })() : "Select Supplier"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs md:text-sm">
                    No suppliers found
                  </SelectItem>
                ) : (
                  suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id} className="text-xs md:text-sm">
                      {supplier.name || supplier.companyName} ({supplier.phone}) - Due: ৳{supplier.currentBalance}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
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
        {isAdmin && showrooms.length > 0 && (
          <FormField
            control={form.control}
            name="showroom"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs md:text-sm">Showroom (Optional)</FormLabel>
                <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}>
                  <FormControl>
                    <SelectTrigger 
                      className="h-8 md:h-10 text-xs md:text-sm"
                      ref={showroomRef}
                      onKeyDown={handleShowroomKeyDown}
                    >
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
          name="accountCode"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs md:text-sm">Adjust Account</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger 
                    className="h-8 md:h-10 text-xs md:text-sm"
                    ref={accountRef}
                    onKeyDown={handleAccountKeyDown}
                  >
                    <SelectValue placeholder="Select Account">
                     {field.value
                       ? (() => {
                           const acc = accounts.find((a) => a.code === field.value);
                           if (!acc) return field.value;
                           const isEditCurrentAccount = initialData && initialData.accountCode === acc.code && initialData.type === 'expense';
                           const effectiveBalance = acc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
                           return `${acc.name} (৳${effectiveBalance.toLocaleString()})`;
                         })()
                       : "Select Account"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((acc) => {
                    const isEditCurrentAccount = initialData && initialData.accountCode === acc.code && initialData.type === 'expense';
                    const effectiveBalance = acc.currentBalance + (isEditCurrentAccount ? initialData.amount : 0);
                    const hasInsufficientBalance = selectedType === 'expense' && selectedAmount > effectiveBalance;
                    return (
                      <SelectItem 
                        key={acc.code} 
                        value={acc.code} 
                        disabled={hasInsufficientBalance}
                        className="text-xs md:text-sm"
                      >
                        {acc.name} (৳{effectiveBalance.toLocaleString()}) {hasInsufficientBalance && " - Insufficient Balance"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px] md:text-xs" />
            </FormItem>
          )}
        />
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
      ) : (
        <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="transferDate">{t("ledger.transaction_date")}</Label>
            <Input
              id="transferDate"
              type="date"
              className="h-8 md:h-10 text-xs md:text-sm"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromAcc">{t("ledger.from_account")}</Label>
              <Select
                value={fromAccountCode}
                onValueChange={(val: any) => {
                  setFromAccountCode(val);
                  if (val === toAccountCode) {
                    const nextAcc = accounts.find(a => a.code !== val);
                    setToAccountCode(nextAcc ? nextAcc.code : val);
                  }
                }}
              >
                <SelectTrigger id="fromAcc" className="h-8 md:h-10 text-xs md:text-sm">
                  <SelectValue>
                    {fromAccountCode ? (() => {
                      const acc = accounts.find(a => a.code === fromAccountCode);
                      return acc ? `${acc.name} (৳${acc.currentBalance.toLocaleString()})` : fromAccountCode;
                    })() : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => {
                    const transferAmtVal = parseFloat(transferAmount) || 0;
                    const hasInsufficient = transferAmtVal > acc.currentBalance;
                    return (
                      <SelectItem 
                        key={acc.code} 
                        value={acc.code} 
                        disabled={hasInsufficient}
                        className="text-xs md:text-sm"
                      >
                        {acc.name} (৳{acc.currentBalance.toLocaleString()}) {hasInsufficient && " - Insufficient Balance"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toAcc">{t("ledger.to_account")}</Label>
              <Select
                value={toAccountCode}
                onValueChange={(val: any) => {
                  setToAccountCode(val);
                  if (val === fromAccountCode) {
                    const nextAcc = accounts.find(a => a.code !== val);
                    setFromAccountCode(nextAcc ? nextAcc.code : val);
                  }
                }}
              >
                <SelectTrigger id="toAcc" className="h-8 md:h-10 text-xs md:text-sm">
                  <SelectValue>
                    {toAccountCode ? (() => {
                      const acc = accounts.find(a => a.code === toAccountCode);
                      return acc ? `${acc.name} (৳${acc.currentBalance.toLocaleString()})` : toAccountCode;
                    })() : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.code} value={acc.code} className="text-xs md:text-sm">
                      {acc.name} (৳{acc.currentBalance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transferTitle">{t("ledger.title_description")}</Label>
            <Input
              id="transferTitle"
              placeholder="e.g. Account Transfer"
              className="h-8 md:h-10 text-xs md:text-sm"
              value={transferTitle}
              onChange={(e) => setTransferTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transferAmt">{t("ledger.transfer_amount")}</Label>
            <Input
              id="transferAmt"
              type="number"
              min="1"
              placeholder="0.00"
              className="h-8 md:h-10 text-xs md:text-sm"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full h-8 md:h-10 text-xs md:text-sm mt-1" disabled={transferSubmitLoading}>
            {transferSubmitLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {t("ledger.log_transaction")}
          </Button>
        </form>
      )}
    </div>
  );
}

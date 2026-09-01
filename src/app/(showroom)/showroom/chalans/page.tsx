'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Plus,
  Trash2,
  Printer,
  Download,
  Search,
  FileText,
  Eye,
  MapPin,
  Phone,
  CalendarDays,
  Hash,
  ArrowRight,
  MoreHorizontal,
  Edit
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { useLanguage } from '@/contexts/LanguageContext';
import { divisions, bdDivisions, bdLocations } from '@/lib/bd-locations';

interface BillItemInput {
  name: string;
  quantity: number;
  price: number;
}

function ClientChalansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [chalans, setChalans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    };
  });
  const [filterByDate, setFilterByDate] = useState(true);

  const parsedPage = parseInt(searchParams.get('page') || '1');
  const initialPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const [settings, setSettings] = useState<any>(null);

  // Sync state changes to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    router.push(`/showroom/chalans?${params.toString()}`);
  }, [currentPage]);

  const isFirstMount = useRef(true);

  // Reset page when search term or dates change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.replace(`/showroom/chalans?${params.toString()}`);
  }, [searchTerm, filterByDate, dateFilter.from, dateFilter.to]);

  // Chalan detail view state
  const [selectedChalan, setSelectedChalan] = useState<any>(null);
  const [editingChalan, setEditingChalan] = useState<any>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDivision, setClientDivision] = useState('');
  const [clientDistrict, setClientDistrict] = useState('');
  const [clientThana, setClientThana] = useState('');
  const [clientArea, setClientArea] = useState('');
  const [areas, setAreas] = useState<any[]>([]);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', quantity: 1, price: 0 }
  ]);

  // Customer auto-suggestion state
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<any[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setShowNameDropdown(false);
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) setShowPhoneDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCustomerSelect = (customer: any) => {
    setClientName(customer.clientName);
    setClientPhone(customer.clientPhone);
    setClientAddress(customer.clientAddress || '');
    setClientEmail(customer.clientEmail || '');
    setClientDivision(customer.clientDivision || '');
    setClientDistrict(customer.clientDistrict || '');
    setClientThana(customer.clientThana || '');
    setClientArea(customer.clientArea || '');
    setShowNameDropdown(false);
    setShowPhoneDropdown(false);
  };

  const handleNameChange = (val: string) => {
    setClientName(val);
    
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }
    if (nameAbortControllerRef.current) {
      nameAbortControllerRef.current.abort();
    }

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      const controller = new AbortController();
      nameAbortControllerRef.current = controller;

      nameTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(trimmed)}`, {
            signal: controller.signal
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.customers || [];
            setNameSuggestions(list);
            setShowNameDropdown(list.length > 0);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error fetching suggestions:', err);
          }
        }
      }, 200);
    } else {
      setNameSuggestions([]);
      setShowNameDropdown(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    setClientPhone(val);
    if (phoneError) validatePhone(val);

    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      phoneTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            const data = await res.json();
            const list = data.customers || [];
            setPhoneSuggestions(list);
            setShowPhoneDropdown(list.length > 0);
          }
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      }, 200);
    } else {
      setPhoneSuggestions([]);
      setShowPhoneDropdown(false);
    }
  };

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState('');

  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
      if (phoneTimeoutRef.current) clearTimeout(phoneTimeoutRef.current);
      if (nameAbortControllerRef.current) nameAbortControllerRef.current.abort();
    };
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await fetch('/api/admin/areas');
      if (res.ok) {
        const data = await res.json();
        setAreas(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChalans();
    fetchProducts();
    fetchSettings();
    fetchAreas();
  }, []);

  const fetchChalans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/showroom/bills?type=chalan');
      if (!res.ok) throw new Error('Failed to fetch challans');
      const data = await res.json();
      setChalans(data);
    } catch (error) {
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const validatePhone = (phone: string) => {
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!bdPhoneRegex.test(phone.replace(/\s/g, ''))) {
      setPhoneError('Enter a valid BD number (e.g. 017XXXXXXXX)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const toggleProductVariant = (productId: string, variantId: string | null) => {
    setSelectedProductVariants(prev => {
      const current = prev[productId];
      if (current === variantId) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: variantId };
    });
  };

  const selectedCount = Object.keys(selectedProductVariants).length;

  const handleAddSelectedProducts = () => {
    const newItems: BillItemInput[] = [];

    Object.entries(selectedProductVariants).forEach(([productId, variantId]) => {
      const prod = products.find(p => p._id === productId);
      if (!prod) return;

      if (variantId === null) {
        newItems.push({ name: prod.name, price: prod.salePrice || prod.price || 0, quantity: 1 });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        newItems.push({ name: label, price: variant.salePrice || variant.price || 0, quantity: 1 });
      }
    });

    if (newItems.length === 0) return;

    if (billItems.length === 1 && billItems[0].name === '' && billItems[0].price === 0) {
      setBillItems(newItems);
    } else {
      setBillItems(prev => [...prev, ...newItems]);
    }
    setSelectedProductVariants({});
    setProductPickerOpen(false);
    setProductSearchTerm('');
  };

  const handleAddItemRow = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (billItems.length === 1) {
      setBillItems([{ name: '', quantity: 1, price: 0 }]);
    } else {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: any) => {
    const updated = [...billItems];
    updated[index] = { ...updated[index] };
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price') {
      updated[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index].name = value;
    }
    setBillItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error('Client details (name and phone) are required');
      return;
    }
    if (!validatePhone(clientPhone)) {
      toast.error('Please enter a valid Bangladesh phone number');
      return;
    }

    const validItems = billItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('At least one item with a name is required');
      return;
    }

    try {
      setFormLoading(true);
      const subtotalVal = validItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      const chalanData = {
        clientName,
        clientPhone,
        clientAddress,
        clientEmail,
        clientDivision,
        clientDistrict,
        clientThana,
        clientArea,
        items: validItems,
        subtotal: subtotalVal,
        deliveryCharge: 0,
        discountType: 'fixed',
        discountValue: 0,
        discount: 0,
        total: subtotalVal,
        prevDue: 0,
        gTotal: subtotalVal,
        cashIn: 0,
        currentBillDue: subtotalVal,
        status: 'Due',
        documentType: 'chalan'
      };

      const url = editingChalan ? `/api/showroom/bills/${editingChalan._id}` : '/api/showroom/bills';
      const method = editingChalan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chalanData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${editingChalan ? 'update' : 'create'} challan`);
      }

      toast.success(editingChalan ? 'Delivery Challan updated successfully!' : 'Delivery Challan generated successfully!');

      setIsCreateOpen(false);
      resetForm();
      fetchChalans();
    } catch (error: any) {
      toast.error(error.message || 'Error saving challan');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setPhoneError('');
    setClientAddress('');
    setClientEmail('');
    setClientDivision('');
    setClientDistrict('');
    setClientThana('');
    setClientArea('');
    setShowMoreFields(false);
    setBillItems([{ name: '', quantity: 1, price: 0 }]);
    setSelectedProductVariants({});
    setProductSearchTerm('');
    setProductPickerOpen(false);
    setEditingChalan(null);
  };

  const handleConvertToBill = async (chalan: any) => {
    const result = await Swal.fire({
      title: 'Convert to Bill Invoice?',
      text: `Do you want to create a Final Bill Invoice from Delivery Challan ${chalan.invoiceNo}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Convert',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      try {
        const billData = {
          clientName: chalan.clientName,
          clientPhone: chalan.clientPhone,
          clientAddress: chalan.clientAddress,
          clientEmail: chalan.clientEmail,
          clientDivision: chalan.clientDivision,
          clientDistrict: chalan.clientDistrict,
          clientThana: chalan.clientThana,
          clientArea: chalan.clientArea,
          items: chalan.items,
          subtotal: chalan.subtotal,
          deliveryCharge: chalan.deliveryCharge || 0,
          discountType: chalan.discountType || 'fixed',
          discountValue: chalan.discountValue || 0,
          discount: chalan.discount || 0,
          total: chalan.total,
          prevDue: 0,
          gTotal: chalan.total,
          cashIn: 0,
          currentBillDue: chalan.total,
          status: 'Due',
          documentType: 'bill',
          convertedFrom: chalan._id
        };

        const res = await fetch('/api/showroom/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(billData)
        });

        if (!res.ok) throw new Error('Conversion failed');
        const createdBill = await res.json();

        await Swal.fire({
          title: 'Success!',
          text: `Final Bill Invoice ${createdBill.invoiceNo} has been generated.`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Print Bill Now',
          cancelButtonText: 'Close'
        }).then((printRes) => {
          if (printRes.isConfirmed) {
            generateBillPDF(createdBill, settings, 'print');
          }
        });
      } catch (error) {
        toast.error('Failed to convert to bill');
      }
    }
  };

  const handleDeleteChalan = async (chalanId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/showroom/bills/${chalanId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete challan');
        toast.success('Delivery Challan deleted successfully');
        fetchChalans();
      } catch (error) {
        toast.error('Failed to delete challan');
      }
    }
  };

  const filteredChalans = chalans.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clientPhone.includes(searchTerm) ||
      b.invoiceNo.includes(searchTerm);

    let matchesDate = true;
    if (filterByDate) {
      if (dateFilter.from) {
        matchesDate = matchesDate && new Date(b.date) >= new Date(dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        matchesDate = matchesDate && new Date(b.date) <= new Date(dateFilter.to + 'T23:59:59');
      }
    }

    return matchesSearch && matchesDate;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredChalans.length / ITEMS_PER_PAGE);
  const paginatedChalans = filteredChalans.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isFiltered = !!((filterByDate && (dateFilter.from || dateFilter.to)) || searchTerm);

  if (loading && chalans.length === 0) {
    return <AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" />;
  }

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-[1px]">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold tracking-tight">{t("chalans.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("chalans.subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> {t("chalans.create_chalan")}
        </Button>
      </div>

      <Card className="border-0 bg-transparent md:border md:bg-card shadow-none md:shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>{t("chalans.list_title")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("chalans.search_placeholder") as string}
                  className="pl-8 text-xs h-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-foreground shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={filterByDate}
                    onChange={(e) => setFilterByDate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                  />
                  {t("bills.filter_by_date")}
                </label>

                <div className={`flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border w-full sm:w-auto transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    disabled={!filterByDate}
                  />
                  <span className="text-muted-foreground text-[10px] shrink-0 font-medium">{t("bills.to")}</span>
                  <Input
                    type="date"
                    className="h-7 border-none bg-transparent focus-visible:ring-0 p-0.5 text-xs md:w-28 font-medium"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    disabled={!filterByDate}
                  />
                </div>
              </div>

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setDateFilter({
                      from: format(start, 'yyyy-MM-dd'),
                      to: format(end, 'yyyy-MM-dd')
                    });
                    setFilterByDate(false);
                    setSearchTerm('');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary shrink-0 h-8"
                >
                  {t("bills.clear")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChalans.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-2 stroke-1" />
              <p>{t("chalans.no_chalans_found")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("chalans.chalan_no")}</TableHead>
                      <TableHead>{t("bills.client_name")}</TableHead>
                      <TableHead>{t("bills.phone")}</TableHead>
                      <TableHead>{t("bills.date")}</TableHead>
                      <TableHead className="text-right">{t("bills.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedChalans.map((chalan) => (
                      <TableRow key={chalan._id}>
                        <TableCell className="font-semibold">{chalan.invoiceNo}</TableCell>
                        <TableCell>{chalan.clientName}</TableCell>
                        <TableCell>{chalan.clientPhone}</TableCell>
                        <TableCell>{format(new Date(chalan.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => generateBillPDF(chalan, settings, 'print')}
                              title="Print Challan"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedChalan(chalan)}>
                                  <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingChalan(chalan);
                                    setClientName(chalan.clientName);
                                    setClientPhone(chalan.clientPhone);
                                    setClientAddress(chalan.clientAddress || '');
                                    setClientEmail(chalan.clientEmail || '');
                                    setClientDivision(chalan.clientDivision || '');
                                    setClientDistrict(chalan.clientDistrict || '');
                                    setClientThana(chalan.clientThana || '');
                                    setClientArea(chalan.clientArea || '');
                                    setBillItems(chalan.items.map((item: any) => ({ ...item })));
                                    const hasMore = !!(chalan.clientEmail || chalan.clientDivision || chalan.clientDistrict || chalan.clientThana || chalan.clientArea || chalan.clientAddress);
                                    setShowMoreFields(hasMore);
                                    setIsCreateOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> {t("chalans.edit_chalan")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generateBillPDF(chalan, settings, 'download')}>
                                  <Download className="mr-2 h-4 w-4" /> {t("bills.download_pdf")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generateBillPDF(chalan, settings, 'print')}>
                                  <Printer className="mr-2 h-4 w-4" /> {t("bills.print_bill")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleConvertToBill(chalan)}>
                                  <ArrowRight className="mr-2 h-4 w-4" /> {t("chalans.convert_to_bill")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteChalan(chalan._id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> {t("bills.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="block md:hidden space-y-3">
                {paginatedChalans.map((chalan) => (
                  <div key={chalan._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-primary">{chalan.invoiceNo}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(chalan.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="space-y-2 text-sm md:text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted-foreground">{t("bills.client")}:</span>
                        <span className="font-semibold text-foreground">{chalan.clientName}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                        <span className="text-muted-foreground">{t("bills.phone")}:</span>
                        <span className="text-foreground font-medium">{chalan.clientPhone}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2.5 border-t mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-teal-600 hover:text-teal-700 text-xs px-3 py-1 flex items-center gap-1"
                        onClick={() => generateBillPDF(chalan, settings, 'print')}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" /> {t("bills.print")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
                            <MoreHorizontal className="h-4.5 w-4.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedChalan(chalan)}>
                            <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingChalan(chalan);
                              setClientName(chalan.clientName);
                              setClientPhone(chalan.clientPhone);
                              setClientAddress(chalan.clientAddress || '');
                              setClientEmail(chalan.clientEmail || '');
                              setClientDivision(chalan.clientDivision || '');
                              setClientDistrict(chalan.clientDistrict || '');
                              setClientThana(chalan.clientThana || '');
                              setClientArea(chalan.clientArea || '');
                              setBillItems(chalan.items.map((item: any) => ({ ...item })));
                              const hasMore = !!(chalan.clientEmail || chalan.clientDivision || chalan.clientDistrict || chalan.clientThana || chalan.clientArea || chalan.clientAddress);
                              setShowMoreFields(hasMore);
                              setIsCreateOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" /> {t("chalans.edit_chalan")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBillPDF(chalan, settings, 'download')}>
                            <Download className="mr-2 h-4 w-4" /> {t("bills.download_pdf")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBillPDF(chalan, settings, 'print')}>
                            <Printer className="mr-2 h-4 w-4" /> {t("bills.print_bill")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToBill(chalan)}>
                            <ArrowRight className="mr-2 h-4 w-4" /> {t("chalans.convert_to_bill")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteChalan(chalan._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("bills.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {totalPages > 1 && (
            <div className="py-4 border-t bg-background px-6 mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChalan ? t("chalans.edit_chalan") : t("chalans.create_new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative" ref={nameRef}>
                  <Label htmlFor="cName">{t("bills.client_name")} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="cName"
                      placeholder="e.g. Rahim & Bros"
                      value={clientName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => { if (clientName.trim() && nameSuggestions.length > 0) setShowNameDropdown(true); }}
                      autoComplete="off"
                      required
                    />
                    {showNameDropdown && nameSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {nameSuggestions.map((c, i) => (
                          <div
                            key={i}
                            className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-left"
                            onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                          >
                            <span className="font-medium text-sm text-foreground">{c.clientName}</span>
                            <span className="text-xs text-muted-foreground">{c.clientPhone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 relative" ref={phoneRef}>
                  <Label htmlFor="cPhone">{t("bills.client_phone")} <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        id="cPhone"
                        placeholder="e.g. 017XXXXXXXX"
                        value={clientPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onFocus={() => { if (clientPhone.trim() && phoneSuggestions.length > 0) setShowPhoneDropdown(true); }}
                        autoComplete="off"
                        required
                      />
                      {showPhoneDropdown && phoneSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {phoneSuggestions.map((c, i) => (
                            <div
                              key={i}
                              className="flex flex-col px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-left"
                              onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                            >
                              <span className="font-medium text-sm text-foreground">{c.clientPhone}</span>
                              <span className="text-xs text-muted-foreground">{c.clientName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      className={`h-8 px-3 text-xs font-bold rounded-lg shrink-0 transition-all ${
                        showMoreFields 
                          ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                      onClick={() => setShowMoreFields(!showMoreFields)}
                    >
                      {showMoreFields ? '- Close' : '+ Add More'}
                    </Button>
                  </div>
                  {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                </div>
              </div>

              {showMoreFields && (
                <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cEmail">Email</Label>
                      <Input
                        id="cEmail"
                        type="email"
                        placeholder="e.g. client@example.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cAddr">{t("bills.client_address")}</Label>
                      <Input
                        id="cAddr"
                        placeholder="e.g. Banani, Dhaka"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("settings.division")}</Label>
                      <Select
                        value={clientDivision}
                        onValueChange={(val) => {
                          setClientDivision(val || '');
                          setClientDistrict('');
                          setClientThana('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("settings.select_division") as string} />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((div) => (
                            <SelectItem key={div} value={div}>
                              {div}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("settings.district")}</Label>
                      <Select
                        disabled={!clientDivision}
                        value={clientDistrict}
                        onValueChange={(val) => {
                          setClientDistrict(val || '');
                          setClientThana('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("settings.select_district") as string} />
                        </SelectTrigger>
                        <SelectContent>
                          {(bdDivisions[clientDivision] || []).map((dist) => (
                            <SelectItem key={dist} value={dist}>
                              {dist}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("settings.thana")}</Label>
                      <Select
                        disabled={!clientDistrict}
                        value={clientThana}
                        onValueChange={(val) => setClientThana(val || '')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("settings.select_thana") as string} />
                        </SelectTrigger>
                        <SelectContent>
                          {(bdLocations[clientDistrict] || []).map((th) => (
                            <SelectItem key={th} value={th}>
                              {th}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Area</Label>
                      <Select
                        value={clientArea}
                        onValueChange={(val) => setClientArea(val || '')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas
                            .filter((a) => {
                              if (clientDivision && a.division !== clientDivision) return false;
                              if (clientDistrict && a.district && a.district !== clientDistrict) return false;
                              if (clientThana && a.thana && a.thana !== clientThana) return false;
                              return true;
                            })
                            .map((area) => (
                              <SelectItem key={area._id} value={area.name}>
                                {area.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">{t("chalans.items_list")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPickerOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("bills.select_products")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold">
                  <Plus className="h-3 w-3 mr-1" /> {t("bills.add_custom_item")}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {billItems.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border p-2 sm:p-0 sm:border-none rounded-md">
                  <div className="flex-1">
                    <Input
                      placeholder={t("bills.item_description") as string}
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-32">
                      <Input
                        type="number"
                        placeholder={t("bills.qty") as string}
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItemRow(index)}
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("bills.cancel")}
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-primary text-primary-foreground">
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingChalan ? t("chalans.update_chalan") : t("chalans.generate_chalan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("chalans.select_products_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("chalans.search_products") as string}
                className="pl-8"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>
            <div className="border rounded-md max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overflow-x-auto w-full">
              <Table className="min-w-[600px] sm:min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>{t("chalans.product")}</TableHead>
                    <TableHead>{t("chalans.options_variants")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                    .map((prod) => {
                      const hasVariants = prod.variants && prod.variants.length > 0;
                      return (
                        <TableRow key={prod._id}>
                          <TableCell>
                            {!hasVariants && (
                              <Checkbox
                                checked={selectedProductVariants[prod._id] === null}
                                onCheckedChange={() => toggleProductVariant(prod._id, null)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{prod.name}</TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-2 py-1">
                                {prod.variants.map((v: any) => {
                                  const label = [v.color, v.size].filter(Boolean).join(' / ');
                                  const isSelected = selectedProductVariants[prod._id] === v._id;
                                  return (
                                    <Button
                                      key={v._id}
                                      type="button"
                                      variant={isSelected ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => toggleProductVariant(prod._id, v._id)}
                                      className="text-xs py-0.5 px-2 h-7"
                                    >
                                      {label}
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("chalans.standard_item")}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-2">
              <span className="text-sm text-muted-foreground font-medium">{selectedCount} {t("chalans.items_selected")}</span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setProductPickerOpen(false)}>{t("bills.cancel")}</Button>
                <Button type="button" className="flex-1 sm:flex-none bg-primary text-primary-foreground" onClick={handleAddSelectedProducts}>{t("chalans.add_selected")}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedChalan} onOpenChange={(open) => { if (!open) setSelectedChalan(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("chalans.chalan_details")} — {selectedChalan?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {selectedChalan && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-xs">{t("chalans.deliver_to")}</h4>
                  <p className="font-medium text-base">{selectedChalan.clientName}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {selectedChalan.clientPhone}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {selectedChalan.clientAddress}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-xs">{t("chalans.document_info")}</h4>
                  <p className="flex items-center gap-1.5 font-medium"><Hash className="h-3.5 w-3.5 text-primary" /> {selectedChalan.invoiceNo}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {format(new Date(selectedChalan.date), 'dd MMM yyyy')}</p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead>{t("chalans.description")}</TableHead>
                      <TableHead className="text-center w-24">{t("chalans.quantity_delivered")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedChalan.items.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateBillPDF(selectedChalan, settings, 'print')}
                >
                  <Printer className="mr-2 h-4 w-4" /> {t("chalans.print_chalan")}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => {
                    const ch = selectedChalan;
                    setSelectedChalan(null);
                    handleConvertToBill(ch);
                  }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> {t("chalans.convert_final_bill")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ShowroomChalansPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-48" />}>
      <ClientChalansContent />
    </Suspense>
  );
}

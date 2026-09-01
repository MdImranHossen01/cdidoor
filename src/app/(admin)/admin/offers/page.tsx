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

function ClientOffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [offers, setOffers] = useState<any[]>([]);
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

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
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
    router.push(`/admin/offers?${params.toString()}`);
  }, [currentPage]);

  // Reset page when search term or dates change
  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/offers?${params.toString()}`);
  }, [searchTerm, filterByDate, dateFilter.from, dateFilter.to]);

  // Offer detail view state
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [editingOffer, setEditingOffer] = useState<any>(null);

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
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);

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
    fetchOffers();
    fetchProducts();
    fetchSettings();
    fetchAreas();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bills?type=offer');
      if (!res.ok) throw new Error('Failed to fetch offers');
      const data = await res.json();
      setOffers(data);
    } catch (error) {
      toast.error('Failed to load offers');
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

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;
  const total = Math.max(0, subtotal + deliveryCharge + serviceFee - discount);

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
      const offerData = {
        clientName,
        clientPhone,
        clientAddress,
        clientEmail,
        clientDivision,
        clientDistrict,
        clientThana,
        clientArea,
        items: validItems,
        subtotal,
        deliveryCharge,
        serviceFee,
        discountType,
        discountValue,
        discount,
        total,
        prevDue: 0,
        gTotal: total,
        cashIn: 0,
        currentBillDue: total,
        status: 'Due',
        documentType: 'offer'
      };

      const url = editingOffer ? `/api/admin/bills/${editingOffer._id}` : '/api/admin/bills';
      const method = editingOffer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${editingOffer ? 'update' : 'create'} quotation`);
      }

      const createdOffer = await res.json();
      toast.success(editingOffer ? 'Quotation updated successfully!' : 'Quotation generated successfully!');

      setIsCreateOpen(false);
      resetForm();
      fetchOffers();
    } catch (error: any) {
      toast.error(error.message || 'Error creating quotation');
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
    setDeliveryCharge(0);
    setServiceFee(0);
    setDiscountType('fixed');
    setDiscountValue(0);
    setSelectedProductVariants({});
    setProductSearchTerm('');
    setProductPickerOpen(false);
    setEditingOffer(null);
  };

  const handleConvertToChalan = async (offer: any) => {
    const result = await Swal.fire({
      title: 'Convert to Delivery Challan?',
      text: `Do you want to create a Delivery Challan from Quotation ${offer.invoiceNo}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Convert',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      try {
        const challanData = {
          clientName: offer.clientName,
          clientPhone: offer.clientPhone,
          clientAddress: offer.clientAddress,
          clientEmail: offer.clientEmail,
          clientDivision: offer.clientDivision,
          clientDistrict: offer.clientDistrict,
          clientThana: offer.clientThana,
          clientArea: offer.clientArea,
          items: offer.items,
          subtotal: offer.subtotal,
          deliveryCharge: offer.deliveryCharge,
          serviceFee: offer.serviceFee || 0,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          discount: offer.discount,
          total: offer.total,
          prevDue: 0,
          gTotal: offer.total,
          cashIn: 0,
          currentBillDue: offer.total,
          status: 'Due',
          documentType: 'chalan',
          convertedFrom: offer._id
        };

        const res = await fetch('/api/admin/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData)
        });

        if (!res.ok) throw new Error('Conversion failed');
        const createdChallan = await res.json();

        await Swal.fire({
          title: 'Success!',
          text: `Delivery Challan ${createdChallan.invoiceNo} has been generated.`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Print Challan Now',
          cancelButtonText: 'Close'
        }).then((printRes) => {
          if (printRes.isConfirmed) {
            generateBillPDF(createdChallan, settings, 'print');
          }
        });
      } catch (error) {
        toast.error('Failed to convert to challan');
      }
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
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
        const res = await fetch(`/api/admin/bills/${offerId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete quotation');
        toast.success('Quotation deleted successfully');
        fetchOffers();
      } catch (error) {
        toast.error('Failed to delete quotation');
      }
    }
  };

  const filteredOffers = offers.filter(b => {
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
  const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);
  const paginatedOffers = filteredOffers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isFiltered = !!((filterByDate && (dateFilter.from || dateFilter.to)) || searchTerm);

  return (
    <div className="flex-1 space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold tracking-tight">{t("offers.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("offers.subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto rounded-none h-10 bg-primary text-primary-foreground font-bold flex items-center justify-center">
          <Plus className="mr-2 h-4 w-4" /> {t("offers.create_offer")}
        </Button>
      </div>

      {/* Offers Table */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border-0 bg-transparent md:border md:bg-card shadow-none md:shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="hidden md:block">{t("offers.list_title")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("offers.search_placeholder") as string}
                  className="pl-8 text-xs h-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Date Filter Checkbox & Date Inputs */}
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
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-2 stroke-1" />
              <p>{t("offers.no_offers_found")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("offers.offer_no")}</TableHead>
                      <TableHead>{t("bills.client_name")}</TableHead>
                      <TableHead>{t("bills.phone")}</TableHead>
                      <TableHead>{t("bills.date")}</TableHead>
                      <TableHead className="text-right">{t("offers.total_offer")} (৳)</TableHead>
                      <TableHead className="text-right">{t("bills.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOffers.map((offer) => (
                      <TableRow key={offer._id}>
                        <TableCell className="font-semibold">{offer.invoiceNo}</TableCell>
                        <TableCell>{offer.clientName}</TableCell>
                        <TableCell>{offer.clientPhone}</TableCell>
                        <TableCell>{format(new Date(offer.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right font-medium">৳{Math.round(offer.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => generateBillPDF(offer, settings, 'print')}
                              title="Print Quotation"
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
                              <DropdownMenuItem onClick={() => setSelectedOffer(offer)}>
                                <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingOffer(offer);
                                  setClientName(offer.clientName);
                                  setClientPhone(offer.clientPhone);
                                  setClientAddress(offer.clientAddress || '');
                                  setClientEmail(offer.clientEmail || '');
                                  setClientDivision(offer.clientDivision || '');
                                  setClientDistrict(offer.clientDistrict || '');
                                  setClientThana(offer.clientThana || '');
                                  setClientArea(offer.clientArea || '');
                                  setBillItems(offer.items);
                                  setDeliveryCharge(offer.deliveryCharge);
                                  setServiceFee(offer.serviceFee || 0);
                                  setDiscountType(offer.discountType || 'fixed');
                                  setDiscountValue(offer.discountValue || 0);
                                  const hasMore = !!(offer.clientEmail || offer.clientDivision || offer.clientDistrict || offer.clientThana || offer.clientArea || offer.clientAddress);
                                  setShowMoreFields(hasMore);
                                  setIsCreateOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> {t("offers.edit_offer")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(offer, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4" /> {t("bills.download_pdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(offer, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4" /> {t("bills.print_bill")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConvertToChalan(offer)}>
                                <ArrowRight className="mr-2 h-4 w-4" /> {t("offers.convert_to_chalan")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteOffer(offer._id)}
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

              {/* Mobile View */}
              <div className="block md:hidden space-y-3">
                {paginatedOffers.map((offer) => (
                  <div key={offer._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-primary">{offer.invoiceNo}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(offer.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="space-y-2 text-sm md:text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted-foreground">{t("bills.client")}:</span>
                        <span className="font-semibold text-foreground">{offer.clientName}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                        <span className="text-muted-foreground">{t("bills.phone")}:</span>
                        <span className="text-foreground font-medium">{offer.clientPhone}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t mt-1">
                        <span className="text-muted-foreground font-bold">{t("bills.total")}:</span>
                        <span className="font-bold text-foreground text-base md:text-sm">৳{Math.round(offer.total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2.5 border-t mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-teal-600 hover:text-teal-700 text-xs px-3 py-1 flex items-center gap-1"
                        onClick={() => generateBillPDF(offer, settings, 'print')}
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
                          <DropdownMenuItem onClick={() => setSelectedOffer(offer)}>
                            <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingOffer(offer);
                              setClientName(offer.clientName);
                              setClientPhone(offer.clientPhone);
                              setClientAddress(offer.clientAddress || '');
                              setClientEmail(offer.clientEmail || '');
                              setClientDivision(offer.clientDivision || '');
                              setClientDistrict(offer.clientDistrict || '');
                              setClientThana(offer.clientThana || '');
                              setClientArea(offer.clientArea || '');
                              setBillItems(offer.items);
                              setDeliveryCharge(offer.deliveryCharge);
                              setServiceFee(offer.serviceFee || 0);
                              setDiscountType(offer.discountType || 'fixed');
                              setDiscountValue(offer.discountValue || 0);
                              const hasMore = !!(offer.clientEmail || offer.clientDivision || offer.clientDistrict || offer.clientThana || offer.clientArea || offer.clientAddress);
                              setShowMoreFields(hasMore);
                              setIsCreateOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" /> {t("offers.edit_offer")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBillPDF(offer, settings, 'download')}>
                            <Download className="mr-2 h-4 w-4" /> {t("bills.download_pdf")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBillPDF(offer, settings, 'print')}>
                            <Printer className="mr-2 h-4 w-4" /> {t("bills.print_bill")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToChalan(offer)}>
                            <ArrowRight className="mr-2 h-4 w-4" /> {t("offers.convert_to_chalan")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteOffer(offer._id)}
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
    </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? t("offers.edit_offer") : t("offers.create_new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Info */}
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
                  {/* Row 1: Email and Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Email */}
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

                    {/* Customer Street Address */}
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

                  {/* Row 2: Location Fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Division */}
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

                    {/* District */}
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

                    {/* Thana */}
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

                    {/* Area */}
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

            {/* Product Picker */}
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

            {/* Manual item entries */}
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
                    <div className="flex-1 sm:w-24">
                      <Input
                        type="number"
                        placeholder={t("bills.qty") as string}
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex-1 sm:w-28">
                      <Input
                        type="number"
                        placeholder={t("offers.price") as string}
                        min="0"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
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

            <hr />

            {/* Calculations & Discounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="discType">{t("offers.discount_type")}</Label>
                    <Select
                      value={discountType}
                      onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}
                    >
                      <SelectTrigger id="discType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">{t("offers.fixed_amount")}</SelectItem>
                        <SelectItem value="percentage">{t("offers.percentage")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="discVal">{t("bills.discount_value")}</Label>
                    <Input
                      id="discVal"
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delCharge">{t("bills.delivery_charge")}</Label>
                  <Input
                    id="delCharge"
                    type="number"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceFeeOffer">{t("bills.service_fee")} <span className="text-muted-foreground font-normal text-xs">— {t("bills.optional")}</span></Label>
                  <Input
                    id="serviceFeeOffer"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={serviceFee || ''}
                    onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span>{t("bills.subtotal")}:</span>
                  <span className="font-medium">৳{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>{t("bills.discount")}:</span>
                    <span>- ৳{discount}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>{t("bills.delivery_charge")}:</span>
                    <span>৳{deliveryCharge}</span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span>{t("bills.service_fee")}:</span>
                    <span>৳{serviceFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>{t("offers.total_offer")}:</span>
                  <span>৳{total}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("bills.cancel")}
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-primary text-primary-foreground">
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOffer ? t("offers.update_offer") : t("offers.generate_offer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
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
                    <TableHead className="text-right">{t("offers.price")}</TableHead>
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
                                      {label} (৳{v.salePrice || v.price})
                                    </Button>
                                  );
                                })}
                              </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t("chalans.standard_item")}</span>
                              )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!hasVariants && `৳${prod.salePrice || prod.price}`}
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

      {/* Offer Detail View Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => { if (!open) setSelectedOffer(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("offers.offer_details")} — {selectedOffer?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-xs">{t("offers.quotation_to")}</h4>
                  <p className="font-medium text-base">{selectedOffer.clientName}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {selectedOffer.clientPhone}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {selectedOffer.clientAddress}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-xs">{t("chalans.document_info")}</h4>
                  <p className="flex items-center gap-1.5 font-medium"><Hash className="h-3.5 w-3.5 text-primary" /> {selectedOffer.invoiceNo}</p>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {format(new Date(selectedOffer.date), 'dd MMM yyyy')}</p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead>{t("chalans.description")}</TableHead>
                      <TableHead className="text-center w-16">{t("bills.qty")}</TableHead>
                      <TableHead className="text-right w-24">Rate</TableHead>
                      <TableHead className="text-right w-28">{t("bills.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOffer.items.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">৳{Math.round(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">৳{Math.round(item.price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("bills.subtotal")}:</span>
                    <span className="font-medium">৳{Math.round(selectedOffer.subtotal)}</span>
                  </div>
                  {selectedOffer.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>{t("bills.discount")} ({selectedOffer.discountType === 'percentage' ? `${selectedOffer.discountValue}%` : 'Fixed'}):</span>
                      <span>- ৳{Math.round(selectedOffer.discount)}</span>
                    </div>
                  )}
                  {selectedOffer.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.delivery_charge")}:</span>
                      <span>৳{Math.round(selectedOffer.deliveryCharge)}</span>
                    </div>
                  )}
                  {selectedOffer.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bills.service_fee")}:</span>
                      <span>৳{Math.round(selectedOffer.serviceFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>{t("offers.total_offer")}:</span>
                    <span className="text-primary">৳{Math.round(selectedOffer.total)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateBillPDF(selectedOffer, settings, 'print')}
                >
                  <Printer className="mr-2 h-4 w-4" /> {t("offers.print_offer")}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => {
                    const off = selectedOffer;
                    setSelectedOffer(null);
                    handleConvertToChalan(off);
                  }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> {t("offers.convert_to_chalan")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientOffersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-48" />}>
      <ClientOffersContent />
    </Suspense>
  );
}

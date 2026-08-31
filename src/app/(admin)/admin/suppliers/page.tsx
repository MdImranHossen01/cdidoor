'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, Search, User, Eye, CreditCard, DollarSign, Loader2, Phone, Copy, MoreHorizontal } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { normalizePhoneNumber } from '@/lib/utils';
import { getWhatsAppLink } from '@/lib/utils';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    {...props}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z"/>
  </svg>
);

import { useLanguage } from '@/contexts/LanguageContext';

function SuppliersContent() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Sync page to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    router.replace(`/admin/suppliers${params.toString() ? '?' + params.toString() : ''}`);
  }, [currentPage]);

  const isMounted = useRef(false);
  // Reset page when search term changes
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    setCurrentPage(1);
    router.replace('/admin/suppliers');
  }, [searchTerm]);

  // Add/Edit Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');

  // Details & Payments Drawer/Modal State
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Record Payment Dialog State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [payDescription, setPayDescription] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingSupplier(null);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierAddress('');
      setSupplierCompany('');
      setIsFormOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      router.replace(`/admin/suppliers${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const data = await res.json();
      setSuppliers(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setSupplierCompany('');
    setIsFormOpen(true);
  };

  const openEditDialog = (supplier: any) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone);
    setSupplierEmail(supplier.email || '');
    setSupplierAddress(supplier.address);
    setSupplierCompany(supplier.companyName || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !supplierPhone || !supplierAddress) {
      toast.error(t("suppliers.error_fill") as string);
      return;
    }

    try {
      const url = editingSupplier ? `/api/admin/suppliers/${editingSupplier._id}` : '/api/admin/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supplierName,
          phone: normalizePhoneNumber(supplierPhone),
          email: supplierEmail || undefined,
          address: supplierAddress,
          companyName: supplierCompany || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to save supplier');

      toast.success(editingSupplier ? (t("suppliers.supplier_updated") as string) : (t("suppliers.supplier_added") as string));
      setIsFormOpen(false);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Error saving supplier');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t("suppliers.delete_title"),
      text: t("suppliers.delete_text"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: t("suppliers.yes_delete"),
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete');
      }

      toast.success(t("suppliers.supplier_deleted") as string);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete supplier');
    }
  };

  const viewSupplierDetails = async (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDetailsOpen(true);
    fetchSupplierDetails(supplier._id);
  };

  const fetchSupplierDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (!res.ok) throw new Error('Failed to load details');
      const data = await res.json();
      setSupplierBills(data.bills || []);
      setSupplierPayments(data.payments || []);
    } catch (error: any) {
      toast.error(error.message || 'Error fetching details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openPaymentDialog = () => {
    setPayAmount('');
    setPayDescription('');
    setPayMethod('Cash');
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setIsPaymentOpen(true);
  };

  const openDirectPaymentDialog = (supplier: any) => {
    setSelectedSupplier(supplier);
    setPayAmount('');
    setPayDescription('');
    setPayMethod('Cash');
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("suppliers.error_amount") as string);
      return;
    }

    try {
      const res = await fetch(`/api/admin/suppliers/${selectedSupplier._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod: payMethod,
          description: payDescription || undefined,
          date: payDate
        })
      });

      if (!res.ok) throw new Error('Failed to record payment');

      toast.success(t("suppliers.payment_recorded") as string);
      setIsPaymentOpen(false);
      if (isDetailsOpen) {
        fetchSupplierDetails(selectedSupplier._id);
      }
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Error recording payment');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.companyName && s.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.phone.includes(searchTerm)
  );

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t("suppliers.title")}</h1>
          <p className="text-muted-foreground text-xs md:text-sm hidden md:block">
            {t("suppliers.subtitle")}
          </p>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto rounded-none h-10 shrink-0 font-bold bg-primary text-primary-foreground">
          <Plus className="mr-1.5 h-4 w-4" /> {t("suppliers.add_supplier")}
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("suppliers.search_placeholder") as string}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="border-0 bg-transparent md:border md:bg-card shadow-none md:shadow-sm">
        <CardContent className="p-0">
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("suppliers.name_company")} / {t("suppliers.contact") || "Contact"}</TableHead>
                  <TableHead>{t("suppliers.address")}</TableHead>
                  <TableHead className="text-right">{t("suppliers.outstanding_payable")}</TableHead>
                  <TableHead className="text-right">{t("suppliers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36 rounded" />
                          <Skeleton className="h-3 w-28 rounded" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 rounded ml-auto" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      {t("suppliers.no_suppliers_found")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier._id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{supplier.name}</div>
                        {supplier.companyName && (
                          <div className="text-xs text-muted-foreground">{supplier.companyName}</div>
                        )}
                        <div className="flex flex-col gap-0.5 mt-1 text-slate-600 font-normal text-xs">
                          {supplier.phone && (
                            <span className="text-slate-500 font-medium">{supplier.phone}</span>
                          )}
                          {supplier.email && (
                            <span className="truncate">{supplier.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{supplier.address}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600">
                        ৳{(supplier.currentBalance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem onClick={() => viewSupplierDetails(supplier)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4 text-sky-600" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDirectPaymentDialog(supplier)} className="cursor-pointer">
                              <CreditCard className="mr-2 h-4 w-4 text-emerald-650" /> Record Payout
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4 text-indigo-600" /> Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(supplier._id)} className="cursor-pointer text-rose-600 focus:text-rose-600">
                              <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete Supplier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-3 p-2">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-background shadow-sm space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-3 w-40 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">{t("suppliers.no_suppliers_found")}</div>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <div key={supplier._id} className="p-3 border rounded-lg bg-background shadow-sm space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-foreground text-sm">{supplier.name}</div>
                      {supplier.companyName && (
                        <div className="text-xs text-muted-foreground">{supplier.companyName}</div>
                      )}
                    </div>
                    <span className="font-bold text-rose-600 text-sm">৳{(supplier.currentBalance || 0).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{supplier.phone || t("suppliers.na")}</span>
                      {supplier.phone && (
                        <div className="flex items-center gap-1">
                          <a 
                            href={getWhatsAppLink(supplier.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                            title={t("suppliers.chat_whatsapp") as string}
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(supplier.phone);
                                toast.success(t("suppliers.phone_copied") as string);
                              } catch (err) {
                                // Ignore or silently fail/handle rejection without unhandled promise
                              }
                            }}
                            className="text-muted-foreground p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                            title={t("suppliers.copy_phone") as string}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {supplier.address && (
                      <div className="text-muted-foreground truncate max-w-full">
                        {t("suppliers.address")}: {supplier.address}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t">
                    <Button variant="outline" size="sm" className="h-8 text-sky-600 text-[10px] px-2" onClick={() => viewSupplierDetails(supplier)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> {t("suppliers.view")}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-emerald-600 text-[10px] px-2" onClick={() => openDirectPaymentDialog(supplier)}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Out
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-indigo-600 text-[10px] px-2" onClick={() => openEditDialog(supplier)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> {t("suppliers.edit")}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-rose-600 text-[10px] px-2" onClick={() => handleDelete(supplier._id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("suppliers.delete")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="py-4 border-t bg-background px-6">
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

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px] w-full">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? t("suppliers.edit_supplier") : t("suppliers.add_new_supplier")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="block mb-1.5">{t("suppliers.supplier_name")}</Label>
              <Input
                id="name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="company" className="block mb-1.5">{t("suppliers.company_name")}</Label>
              <Input
                id="company"
                value={supplierCompany}
                onChange={(e) => setSupplierCompany(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="block mb-1.5">{t("suppliers.phone")} *</Label>
              <Input
                id="phone"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="block mb-1.5">{t("suppliers.email")}</Label>
              <Input
                id="email"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address" className="block mb-1.5">{t("suppliers.address")} *</Label>
              <Input
                id="address"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t("suppliers.cancel")}
              </Button>
              <Button type="submit">
                {editingSupplier ? t("suppliers.save_changes") : t("suppliers.add_supplier")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center mr-6">
              <span>{t("suppliers.supplier_statement")}{selectedSupplier?.name}</span>
              <span className="text-sm font-semibold text-rose-600">
                {t("suppliers.outstanding")}{selectedSupplier?.currentBalance?.toLocaleString() || 0}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-6 mt-4">
              {/* Supplier Info Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("suppliers.phone")}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-1 font-semibold">{selectedSupplier.phone}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("suppliers.company_name")}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-1 font-semibold">{selectedSupplier.companyName || t("suppliers.na")}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("suppliers.address")}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-1 font-semibold truncate" title={selectedSupplier.address}>
                    {selectedSupplier.address}
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end">
                <Button onClick={openPaymentDialog}>
                  <CreditCard className="mr-2 h-4 w-4" /> {t("suppliers.record_payment")}
                </Button>
              </div>

              {detailsLoading ? (
                <div className="text-center py-6 text-muted-foreground">{t("suppliers.loading_history")}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Purchase Bills */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">{t("suppliers.purchase_bills")}</h3>
                    <div className="border rounded-md max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("suppliers.bill_no")}</TableHead>
                            <TableHead>{t("suppliers.date")}</TableHead>
                            <TableHead className="text-right">{t("suppliers.total")}</TableHead>
                            <TableHead className="text-right">{t("suppliers.due")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplierBills.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">
                                {t("suppliers.no_bills")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            supplierBills.map((bill) => (
                              <TableRow key={bill._id}>
                                <TableCell className="font-medium text-xs">{bill.billNo}</TableCell>
                                <TableCell className="text-xs">{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right text-xs">৳{bill.total.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs text-rose-600 font-semibold">
                                  ৳{bill.dueAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Payments */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">{t("suppliers.payment_history")}</h3>
                    <div className="border rounded-md max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("suppliers.date")}</TableHead>
                            <TableHead>{t("suppliers.amount")}</TableHead>
                            <TableHead>{t("suppliers.description")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplierPayments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">
                                {t("suppliers.no_payments")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            supplierPayments.map((payment) => (
                              <TableRow key={payment._id}>
                                <TableCell className="text-xs">{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="font-semibold text-emerald-600 text-xs">
                                  ৳{payment.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={payment.description}>
                                  {payment.description}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suppliers.record_payment_to")}{selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <Label htmlFor="payAmount">{t("suppliers.amount_bdt")}</Label>
              <Input
                id="payAmount"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={t("suppliers.amount_placeholder") as string}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payMethod">{t("suppliers.payment_method")}</Label>
                <select
                  id="payMethod"
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Cash">{t("suppliers.cash")}</option>
                  <option value="Bank">{t("suppliers.bank")}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="payDate">{t("suppliers.payment_date")}</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payDescription">{t("suppliers.notes_description")}</Label>
              <Input
                id="payDescription"
                value={payDescription}
                onChange={(e) => setPayDescription(e.target.value)}
                placeholder={t("suppliers.notes_placeholder") as string}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                {t("suppliers.cancel")}
              </Button>
              <Button type="submit">{t("suppliers.confirm_payment")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-52" />}>
      <SuppliersContent />
    </Suspense>
  );
}

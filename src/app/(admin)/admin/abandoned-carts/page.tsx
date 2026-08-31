'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash, Search, User, Phone, MapPin, Calendar, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

function AbandonedCartsContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));
  const [carts, setCarts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
  });

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.push(`/admin/abandoned-carts?${params.toString()}`);
    }
  }, [debouncedSearch, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize URL page param with state
  useEffect(() => {
    const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
    if (pageFromParams !== currentPage) {
      setCurrentPage(pageFromParams);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCarts = async (pageVal = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageVal.toString(),
        limit: '20',
        search: debouncedSearch,
        from: dateFilter.from,
        to: dateFilter.to
      });

      const res = await fetch(`/api/cart/abandoned?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch abandoned carts');
      const data = await res.json();

      setCarts(data.carts || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error: any) {
      toast.error(error.message || (t("abandoned_carts.failed_load") as string));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts(currentPage);
  }, [currentPage, debouncedSearch, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    router.push(`/admin/abandoned-carts?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t("abandoned_carts.remove_title"),
      text: t("abandoned_carts.remove_desc"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: t("abandoned_carts.yes_delete")
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/cart/abandoned?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t("abandoned_carts.cart_removed") as string);
        fetchCarts(currentPage);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || (t("abandoned_carts.failed_delete") as string));
      }
    } catch (error) {
      toast.error(t("abandoned_carts.failed_delete") as string);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info(t("abandoned_carts.preparing_export") as string);
      const queryParams = new URLSearchParams({
        limit: 'all',
        search: debouncedSearch,
        from: dateFilter.from,
        to: dateFilter.to
      });

      const res = await fetch(`/api/cart/abandoned?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data for export');
      const data = await res.json();
      const allCarts = data.carts || [];

      if (allCarts.length === 0) {
        toast.error(t("abandoned_carts.no_carts_export") as string);
        return;
      }

      const headers = [
        'Cart ID',
        'Date',
        'Customer Name',
        'Phone',
        'Email',
        'Address',
        'Area',
        'Items List',
        'Total Amount'
      ];

      const rows = allCarts.map((c: any) => {
        const itemsText = c.items.map((i: any) => {
          const variantDesc = [i.color, i.size].filter(Boolean).join('/');
          return `• ${i.quantity} x ${i.name}${variantDesc ? ` [${variantDesc}]` : ''} (@৳${i.price})`;
        }).join('\n');

        return [
          c._id.toUpperCase(),
          format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm'),
          c.fullName,
          c.phone,
          c.email || (t("abandoned_carts.na") as string),
          c.street || (t("abandoned_carts.na") as string),
          c.deliveryArea === 'inside' ? (t("abandoned_carts.inside_dhaka") as string) : (t("abandoned_carts.outside_dhaka") as string),
          itemsText,
          c.totalAmount
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `abandoned_carts_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("abandoned_carts.export_completed") as string);
    } catch (error) {
      console.error(error);
      toast.error(t("abandoned_carts.failed_export") as string);
    }
  };

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">{t("abandoned_carts.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("abandoned_carts.desc")}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => fetchCarts(currentPage)} className="h-10 w-full sm:w-auto rounded-none">
            <RefreshCw className="mr-2 h-4 w-4" /> {t("abandoned_carts.reload")}
          </Button>
          <Button variant="default" onClick={exportToCSV} className="h-10 w-full sm:w-auto rounded-none bg-primary text-primary-foreground hover:bg-primary/95">
            <Download className="mr-2 h-4 w-4" /> {t("abandoned_carts.export_csv")}
          </Button>
        </div>
      </div>

      {/* Date Filters & Search */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">{t("abandoned_carts.search")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("abandoned_carts.search_placeholder") as string}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{t("abandoned_carts.from_date")}</label>
                <Input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{t("abandoned_carts.to_date")}</label>
                <Input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
        <Card>
          <CardHeader className="hidden md:block">
            <CardTitle>{t("abandoned_carts.cart_sessions")}</CardTitle>
            <CardDescription>
              {t("abandoned_carts.showing_sessions")}{carts.length}{t("abandoned_carts.showing_of")}{totalCount}{t("abandoned_carts.showing_active")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                {t("abandoned_carts.loading")}
              </div>
            ) : carts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t("abandoned_carts.no_carts_found")}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hidden md:block overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("abandoned_carts.customer_details")}</TableHead>
                        <TableHead>{t("abandoned_carts.cart_items")}</TableHead>
                        <TableHead>{t("abandoned_carts.total_amount")}</TableHead>
                        <TableHead>{t("abandoned_carts.time")}</TableHead>
                        <TableHead className="text-right">{t("abandoned_carts.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carts.map((cart) => (
                        <TableRow key={cart._id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="max-w-[250px] align-top">
                            <div className="space-y-1">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {cart.fullName}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <a href={`tel:${cart.phone}`} className="hover:underline text-primary font-medium">
                                  {cart.phone}
                                </a>
                              </div>
                              {cart.email && (
                                <div className="text-xs text-muted-foreground truncate ml-5">
                                  {cart.email}
                                </div>
                              )}
                              {cart.street && (
                                <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1 max-w-[220px] whitespace-normal">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                  <span>
                                    {cart.street} {cart.deliveryArea && `(${cart.deliveryArea === 'inside' ? t("abandoned_carts.inside_dhaka") : t("abandoned_carts.outside_dhaka")})`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] align-top">
                            <div className="space-y-2">
                              {cart.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  {item.image && (
                                    <Image
                                      src={item.image}
                                      alt={item.name}
                                      width={32}
                                      height={32}
                                      className="h-8 w-8 object-cover rounded bg-muted shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.color && `${t("abandoned_carts.color")}${item.color} `}
                                      {item.size && `${t("abandoned_carts.size")}${item.size} `}
                                      {t("abandoned_carts.qty")}{item.quantity} × ৳{item.price}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-primary align-top">
                            ৳{Math.round(cart.totalAmount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground align-top">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{format(new Date(cart.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cart._id)}
                              className="hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3">
                  {carts.map((cart) => (
                    <div key={cart._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
                      {/* Header: Customer name & Date */}
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base text-foreground flex items-center gap-1.5">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          {cart.fullName}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(cart.createdAt), 'dd MMM, hh:mm a')}
                        </span>
                      </div>

                      {/* Contact & Address */}
                      <div className="space-y-2 text-sm md:text-xs">
                        <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                          <span className="text-muted-foreground">{t("abandoned_carts.phone") || "Phone"}:</span>
                          <a href={`tel:${cart.phone}`} className="hover:underline text-primary font-semibold text-sm">
                            {cart.phone}
                          </a>
                        </div>
                        {cart.email && (
                          <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                            <span className="text-muted-foreground">{t("abandoned_carts.email") || "Email"}:</span>
                            <span className="text-foreground font-medium truncate max-w-[200px]">{cart.email}</span>
                          </div>
                        )}
                        {cart.street && (
                          <div className="flex flex-col gap-1 py-1 border-t border-border/30">
                            <span className="text-muted-foreground">{t("abandoned_carts.address") || "Address"}:</span>
                            <span className="text-foreground text-xs leading-relaxed">
                              {cart.street} {cart.deliveryArea && `(${cart.deliveryArea === 'inside' ? t("abandoned_carts.inside_dhaka") : t("abandoned_carts.outside_dhaka")})`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cart Items */}
                      <div className="border-t border-dashed pt-2 space-y-2">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">{t("abandoned_carts.cart_items")}:</span>
                        <div className="space-y-2">
                          {cart.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2.5 text-sm bg-muted/30 p-1.5 rounded-lg border border-border/20">
                              {item.image && (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 object-cover rounded-md bg-muted shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {item.color && `Color: ${item.color} `}
                                  {item.size && `Size: ${item.size} `}
                                  Qty: {item.quantity} × ৳{item.price}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Total amount and delete button */}
                      <div className="flex items-center justify-between border-t pt-2.5 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("abandoned_carts.total_amount")}</span>
                          <span className="font-bold text-lg text-primary">৳{Math.round(cart.totalAmount).toLocaleString()}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(cart._id)}
                          className="h-9 w-9 p-0 text-destructive border-destructive/20 hover:bg-destructive/10 flex items-center justify-center rounded-xl"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Component */}
                <div className="flex items-center justify-end">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    baseUrl="/admin/abandoned-carts"
                    query={{
                      search: debouncedSearch,
                      from: dateFilter.from,
                      to: dateFilter.to
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AbandonedCartsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AbandonedCartsContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Trash, Search, User, Phone, MapPin, Calendar, Download, RefreshCw, Loader2,
  SlidersHorizontal, Copy
} from 'lucide-react';
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
import { getWhatsAppLink } from '@/lib/utils';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    {...props}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z" />
  </svg>
);

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
  const [filterByDate, setFilterByDate] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
  }, [debouncedSearch, filterByDate, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

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
        from: filterByDate ? dateFilter.from : '',
        to: filterByDate ? dateFilter.to : ''
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
  }, [currentPage, debouncedSearch, filterByDate, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isFilterActive = !!(searchTerm || (filterByDate && (dateFilter.from || dateFilter.to)));

  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setDateFilter({ from: '', to: '' });
    setFilterByDate(false);
    setCurrentPage(1);
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
        from: filterByDate ? dateFilter.from : '',
        to: filterByDate ? dateFilter.to : ''
      });

      const res = await fetch(`/api/cart/abandoned?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data for export');
      const data = await res.json();
      const allCarts = data.carts || [];

      if (allCarts.length === 0) {
        toast.error(t("abandoned_carts.no_carts_export") as string);
        return;
      }

      const headers = ['Full Name', 'Phone', 'Email', 'Address', 'Area', 'Items', 'Total Amount', 'Created At'];
      const rows = allCarts.map((c: any) => {
        const items = c.items?.map((i: any) => `${i.quantity}x ${i.name} (${i.color || ''} ${i.size || ''})`).join('; ') || '';
        return [
          c.fullName,
          c.phone,
          c.email || '',
          c.street || '',
          c.deliveryArea || '',
          items,
          c.totalAmount,
          format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm')
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
    <div className="space-y-4 md:space-y-6 px-[2px] pt-[2px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("abandoned_carts.title")}</h1>
            <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">
              {t("abandoned_carts.desc")}
            </p>
          </div>
          {/* Mobile-only Export Button */}
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="md:hidden font-bold text-xs h-9 px-3 shrink-0"
          >
            <Download className="mr-1 h-3.5 w-3.5" /> {t("abandoned_carts.export")}
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Mobile Filter Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`h-9 px-3 md:hidden flex-1 ${showMobileFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            {t("abandoned_carts.filters")}
            {isFilterActive && (
              <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>

          {/* Reload Button */}
          <Button
            variant="outline"
            onClick={() => fetchCarts(currentPage)}
            className="font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 shrink-0 flex-1 md:flex-none"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {t("abandoned_carts.reload")}
          </Button>

          {/* Desktop-only Export Button */}
          <Button
            onClick={exportToCSV}
            className="hidden md:flex font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t("abandoned_carts.export_csv")}
          </Button>
        </div>
      </div>

      {/* Desktop Search & Date Filter Bar */}
      <div className="hidden md:flex items-center gap-2 w-full">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("abandoned_carts.search_placeholder") as string}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full h-10"
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
            {t("abandoned_carts.filter_by_date")}
          </label>

          <div className={`flex items-center gap-1 bg-muted/50 p-1 rounded-md border w-auto h-10 transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
            <Input
              type="date"
              className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs font-medium"
              value={dateFilter.from}
              onChange={(e) => {
                setDateFilter(prev => ({ ...prev, from: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={!filterByDate}
            />
            <span className="text-muted-foreground text-xs">{t("abandoned_carts.to")}</span>
            <Input
              type="date"
              className="h-8 w-36 border-none bg-transparent focus-visible:ring-0 text-xs font-medium"
              value={dateFilter.to}
              onChange={(e) => {
                setDateFilter(prev => ({ ...prev, to: e.target.value }));
                setCurrentPage(1);
              }}
              disabled={!filterByDate}
            />
          </div>
        </div>

        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-primary shrink-0"
          >
            {t("abandoned_carts.clear_all")}
          </Button>
        )}
      </div>

      {/* Collapsible Mobile Filter Controls */}
      <div className={`grid transition-all duration-300 ease-in-out md:hidden w-full ${showMobileFilters
        ? 'grid-rows-[1fr] opacity-100 visible'
        : 'grid-rows-[0fr] opacity-0 invisible h-0 overflow-hidden'
        }`}>
        <div className="overflow-hidden flex flex-col gap-2.5 p-3 rounded-xl border bg-muted/30">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("abandoned_carts.search_placeholder") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full h-9 text-xs"
            />
          </div>

          {/* Mobile Date Filter */}
          <div className="flex flex-col gap-1.5 text-xs bg-background p-2 rounded-md border">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-foreground select-none">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
              />
              {t("abandoned_carts.filter_by_date")}
            </label>
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${!filterByDate ? 'opacity-40 pointer-events-none' : ''}`}>
              <Input
                type="date"
                className="h-7 w-full border border-input rounded bg-transparent focus-visible:ring-0 p-1 text-xs"
                value={dateFilter.from}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, from: e.target.value }));
                  setCurrentPage(1);
                }}
                disabled={!filterByDate}
              />
              <span className="text-muted-foreground text-[10px]">{t("abandoned_carts.to")}</span>
              <Input
                type="date"
                className="h-7 w-full border border-input rounded bg-transparent focus-visible:ring-0 p-1 text-xs"
                value={dateFilter.to}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, to: e.target.value }));
                  setCurrentPage(1);
                }}
                disabled={!filterByDate}
              />
            </div>
          </div>

          {isFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-primary h-8"
            >
              {t("abandoned_carts.clear_all_filters")}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="border-0 md:border md:rounded-lg bg-transparent md:bg-card overflow-hidden">
        <div className="hidden md:block p-6 pb-2">
          <h2 className="text-lg font-bold">{t("abandoned_carts.cart_sessions")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("abandoned_carts.showing_sessions")}{carts.length}{t("abandoned_carts.showing_of")}{totalCount}{t("abandoned_carts.showing_active")}
          </p>
        </div>

        <div>
          {loading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {t("abandoned_carts.loading")}
            </div>
          ) : carts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-lg border md:border-0">
              {t("abandoned_carts.no_carts_found")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
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
                              {cart.fullName || 'Guest'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`tel:${cart.phone}`} className="hover:underline text-primary font-medium">
                                {cart.phone}
                              </a>
                              {cart.phone && (
                                <a
                                  href={getWhatsAppLink(cart.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 p-0.5"
                                  title="WhatsApp"
                                >
                                  <WhatsAppIcon className="h-3.5 w-3.5" />
                                </a>
                              )}
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
                        <TableCell className="align-top">
                          <div className="space-y-2 max-w-[350px]">
                            {cart.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                {item.image && (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 object-cover rounded bg-muted shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <span className="font-medium truncate block">{item.name}</span>
                                  <span className="text-xs text-muted-foreground block">
                                    {item.quantity} × ৳{item.price}
                                    {(item.color || item.size) && ` (${[item.color, item.size].filter(Boolean).join('/')})`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary align-top">
                          ৳{Math.round(cart.totalAmount).toLocaleString()}
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
                            title={t("abandoned_carts.yes_delete") || "Delete"}
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
                  <div key={cart._id} className="rounded-lg border bg-card text-card-foreground shadow-xs p-3.5 space-y-2.5">
                    {/* Header: Customer name & Date & Delete */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span>{cart.fullName || 'Guest'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {cart.createdAt ? format(new Date(cart.createdAt), 'dd MMM, hh:mm a') : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cart._id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          title={t("abandoned_carts.yes_delete") || "Delete"}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Contact & Address rows */}
                    <div className="space-y-1.5 text-xs">
                      {cart.phone && (
                        <div className="flex justify-between items-center py-1 border-b border-border/30">
                          <span className="font-semibold text-muted-foreground">{t("abandoned_carts.phone")}:</span>
                          <div className="flex items-center gap-1.5">
                            <a href={`tel:${cart.phone}`} className="hover:underline text-primary font-bold">
                              {cart.phone}
                            </a>
                            <a
                              href={getWhatsAppLink(cart.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 p-0.5"
                              title="WhatsApp"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(cart.phone);
                                  toast.success('Phone copied!');
                                } catch {
                                  toast.error('Failed to copy');
                                }
                              }}
                              className="text-muted-foreground hover:text-primary p-0.5"
                              title="Copy Phone"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {cart.email && (
                        <div className="flex justify-between items-center py-1 border-b border-border/30">
                          <span className="font-semibold text-muted-foreground">{t("abandoned_carts.email")}:</span>
                          <span className="text-foreground font-medium truncate max-w-[180px]">{cart.email}</span>
                        </div>
                      )}
                      {cart.street && (
                        <div className="flex justify-between items-start py-1 border-b border-border/30 gap-2">
                          <span className="font-semibold text-muted-foreground shrink-0">{t("abandoned_carts.address")}:</span>
                          <span className="text-foreground text-right text-[11px] leading-relaxed">
                            {cart.street} {cart.deliveryArea && `(${cart.deliveryArea === 'inside' ? t("abandoned_carts.inside_dhaka") : t("abandoned_carts.outside_dhaka")})`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                        {t("abandoned_carts.cart_items")}:
                      </span>
                      <div className="space-y-1.5">
                        {cart.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-muted/30 p-1.5 rounded-md border border-border/20">
                            {item.image && (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={36}
                                height={36}
                                className="h-9 w-9 object-cover rounded bg-muted shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground truncate">{item.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {item.quantity} × ৳{Math.round(item.price)}
                                {(item.color || item.size) && ` (${[item.color, item.size].filter(Boolean).join('/')})`}
                              </div>
                            </div>
                            <div className="font-bold text-foreground text-xs shrink-0">
                              ৳{Math.round(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="font-bold text-foreground text-xs">{t("abandoned_carts.total_amount")}:</span>
                      <span className="font-extrabold text-primary text-base">
                        ৳{Math.round(cart.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Component */}
              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-end border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    baseUrl="/admin/abandoned-carts"
                    query={{
                      search: debouncedSearch,
                      from: filterByDate ? dateFilter.from : '',
                      to: filterByDate ? dateFilter.to : ''
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
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

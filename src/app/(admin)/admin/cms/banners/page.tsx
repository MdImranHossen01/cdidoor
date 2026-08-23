'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash, Loader2, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BannersPage() {
  const { t } = useLanguage();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/admin/banners');
      if (!response.ok) {
        toast.error(`Failed to fetch banners: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setBanners(data);
    } catch (error) {
      toast.error('Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete the banner "${title}". This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2', // CDI Door Ind primary color roughly
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      background: '#fff',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/banners/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Banner deleted successfully');
          fetchBanners();
        } else {
          toast.error('Failed to delete banner');
        }
      } catch (error) {
        toast.error('Error deleting banner');
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`Banner ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchBanners();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("banners.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("banners.subtitle")}</p>
        </div>
        <Link href="/admin/cms/banners/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> {t("banners.add_banner")}
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background overflow-hidden shadow-sm">
        <Table className="block md:table">
          <TableHeader className="hidden md:table-header-group">
            <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 bg-muted/50">
              <TableHead className="w-[180px]">{t("banners.preview")}</TableHead>
              <TableHead>{t("banners.banner_title")}</TableHead>
              <TableHead>{t("banners.order")}</TableHead>
              <TableHead>{t("banners.status")}</TableHead>
              <TableHead>{t("banners.primary_cta")}</TableHead>
              <TableHead>{t("banners.secondary_cta")}</TableHead>
              <TableHead className="text-right">{t("banners.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-16 w-32 rounded-lg" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-36 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-12 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : banners.length === 0 ? (
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableCell colSpan={7} className="block md:table-cell py-1.5 md:py-4 text-left h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-lg font-medium">{t("banners.no_banners")}</p>
                    <p className="text-sm text-muted-foreground">{t("banners.no_banners_desc")}</p>
                    <Link href="/admin/cms/banners/new" className="mt-2">
                      <Button variant="outline" size="sm">{t("banners.add_banner")}</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner._id} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 group hover:bg-muted/30 transition-colors">
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="aspect-[21/9] w-full overflow-hidden rounded-md border bg-muted relative">
                      <Image
                        src={banner.image}
                        alt={banner.title}
                        width={180}
                        height={77}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <span className="font-semibold">{banner.title}</span>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <Badge variant="outline" className="font-mono">
                      {banner.order}
                    </Badge>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <button
                      onClick={() => toggleStatus(banner._id, banner.isActive)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <Badge variant={banner.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                        {banner.isActive ? t("banners.active") : t("banners.inactive")}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{banner.primaryBtnText || t("banners.shop_now")}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {banner.primaryBtnLink || t("banners.no_link")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{banner.secondaryBtnText || t("banners.contact")}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {banner.secondaryBtnLink || t("banners.no_link")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left md:text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/cms/banners/${banner._id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(banner._id, banner.title)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


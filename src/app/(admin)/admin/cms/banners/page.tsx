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
import { Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
      confirmButtonColor: '#00D1B2', // Primary color
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
    <div className="flex flex-col gap-4 px-0 pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 px-[1px] md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">{t("banners.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("banners.subtitle")}</p>
        </div>
        <Link href="/admin/cms/banners/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-none">
            <Plus className="mr-2 h-4 w-4" /> {t("banners.add_banner")}
          </Button>
        </Link>
      </div>

      <div className="hidden md:block rounded-md border bg-background overflow-hidden shadow-sm !mt-[1px] md:!mt-6 px-[1px] md:px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">{t("banners.preview")}</TableHead>
              <TableHead>{t("banners.banner_title")}</TableHead>
              <TableHead>{t("banners.order")}</TableHead>
              <TableHead>{t("banners.status")}</TableHead>
              <TableHead>{t("banners.primary_cta")}</TableHead>
              <TableHead>{t("banners.secondary_cta")}</TableHead>
              <TableHead className="text-right">{t("banners.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-16 w-32 rounded-lg" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : banners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-left h-40 text-center">
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
                <TableRow key={banner._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="py-4">
                    <div className="aspect-[21/9] w-[180px] overflow-hidden rounded-md border bg-muted relative">
                      <Image
                        src={banner.image}
                        alt={banner.title}
                        width={180}
                        height={77}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="font-semibold">{banner.title}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="font-mono">
                      {banner.order}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <button
                      onClick={() => toggleStatus(banner._id, banner.isActive)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <Badge variant={banner.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                        {banner.isActive ? t("banners.active") : t("banners.inactive")}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{banner.primaryBtnText || t("banners.shop_now")}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {banner.primaryBtnLink || t("banners.no_link")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{banner.secondaryBtnText || t("banners.contact")}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {banner.secondaryBtnLink || t("banners.no_link")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                        <Link href={`/admin/cms/banners/${banner._id}/edit`} className="w-full">
                          <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                            <Edit className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          onClick={() => handleDelete(banner._id, banner.title)}
                          className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
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
      <div className="block md:hidden space-y-3 px-[1px] py-1 bg-zinc-50/55 !mt-[1px] md:!mt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("banners.no_banners")}</p>
          </div>
        ) : (
          banners.map((banner) => (
            <div key={banner._id} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
              {/* Banner Image Preview */}
              <div className="aspect-[21/9] w-full overflow-hidden rounded-lg border bg-muted relative">
                <Image
                  src={banner.image}
                  alt={banner.title}
                  width={400}
                  height={171}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* Title & Status */}
              <div className="flex items-start justify-between gap-3 border-t border-border/30 pt-2 mt-1">
                <div>
                  <h4 className="font-bold text-base text-foreground leading-tight">{banner.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Order:</span>
                    <Badge variant="outline" className="font-mono text-xs py-0 px-1.5">{banner.order}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(banner._id, banner.isActive)}
                    className="transition-opacity hover:opacity-80"
                  >
                    <Badge variant={banner.isActive ? 'default' : 'secondary'} className="cursor-pointer text-xs px-2 py-0.5">
                      {banner.isActive ? t("banners.active") : t("banners.inactive")}
                    </Badge>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                      <Link href={`/admin/cms/banners/${banner._id}/edit`} className="w-full">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                          <Edit className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        onClick={() => handleDelete(banner._id, banner.title)}
                        className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-2 gap-2 border-t border-border/30 pt-2 text-xs">
                <div className="bg-muted/30 p-2 rounded-lg border border-border/20">
                  <span className="font-bold text-foreground block">{banner.primaryBtnText || t("banners.shop_now")}</span>
                  <span className="text-[10px] text-muted-foreground truncate block mt-0.5">{banner.primaryBtnLink || t("banners.no_link")}</span>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg border border-border/20">
                  <span className="font-bold text-foreground block">{banner.secondaryBtnText || t("banners.contact")}</span>
                  <span className="text-[10px] text-muted-foreground truncate block mt-0.5">{banner.secondaryBtnLink || t("banners.no_link")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


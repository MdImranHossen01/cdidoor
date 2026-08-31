'use client';

import { useState, useEffect } from 'react';
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

export default function FAQsPage() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFaqs = async () => {
    try {
      const response = await fetch('/api/admin/faqs');
      if (!response.ok) {
        toast.error(`${t("faqs.failed_fetch")} ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      toast.error(t("faqs.failed_fetch") as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleDelete = async (id: string, question: string) => {
    const result = await Swal.fire({
      title: t("faqs.delete_title"),
      text: `${t("faqs.delete_desc")} "${question}"${t("faqs.delete_desc_2")}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: t("faqs.yes_delete"),
      background: '#fff',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/faqs/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success(t("faqs.deleted") as string);
          fetchFaqs();
        } else {
          toast.error(t("faqs.failed_delete") as string);
        }
      } catch (error) {
        toast.error(t("faqs.error_delete") as string);
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`FAQ ${!currentStatus ? t("faqs.active") : t("faqs.inactive")}`);
        fetchFaqs();
      } else {
        toast.error(t("faqs.failed_update") as string);
      }
    } catch (error) {
      toast.error(t("faqs.error_update") as string);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-0 pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 px-[1px] md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">{t("faqs.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("faqs.desc")}</p>
        </div>
        <Link href="/admin/cms/faqs/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-none">
            <Plus className="mr-2 h-4 w-4" /> {t("faqs.add_faq")}
          </Button>
        </Link>
      </div>

      <div className="hidden md:block rounded-md border bg-background overflow-hidden shadow-sm !mt-[1px] md:!mt-6 px-[1px] md:px-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[400px]">{t("faqs.question")}</TableHead>
              <TableHead>{t("faqs.order")}</TableHead>
              <TableHead>{t("faqs.status")}</TableHead>
              <TableHead className="text-right">{t("faqs.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : faqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-left h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-lg font-medium">{t("faqs.no_faqs")}</p>
                    <p className="text-sm text-muted-foreground">{t("faqs.first_faq")}</p>
                    <Link href="/admin/cms/faqs/new" className="mt-2">
                      <Button variant="outline" size="sm">{t("faqs.add_faq")}</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              faqs.map((faq) => (
                <TableRow key={faq._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="py-4">
                    <span className="font-semibold line-clamp-2">{faq.question}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="font-mono">
                      {faq.order}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <button
                      onClick={() => toggleStatus(faq._id, faq.isActive)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <Badge variant={faq.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                        {faq.isActive ? t("faqs.active") : t("faqs.inactive")}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                        <Link href={`/admin/cms/faqs/${faq._id}/edit`} className="w-full">
                          <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                            <Edit className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{t("faqs.edit_faq") || "Edit"}</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          onClick={() => handleDelete(faq._id, faq.question)}
                          className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t("faqs.delete_faq") || "Delete"}</span>
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
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("faqs.no_faqs")}</p>
          </div>
        ) : (
          faqs.map((item) => (
            <div key={item._id} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
              {/* Header: Question Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-base text-foreground leading-snug">{item.question}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(item._id, item.isActive)}
                    className="transition-opacity hover:opacity-80"
                  >
                    <Badge variant={item.isActive ? 'default' : 'secondary'} className="cursor-pointer text-xs px-2 py-0.5">
                      {item.isActive ? t("faqs.active") : t("faqs.inactive")}
                    </Badge>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                      <Link href={`/admin/cms/faqs/${item._id}/edit`} className="w-full">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                          <Edit className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{t("faqs.edit_faq") || "Edit"}</span>
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        onClick={() => handleDelete(item._id, item.question)}
                        className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t("faqs.delete_faq") || "Delete"}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Order Meta details */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-2 mt-1">
                <span>Display Order:</span>
                <Badge variant="outline" className="font-mono text-xs py-0 px-1.5">{item.order}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


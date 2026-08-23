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
import { Plus, Edit, Trash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("faqs.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("faqs.desc")}</p>
        </div>
        <Link href="/admin/cms/faqs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> {t("faqs.add_faq")}
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background overflow-hidden shadow-sm">
        <Table className="block md:table">
          <TableHeader className="hidden md:table-header-group bg-muted/50">
            <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
              <TableHead className="w-[400px]">{t("faqs.question")}</TableHead>
              <TableHead>{t("faqs.order")}</TableHead>
              <TableHead>{t("faqs.status")}</TableHead>
              <TableHead className="text-right">{t("faqs.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-4 w-12 rounded" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : faqs.length === 0 ? (
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableCell colSpan={4} className="block md:table-cell py-1.5 md:py-4 text-left h-40 text-center">
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
                <TableRow key={faq._id} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 group hover:bg-muted/30 transition-colors">
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <span className="font-semibold line-clamp-2">{faq.question}</span>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <Badge variant="outline" className="font-mono">
                      {faq.order}
                    </Badge>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <button
                      onClick={() => toggleStatus(faq._id, faq.isActive)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <Badge variant={faq.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                        {faq.isActive ? t("faqs.active") : t("faqs.inactive")}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left md:text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/cms/faqs/${faq._id}/edit`}>
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
                        onClick={() => handleDelete(faq._id, faq.question)}
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


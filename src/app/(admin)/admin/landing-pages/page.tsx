'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  BarChart2,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LandingPagesPage() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/landing-pages');
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/landing-pages/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Page deleted successfully');
          fetchPages();
        } else {
          throw new Error('Failed to delete');
        }
      } catch (error) {
        toast.error('Could not delete page');
      }
    }
  };

  const handleCreate = async () => {
    const { value: formValues } = await Swal.fire({
      title: t("landing_pages.create_modal_title"),
      html:
        `<input id="swal-title" class="swal2-input" placeholder="${t("landing_pages.page_title_placeholder")}">` +
        `<input id="swal-slug" class="swal2-input" placeholder="${t("landing_pages.slug_placeholder")}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: t("landing_pages.create_btn"),
      cancelButtonText: t("landing_pages.cancel"),
      preConfirm: () => {
        return {
          title: (document.getElementById('swal-title') as HTMLInputElement).value,
          slug: (document.getElementById('swal-slug') as HTMLInputElement).value
        }
      }
    });

    if (formValues) {
      if (!formValues.title || !formValues.slug) {
        toast.error('Title and Slug are required');
        return;
      }

      try {
        const res = await fetch('/api/admin/landing-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });

        if (res.ok) {
          const newPage = await res.json();
          toast.success('Landing Page Created!');
          fetchPages();
        } else {
          const err = await res.json();
          toast.error(err.message || 'Failed to create');
        }
      } catch (error) {
        toast.error('Error creating page');
      }
    }
  };

  const filteredPages = pages.filter(p => {
    const searchTerm = (search || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const slug = (p.slug || '').toLowerCase();
    return title.includes(searchTerm) || slug.includes(searchTerm);
  });

  return (
    <div className="px-[1px] pt-[1px] pb-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            {t("landing_pages.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("landing_pages.subtitle")}</p>
        </div>
        <Button onClick={handleCreate} className="gap-2 rounded-full px-6 font-bold">
          <Plus className="h-4 w-4" /> {t("landing_pages.create_new")}
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("landing_pages.search_placeholder") as string}
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:block border rounded-2xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">{t("landing_pages.title_url")}</TableHead>
              <TableHead className="font-bold">{t("landing_pages.status")}</TableHead>
              <TableHead className="font-bold text-center">{t("landing_pages.sections")}</TableHead>
              <TableHead className="font-bold text-center">{t("landing_pages.orders")}</TableHead>
              <TableHead className="font-bold text-right">{t("landing_pages.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">{t("landing_pages.loading")}</TableCell>
              </TableRow>
            ) : filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t("landing_pages.no_pages")}</TableCell>
              </TableRow>
            ) : filteredPages.map((page) => (
              <TableRow key={page._id} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{page.title}</span>
                    <Link 
                      href={`/lp/${page.slug}`} 
                      target="_blank" 
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      /lp/{page.slug} <ExternalLink className="h-2 w-2" />
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={page.isActive ? "default" : "secondary"} className="rounded-full px-3">
                    {page.isActive ? t("landing_pages.active") : t("landing_pages.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="rounded-md font-mono">
                    {page.sections?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-bold text-emerald-600">
                  {page.orderCount || 0}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl">
                      <DropdownMenuLabel>{t("landing_pages.actions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/admin/landing-pages/${page._id}/builder`} className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-blue-500" /> {t("landing_pages.open_builder")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`/lp/${page.slug}`, '_blank')}>
                        <Eye className="h-4 w-4 text-emerald-500" /> {t("landing_pages.view_live")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2">
                        <BarChart2 className="h-4 w-4 text-purple-500" /> {t("landing_pages.analytics")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                        onClick={() => handleDelete(page._id)}
                      >
                        <Trash2 className="h-4 w-4" /> {t("landing_pages.delete_page")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <div className="h-4 bg-muted/60 animate-pulse rounded w-1/2" />
                <div className="h-3.5 bg-muted/60 animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("landing_pages.no_pages")}</p>
          </div>
        ) : (
          filteredPages.map((page) => (
            <div key={page._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
              {/* Header: Title, URL and Dropdown Action menu */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-base text-foreground leading-tight">{page.title}</h4>
                  <Link 
                    href={`/lp/${page.slug}`} 
                    target="_blank" 
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 font-medium"
                  >
                    /lp/{page.slug} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="shrink-0 -mr-1 -mt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 w-9 p-0 rounded-full flex items-center justify-center text-muted-foreground">
                        <MoreHorizontal className="h-4.5 w-4.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl">
                      <DropdownMenuLabel>{t("landing_pages.actions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/admin/landing-pages/${page._id}/builder`} className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-blue-500" /> {t("landing_pages.open_builder")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`/lp/${page.slug}`, '_blank')}>
                        <Eye className="h-4 w-4 text-emerald-500" /> {t("landing_pages.view_live")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2">
                        <BarChart2 className="h-4 w-4 text-purple-500" /> {t("landing_pages.analytics")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                        onClick={() => handleDelete(page._id)}
                      >
                        <Trash2 className="h-4 w-4" /> {t("landing_pages.delete_page")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Status and Meta Info Row */}
              <div className="flex flex-wrap gap-2 items-center border-t border-border/30 pt-2 mt-1 text-xs">
                <Badge variant={page.isActive ? "default" : "secondary"} className="rounded-full px-2.5 py-0.5 text-xs">
                  {page.isActive ? t("landing_pages.active") : t("landing_pages.inactive")}
                </Badge>
                <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs text-muted-foreground font-semibold">
                  <span>Sections:</span>
                  <span className="font-mono">{page.sections?.length || 0}</span>
                </div>
              </div>

              {/* Footer row: Orders count and builder quick link */}
              <div className="flex items-center justify-between border-t pt-2.5 mt-1">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{t("landing_pages.orders") || "Orders"}</span>
                  <span className="font-extrabold text-base text-emerald-600">{page.orderCount || 0}</span>
                </div>

                <Link href={`/admin/landing-pages/${page._id}/builder`}>
                  <Button variant="outline" size="sm" className="h-9 px-3 text-xs flex gap-1 font-bold items-center">
                    <Edit3 className="h-3.5 w-3.5" /> {t("landing_pages.open_builder") || "Builder"}
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

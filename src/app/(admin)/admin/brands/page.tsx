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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';

import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';
import { slugify, sanitizeSlugInput } from '@/lib/slugify';

const brandSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  slug: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
});

type BrandFormValues = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  const form = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      slug: '',
      image: '',
      isActive: true,
    },
  });

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      if (!response.ok) {
        toast.error(`Failed to fetch brands: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setBrands(data);
    } catch (error) {
      toast.error('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const onSubmit = async (values: BrandFormValues) => {
    setSubmitting(true);
    try {
      const url = editingBrand
        ? `/api/brands/${editingBrand._id}`
        : '/api/brands';
      const method = editingBrand ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(`Brand ${editingBrand ? 'updated' : 'created'} successfully`);
        setOpen(false);
        fetchBrands();
        form.reset();
        setEditingBrand(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error('Failed to save brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (brand: any) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      slug: brand.slug,
      image: brand.image || '',
      isActive: brand.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You are about to delete this brand. This may affect related products!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/brands/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Brand deleted successfully');
          fetchBrands();
        } else {
          toast.error('Failed to delete brand');
        }
      } catch (error) {
        toast.error('Error deleting brand');
      }
    }
  };

  // Watch name to generate slug
  const nameValue = form.watch('name');
  useEffect(() => {
    if (nameValue && !editingBrand) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, form, editingBrand]);

  return (
    <div className="flex-1 space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden flex flex-col gap-0 md:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0 w-full">
        <h1 className="hidden md:block text-2xl font-bold tracking-tight">{t("brands.title")}</h1>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingBrand(null);
            form.reset();
          }
        }}>
          <DialogTrigger render={<Button className="w-full sm:w-auto rounded-none h-10 bg-primary text-primary-foreground font-bold flex items-center justify-center" />}>
            <Plus className="mr-2 h-4 w-4" /> {t("brands.add_brand")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingBrand ? t("brands.edit_brand") : t("brands.add_brand")}</DialogTitle>
              <DialogDescription>
                {editingBrand
                  ? t("brands.update_details")
                  : t("brands.create_details")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("brands.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("brands.name_placeholder") as string} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("brands.slug")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("brands.slug_placeholder") as string}
                          {...field}
                          onChange={(e) => {
                            field.onChange(sanitizeSlugInput(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("brands.slug_description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("brands.brand_image")}</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onUpload={(url) => field.onChange(url)}
                          aspect="square"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBrand ? t("brands.update") : t("brands.create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block px-0 md:px-0 !mt-[1px] md:!mt-4">
        <div className="rounded-md border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t("brands.image")}</TableHead>
                <TableHead>{t("brands.name")}</TableHead>
                <TableHead>{t("brands.slug")}</TableHead>
                <TableHead>{t("brands.status")}</TableHead>
                <TableHead className="text-right">{t("brands.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t("brands.no_brands_found")}
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand._id}>
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                        {brand.image ? (
                          <Image src={brand.image} alt={brand.name} width={40} height={40} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand.slug}</TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                        {brand.isActive ? t("brands.active") : t("brands.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(brand)}
                        aria-label={`Edit ${brand.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(brand._id)}
                        aria-label={`Delete ${brand.name}`}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-3 px-0 md:px-0 !mt-[1px] md:!mt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-2">
                <div className="flex gap-3 items-center">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("brands.no_brands_found")}</p>
          </div>
        ) : (
          brands.map((brand) => (
            <div key={brand._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted shrink-0">
                  {brand.image ? (
                    <Image src={brand.image} alt={brand.name} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-foreground truncate">{brand.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{brand.slug}</div>
                </div>
                <Badge variant={brand.isActive ? 'default' : 'secondary'} className="shrink-0">
                  {brand.isActive ? t("brands.active") : t("brands.inactive")}
                </Badge>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => handleEdit(brand)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" /> {t("showroom_managers.edit") || "Edit"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(brand._id)}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" /> {t("products.delete") || "Delete"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


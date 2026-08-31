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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';
import { slugify, sanitizeSlugInput } from '@/lib/slugify';

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  slug: z.string().optional(),
  image: z.string().optional(),
  parentCategory: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      image: '',
      parentCategory: '',
      isActive: true,
    },
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        toast.error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        parentCategory: (values.parentCategory === 'none' || !values.parentCategory) ? null : values.parentCategory
      };
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}` 
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully`);
        setOpen(false);
        fetchCategories();
        form.reset();
        setEditingCategory(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      image: category.image || '',
      parentCategory: category.parentCategory?._id || category.parentCategory || '',
      isActive: category.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You are about to delete this category. This may affect related products!",
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
        const response = await fetch(`/api/categories/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Category deleted successfully');
          fetchCategories();
        } else {
          toast.error('Failed to delete category');
        }
      } catch (error) {
        toast.error('Error deleting category');
      }
    }
  };

  // Watch name to generate slug
  const nameValue = form.watch('name');
  useEffect(() => {
    if (nameValue && !editingCategory) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, form, editingCategory]);

  return (
    <div className="flex-1 space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden flex flex-col gap-0 md:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 md:gap-4 px-0 md:px-0 mb-[1px] md:mb-0 w-full">
        <h1 className="hidden md:block text-2xl font-bold tracking-tight">{t("categories.title")}</h1>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingCategory(null);
            form.reset();
          }
        }}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto rounded-none h-10 bg-primary text-primary-foreground font-bold flex items-center justify-center">
            <Plus className="mr-2 h-4 w-4" /> {t("categories.add_category")}
          </Button>
        </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? t("categories.edit_category") : t("categories.add_category")}</DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? t("categories.update_details") 
                  : t("categories.create_details")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("categories.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("categories.name_placeholder") as string} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!form.watch('parentCategory') || form.watch('parentCategory') === 'none' ? (
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("categories.slug")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("categories.slug_placeholder") as string} 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(sanitizeSlugInput(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("categories.slug_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <FormField
                  control={form.control}
                  name="parentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("categories.parent_category")}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("categories.select_parent") as string} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("categories.none_top_level")}</SelectItem>
                          {categories
                            .filter((c) => c._id !== editingCategory?._id)
                            .map((category) => (
                              <SelectItem key={category._id} value={category._id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!form.watch('parentCategory') || form.watch('parentCategory') === 'none' ? (
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("categories.category_image")}</FormLabel>
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
                ) : null}
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCategory ? t("categories.update") : t("categories.create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-4">
        <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t("categories.image")}</TableHead>
              <TableHead>{t("categories.name")}</TableHead>
              <TableHead>{t("categories.slug")}</TableHead>
              <TableHead>{t("categories.parent")}</TableHead>
              <TableHead>{t("categories.status")}</TableHead>
              <TableHead className="text-right">{t("categories.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("categories.no_categories_found")}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell>
                    <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                      {category.image ? (
                        <Image src={category.image} alt={category.name} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>
                    {category.parentCategory ? (
                      <Badge variant="outline">{category.parentCategory.name || 'Parent'}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? 'default' : 'secondary'}>
                      {category.isActive ? t("categories.active") : t("categories.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(category)}
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive" 
                      onClick={() => handleDelete(category._id)}
                      aria-label={`Delete ${category.name}`}
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
    </div>
  );
}


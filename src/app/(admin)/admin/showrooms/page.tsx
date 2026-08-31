'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash, Loader2, MoreVertical } from 'lucide-react';
import { AdminCardGridSkeleton } from '@/components/admin/AdminSkeletons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Swal from 'sweetalert2';
import { ImageUpload } from '@/components/ui/image-upload';
import { useLanguage } from '@/contexts/LanguageContext';

const showroomSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  address: z.string().optional(),
  image: z.string().optional(),
  manager: z.string().min(1, { message: 'Please select a manager.' }),
  isActive: z.boolean().default(true),
});

type ShowroomFormValues = z.infer<typeof showroomSchema>;

export default function ShowroomsPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingShowroom, setEditingShowroom] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(showroomSchema),
    defaultValues: {
      name: '',
      address: '',
      image: '',
      manager: '',
      isActive: true,
    },
  });

  const fetchShowrooms = async () => {
    try {
      const response = await fetch('/api/admin/showrooms');
      if (!response.ok) {
        toast.error(`Failed to fetch showrooms: ${response.status}`);
        return;
      }
      const data = await response.json();
      setShowrooms(data.showrooms || []);
    } catch (error) {
      toast.error('Failed to fetch showrooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/admin/showrooms/managers');
      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers || []);
      }
    } catch (error) {
      console.error('Failed to fetch managers', error);
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingShowroom(null);
      form.reset({ name: '', address: '', image: '', manager: '', isActive: true });
      setOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      router.replace(`/admin/showrooms${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
    }
  }, [searchParams, router, form]);

  useEffect(() => {
    fetchShowrooms();
    fetchManagers();
  }, []);

  const onSubmit = async (values: ShowroomFormValues) => {
    setSubmitting(true);
    try {
      const url = '/api/admin/showrooms';
      const method = editingShowroom ? 'PATCH' : 'POST';
      const payload = editingShowroom
        ? { id: editingShowroom._id, ...values }
        : values;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Showroom ${editingShowroom ? 'updated' : 'created'} successfully`);
        setOpen(false);
        fetchShowrooms();
        form.reset();
        setEditingShowroom(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error('Failed to save showroom');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (showroom: any) => {
    setEditingShowroom(showroom);
    form.reset({
      name: showroom.name,
      address: showroom.address || '',
      image: showroom.image || '',
      manager: showroom.manager?._id || showroom.manager || '',
      isActive: showroom.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You are about to delete this showroom!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch('/api/admin/showrooms', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          Swal.fire('Deleted!', 'Showroom has been deleted.', 'success');
          fetchShowrooms();
        } else {
          const err = await response.json();
          toast.error(err.message || 'Failed to delete');
        }
      } catch (error) {
        toast.error('Failed to delete showroom');
      }
    }
  };

  if (loading) {
    return <AdminCardGridSkeleton titleWidth="w-40" itemCount={6} aspectRatio="h-28 md:h-44" />;
  }

  return (
    <div className="flex-1 flex flex-col gap-4 px-0 pb-2 pt-[1px] md:mt-0 md:p-8 md:pt-6">
      <div className="hidden md:flex items-center justify-between gap-4 px-2 md:px-0">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight">{t("showrooms.title")}</h2>
        <Button onClick={() => {
          setEditingShowroom(null);
          form.reset({ name: '', address: '', image: '', manager: '', isActive: true });
          setOpen(true);
        }} className="h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm">
          <Plus className="mr-2 h-4 w-4" /> {t("showrooms.add_showroom")}
        </Button>
      </div>

      {showrooms.length === 0 ? (
        <div className="rounded-md border bg-white p-8 text-center text-muted-foreground">
          {t("showrooms.no_showrooms_found")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {showrooms.map((showroom) => (
            <div key={showroom._id} className="relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-300">
              {/* Image Section */}
              <div className="relative aspect-video w-full bg-muted overflow-hidden">
                {showroom.image ? (
                  <Image
                    src={showroom.image}
                    alt={showroom.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground text-xs md:text-sm font-medium">
                    {t("showrooms.no_showroom")}
                  </div>
                )}
                {/* Active/Inactive Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant={showroom.isActive ? 'default' : 'secondary'} className="shadow-sm font-semibold text-[8px] md:text-xs px-1.5 py-0">
                    {showroom.isActive ? t("showrooms.active") : t("showrooms.inactive")}
                  </Badge>
                </div>

                {/* 3-dot Actions Dropdown (Bottom Right) */}
                <div className="absolute bottom-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-white/95 text-black hover:bg-white shadow-md border border-muted hover:scale-105 active:scale-95 transition-all">
                        <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => handleEdit(showroom)} className="cursor-pointer font-medium text-xs md:text-sm">
                        <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> {t("showrooms.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(showroom._id)} className="cursor-pointer text-destructive focus:text-destructive font-medium text-xs md:text-sm">
                        <Trash className="mr-2 h-4 w-4 text-muted-foreground" /> {t("showrooms.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 p-2 md:p-5 space-y-2.5 md:space-y-4">
                <div>
                  <Link href={`/showrooms/${showroom._id}`} className="hover:text-primary transition-colors hover:underline">
                    <h3 className="text-xs md:text-base font-bold text-foreground truncate">{showroom.name}</h3>
                  </Link>
                  <p className="text-[10px] md:text-sm text-muted-foreground line-clamp-1 mt-0.5">{showroom.address || 'N/A'}</p>
                </div>

                {/* Manager Info */}
                <div className="rounded-lg bg-muted/30 p-1.5 md:p-3 border border-muted/50">
                  <span className="text-[8px] md:text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block mb-0.5">{t("showrooms.showroom_manager")}</span>
                  {showroom.manager ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="font-bold text-[10px] md:text-sm text-foreground truncate">{showroom.manager.name}</p>
                      <p className="text-[8px] md:text-xs text-muted-foreground truncate leading-tight">{showroom.manager.email}</p>
                      {showroom.manager.phone && (
                        <p className="text-[8px] md:text-xs text-muted-foreground truncate leading-tight">{showroom.manager.phone}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-destructive text-[8px] md:text-xs font-bold">{t("showrooms.no_manager")}</span>
                  )}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 gap-1 md:gap-3 pt-0.5 md:pt-1">
                  <div className="rounded-lg border bg-card p-1.5 md:p-3 text-center">
                    <span className="text-[7px] md:text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-0.5">{t("showrooms.todays_sales")}</span>
                    <span className="text-[10px] md:text-base font-black text-emerald-600">৳{Math.round(showroom.todaySales || 0)}</span>
                  </div>
                  <div className="rounded-lg border bg-card p-1.5 md:p-3 text-center">
                    <span className="text-[7px] md:text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-0.5">{t("showrooms.this_month_sales")}</span>
                    <span className="text-[10px] md:text-base font-black text-emerald-600">৳{Math.round(showroom.monthSales || 0)}</span>
                  </div>
                  <div className="rounded-lg border bg-card p-1.5 md:p-3 text-center">
                    <span className="text-[7px] md:text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-0.5">{t("showrooms.todays_cost")}</span>
                    <span className="text-[10px] md:text-base font-black text-rose-600">৳{Math.round(showroom.todayCost || 0)}</span>
                  </div>
                  <div className="rounded-lg border bg-card p-1.5 md:p-3 text-center">
                    <span className="text-[7px] md:text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-0.5">{t("showrooms.this_month_cost")}</span>
                    <span className="text-[10px] md:text-base font-black text-rose-600">৳{Math.round(showroom.monthCost || 0)}</span>
                  </div>
                  <div className="rounded-lg border bg-card p-1.5 md:p-3 text-center col-span-2">
                    <span className="text-[7px] md:text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-0.5">{t("showrooms.pending_approval")}</span>
                    <span className="text-[10px] md:text-base font-black text-amber-600">৳{Math.round(showroom.pendingCost || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingShowroom ? t("showrooms.edit_showroom") : t("showrooms.create_showroom")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("showrooms.showroom_dialog_desc")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("showrooms.showroom_name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Dhaka Showroom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("showrooms.address")}</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Mirpur-10, Dhaka" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("showrooms.showroom_image")}</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onUpload={(url) => field.onChange(url)}
                        aspect="video"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("showrooms.assign_manager")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("showrooms.select_manager") as string}>
                            {(() => {
                              const mgr = managers.find((m) => m._id === field.value);
                              return mgr ? mgr.name : undefined;
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {managers.length === 0 ? (
                          <SelectItem value="none" disabled>{t("showrooms.no_managers")}</SelectItem>
                        ) : (
                          managers.map((manager) => (
                            <SelectItem key={manager._id} value={manager._id}>
                              {manager.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingShowroom ? t("showrooms.save_changes") : t("showrooms.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { 
  Plus, 
  Edit, 
  Trash, 
  Loader2, 
  Star,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TestimonialsPage() {
  const { t } = useLanguage();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: t("testimonials.verified_buyer") as string,
    content: '',
    image: '',
    rating: 5
  });

  const fetchTestimonials = async () => {
    try {
      const response = await fetch('/api/testimonials');
      if (!response.ok) throw new Error(t("testimonials.failed_fetch") as string);
      const data = await response.json();
      setTestimonials(data);
    } catch (error: any) {
      toast.error(error.message || (t("testimonials.failed_fetch") as string));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      role: t("testimonials.verified_buyer") as string,
      content: '',
      image: '',
      rating: 5
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (testimonial: any) => {
    setEditingId(testimonial._id);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      image: testimonial.image,
      rating: testimonial.rating || 5
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) {
      toast.error(t("testimonials.name_content_required") as string);
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch('/api/admin/testimonials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(t("testimonials.failed_save") as string);
      
      toast.success(editingId ? (t("testimonials.updated") as string) : (t("testimonials.saved") as string));
      setIsDialogOpen(false);
      fetchTestimonials();
    } catch (error: any) {
      toast.error(error.message || (t("testimonials.failed_save") as string));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: t("testimonials.delete_title"),
      text: `${t("testimonials.delete_desc")}"${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: t("testimonials.yes_delete"),
      background: '#fff',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch('/api/admin/testimonials', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) throw new Error(t("testimonials.failed_delete") as string);
        
        toast.success(t("testimonials.deleted") as string);
        fetchTestimonials();
      } catch (error: any) {
        toast.error(error.message || (t("testimonials.failed_delete") as string));
      }
    }
  };

  return (
    <div className="flex flex-col gap-0 md:gap-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 w-full mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">{t("testimonials.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("testimonials.desc")}</p>
        </div>
        <Button onClick={openAddDialog} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> {t("testimonials.add")}
        </Button>
      </div>

      <div className="hidden md:block rounded-md border bg-background overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">{t("testimonials.user")}</TableHead>
              <TableHead>{t("testimonials.customer_info")}</TableHead>
              <TableHead className="max-w-[400px]">{t("testimonials.content")}</TableHead>
              <TableHead>{t("testimonials.rating")}</TableHead>
              <TableHead className="text-right">{t("testimonials.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-3/4 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20 rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : testimonials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-left h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="text-lg font-medium">{t("testimonials.no_testimonials")}</p>
                    <p className="text-sm text-muted-foreground">{t("testimonials.no_testimonials_desc")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              testimonials.map((t) => (
                <TableRow key={t._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="py-4">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={t.image} alt={t.name} />
                      <AvatarFallback><UserIcon className="size-4" /></AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-[400px]">
                    <p className="text-sm line-clamp-2 italic text-muted-foreground">"{t.content}"</p>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex text-yellow-500">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="fill-current size-3" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                        onClick={() => openEditDialog(t)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDelete(t._id, t.name)}
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

      {/* Mobile View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-border/50 rounded-xl bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
                <Skeleton className="h-12 w-full rounded" />
              </div>
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-background rounded-xl border">
            <p className="font-semibold text-sm">{t("testimonials.no_testimonials")}</p>
          </div>
        ) : (
          testimonials.map((item) => (
            <div key={item._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
              {/* Top Row: User Avatar & Customer Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-border/60">
                    <AvatarImage src={item.image} alt={item.name} />
                    <AvatarFallback><UserIcon className="size-5" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                    <span className="text-xs text-muted-foreground block">{item.role}</span>
                  </div>
                </div>

                <div className="flex text-yellow-500 shrink-0">
                  {[...Array(item.rating || 5)].map((_, i) => (
                    <Star key={i} className="fill-current size-3.5" />
                  ))}
                </div>
              </div>

              {/* Content / Quote */}
              <div className="border-t border-border/30 pt-2 mt-1">
                <p className="text-sm italic text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/20 leading-relaxed">
                  "{item.content}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-dashed pt-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 text-xs flex gap-1 font-bold items-center"
                  onClick={() => openEditDialog(item)}
                >
                  <Edit className="h-3.5 w-3.5" /> {t("testimonials.edit") || "Edit"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs flex gap-1 font-bold items-center"
                  onClick={() => handleDelete(item._id, item.name)}
                >
                  <Trash className="h-3.5 w-3.5" /> {t("testimonials.delete") || "Delete"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? t("testimonials.edit_title") : t("testimonials.add_title")}</DialogTitle>
              <DialogDescription>
                {t("testimonials.dialog_desc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("testimonials.name_label")}</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={t("testimonials.name_placeholder") as string}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t("testimonials.role_label")}</Label>
                  <Input 
                    id="role" 
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    placeholder={t("testimonials.role_placeholder") as string}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">{t("testimonials.content_label")}</Label>
                <Textarea 
                  id="content" 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder={t("testimonials.content_placeholder") as string}
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">{t("testimonials.rating_label")}</Label>
                  <Input 
                    id="rating" 
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating} 
                    onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("testimonials.image_label")}</Label>
                  <ImageUpload 
                    value={formData.image}
                    onUpload={(url) => setFormData({...formData, image: url})}
                    className="h-24"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("testimonials.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? t("testimonials.update") : t("testimonials.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

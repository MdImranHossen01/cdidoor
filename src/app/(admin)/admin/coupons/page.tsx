'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag, 
  Calendar, 
  Users,
  Loader2,
  MoreVertical
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
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CouponForm } from '@/components/admin/CouponForm';
import Swal from 'sweetalert2';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CouponsPage() {
  const { t } = useLanguage();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const fetchCoupons = async () => {
    await Promise.resolve();
    try {
      const response = await fetch('/api/admin/coupons');
      if (response.ok) {
        const data = await response.json();
        setCoupons(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to fetch coupons');
      }
    } catch (error) {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Coupon?',
      text: 'Are you sure you want to delete this coupon? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Coupon deleted');
        fetchCoupons();
      } else {
        toast.error('Failed to delete coupon');
      }
    } catch (error) {
      toast.error('Error deleting coupon');
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    (coupon.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 px-[1px] pt-[1px] pb-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 w-full mb-[1px] md:mb-0">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold tracking-tight">{t("coupons.title")}</h2>
          <p className="text-muted-foreground">{t("coupons.subtitle")}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="w-full md:w-auto bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> {t("coupons.add_coupon")}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("coupons.create_new")}</DialogTitle>
              <DialogDescription>{t("coupons.create_desc")}</DialogDescription>
            </DialogHeader>
            <CouponForm onSuccess={() => {
              setIsAddDialogOpen(false);
              fetchCoupons();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("coupons.search_placeholder") as string}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table className="block md:table">
          <TableHeader className="hidden md:table-header-group bg-muted/50">
            <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
              <TableHead className="font-bold">{t("coupons.code")}</TableHead>
              <TableHead className="font-bold">{t("coupons.discount")}</TableHead>
              <TableHead className="font-bold">{t("coupons.min_purchase")}</TableHead>
              <TableHead className="font-bold">{t("coupons.expiry")}</TableHead>
              <TableHead className="font-bold">{t("coupons.usage")}</TableHead>
              <TableHead className="font-bold">{t("coupons.status")}</TableHead>
              <TableHead className="text-right font-bold">{t("coupons.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
            {loading ? (
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableCell colSpan={7} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredCoupons.length === 0 ? (
              <TableRow className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0">
                <TableCell colSpan={7} className="block md:table-cell py-1.5 md:py-4 text-left h-24 text-center text-muted-foreground">
                  {t("coupons.no_coupons")}
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon._id} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 hover:bg-muted/30 transition-colors">
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-bold">{coupon.code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `৳${coupon.discountValue}`}
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">৳{coupon.minPurchase}</TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <div className="flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      {coupon.usedCount} / {coupon.usageLimit || '∞'}
                    </div>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left">
                    <Badge variant={coupon.isActive ? "default" : "secondary"}>
                      {coupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="block md:table-cell py-1.5 md:py-4 text-left md:text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        render={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCoupon(coupon)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(coupon._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("coupons.edit_coupon")}</DialogTitle>
            <DialogDescription>{t("coupons.edit_desc")}</DialogDescription>
          </DialogHeader>
          {editingCoupon && (
            <CouponForm 
              initialData={editingCoupon} 
              onSuccess={() => {
                setEditingCoupon(null);
                fetchCoupons();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


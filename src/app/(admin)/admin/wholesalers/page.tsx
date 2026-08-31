'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2,
  X,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  MoreVertical,
  Edit,
  Search,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { ImageUpload } from '@/components/ui/image-upload';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

interface Wholesaler {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  nidImage?: string;
  tradeLicenseImage?: string;
  createdAt: string;
  totalDue?: number;
  orderCount?: number;
  totalOrderValue?: number;
}

export default function AdminWholesalersPage() {
  const { t } = useLanguage();
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Wholesaler Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formNidImage, setFormNidImage] = useState('');
  const [formTradeLicenseImage, setFormTradeLicenseImage] = useState('');

  // Edit Wholesaler Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editNidImage, setEditNidImage] = useState('');
  const [editTradeLicenseImage, setEditTradeLicenseImage] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [collectingId, setCollectingId] = useState<string | null>(null);

  const fetchData = async () => {
    // Defer execution to avoid calling setState synchronously within the useEffect hook
    await Promise.resolve();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wholesalers');
      if (res.ok) {
        const data = await res.json();
        setWholesalers(data.wholesalers || []);
      } else {
        toast.error('Failed to load wholesalers');
      }
    } catch (error) {
      console.error('Error fetching wholesalers:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRegisterWholesaler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      toast.error('Name, Email, and Password are required');
      return;
    }
    try {
      const response = await fetch('/api/admin/wholesalers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          phone: formPhone,
          image: formImage,
          nidImage: formNidImage,
          tradeLicenseImage: formTradeLicenseImage
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Wholesaler registered successfully',
          confirmButtonColor: '#eab308'
        });
        setShowAddModal(false);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormPhone('');
        setFormImage('');
        setFormNidImage('');
        setFormTradeLicenseImage('');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to register wholesaler');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleRevokeWholesaler = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will revoke ${name}'s wholesale account privileges!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Revoke',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/wholesalers/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          toast.success('Wholesaler status revoked successfully');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to revoke status');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const handleEditWholesaler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWholesaler) return;
    try {
      const response = await fetch(`/api/admin/wholesalers/${editingWholesaler._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          image: editImage,
          nidImage: editNidImage,
          tradeLicenseImage: editTradeLicenseImage
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Wholesaler profile updated successfully',
          confirmButtonColor: '#eab308'
        });
        setShowEditModal(false);
        setEditingWholesaler(null);
        setEditImage('');
        setEditNidImage('');
        setEditTradeLicenseImage('');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to update wholesaler');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleCollectCash = async (wholesaler: Wholesaler) => {
    if (collectingId) return;
    const dueAmount = wholesaler.totalDue || 0;
    const { value: amount } = await Swal.fire({
      title: `Collect Cash from ${wholesaler.name}`,
      text: `Total outstanding credit due: ৳${dueAmount.toLocaleString()}`,
      input: 'number',
      inputLabel: 'Amount Received (৳)',
      inputValue: dueAmount,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          return 'Please enter a valid positive amount';
        }
      }
    });

    if (amount) {
      setCollectingId(wholesaler._id);
      try {
        const res = await fetch(`/api/admin/wholesalers/${wholesaler._id}/collect-cash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Number(amount) })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to apply payment');
        }

        Swal.fire({
          icon: 'success',
          title: 'Collected!',
          text: 'Cash received and applied to oldest invoices successfully.',
          confirmButtonColor: '#eab308'
        });
        fetchData();
      } catch (error: any) {
        toast.error(error.message || 'Error collecting cash');
      } finally {
        setCollectingId(null);
      }
    }
  };

  const filteredWholesalers = wholesalers.filter((w) => {
    // 1. Search filter
    const matchesSearch = 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm));
    
    // 2. Status filter
    let matchesStatus = true;
    if (statusFilter === 'paid') {
      matchesStatus = (w.totalDue || 0) === 0;
    } else if (statusFilter === 'due') {
      matchesStatus = (w.totalDue || 0) > 0;
    }
    
    // 3. Date filter
    let matchesDate = true;
    if (dateFilter.from) {
      matchesDate = matchesDate && new Date(w.createdAt) >= new Date(dateFilter.from + 'T00:00:00');
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(w.createdAt) <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return <AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-56" showStats={true} />;
  }

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-black text-zinc-950">{t("wholesalers.title")}</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">{t("wholesalers.subtitle")}</p>
        </div>
        <div className="w-full sm:w-auto">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-primary-foreground font-bold flex items-center gap-1.5 h-10 text-xs md:text-sm md:h-11 px-4 rounded-none w-full sm:w-auto justify-center"
          >
            <UserPlus className="h-4 w-4" /> {t("wholesalers.register_wholesaler")}
          </Button>
        </div>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
          <Card className="border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-50/50">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder={t("wholesalers.search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full bg-white border-zinc-200 text-xs md:text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex gap-1.5">
                  {['all', 'paid', 'due'].map((filter) => (
                    <Button
                      key={filter}
                      variant={statusFilter === filter ? 'default' : 'outline'}
                      onClick={() => setStatusFilter(filter as any)}
                      className="capitalize font-bold h-9 text-xs"
                    >
                      {t(`wholesalers.${filter}`)}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-zinc-200 text-xs w-full sm:w-auto justify-between sm:justify-start">
                  <Input
                    type="date"
                    aria-label="Start date"
                    className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 p-0 text-zinc-700 text-xs"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  />
                  <span className="text-zinc-400 text-[10px]">{t("wholesalers.to")}</span>
                  <Input
                    type="date"
                    aria-label="End date"
                    className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 p-0 text-zinc-700 text-xs"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              {filteredWholesalers.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-60" />
                  <p className="font-medium">{t("wholesalers.no_wholesalers_found")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto md:overflow-visible">
                  <table className="w-full text-left border-collapse text-sm block md:table">
                    <thead className="hidden md:table-header-group">
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">{t("wholesalers.name")} / {t("wholesalers.contact_information")}</th>
                        <th className="p-4">{t("wholesalers.joined_date")}</th>
                        <th className="p-4">{t("wholesalers.order_info")}</th>
                        <th className="p-4">{t("wholesalers.total_due")}</th>
                        <th className="p-4 text-right">{t("wholesalers.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group space-y-3 md:space-y-0 p-3 md:p-0">
                      {filteredWholesalers.map((w) => (
                        <tr key={w._id} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-2 md:p-4 font-bold text-zinc-900 block md:table-cell text-left">
                            <div className="flex items-center gap-3">
                              {w.image ? (
                                <img 
                                  src={w.image} 
                                  alt={w.name} 
                                  className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {w.name ? w.name.charAt(0).toUpperCase() : 'W'}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-zinc-950 font-bold">{w.name}</span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-zinc-600 font-normal text-xs">
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{w.email}</span>
                                  </div>
                                  {w.phone && (
                                    <div className="flex items-center gap-1 text-zinc-500">
                                      <Phone className="h-3 w-3" />
                                      <span>{w.phone}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {w.nidImage && (
                                    <a href={w.nidImage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 font-bold uppercase rounded-full">
                                        NID
                                      </Badge>
                                    </a>
                                  )}
                                  {w.tradeLicenseImage && (
                                    <a href={w.tradeLicenseImage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 cursor-pointer bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 font-bold uppercase rounded-full">
                                        License
                                      </Badge>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        <td className="p-2 md:p-4 text-zinc-500 block md:table-cell text-left">
                          <span className="md:hidden text-[10px] text-muted-foreground font-bold mr-2 uppercase">Joined:</span>
                          <span className="text-xs md:text-sm">{new Date(w.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                        </td>
                        <td className="p-2 md:p-4 space-y-0.5 block md:table-cell text-left">
                          <span className="md:hidden text-[10px] text-muted-foreground font-bold mr-2 uppercase">Orders:</span>
                          <span className="font-bold text-zinc-800 text-xs md:text-sm">
                            ৳{Math.round(w.totalOrderValue || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium ml-1 md:block md:ml-0">
                            ({w.orderCount || 0} {w.orderCount === 1 ? t("wholesalers.order") : t("wholesalers.orders")})
                          </span>
                        </td>
                        <td className="p-2 md:p-4 block md:table-cell text-left">
                          <span className="md:hidden text-[10px] text-muted-foreground font-bold mr-2 uppercase">Total Due:</span>
                          <span className={`font-bold px-2.5 py-1 rounded text-xs inline-block ${(w.totalDue || 0) > 0 ? 'text-red-700 bg-red-50 border border-red-100' : 'text-zinc-500 bg-zinc-50 border border-zinc-200'}`}>
                            ৳{Math.round(w.totalDue || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 md:p-4 text-left md:text-right block md:table-cell border-t md:border-t-0 mt-2 md:mt-0 pt-2 md:pt-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4 text-zinc-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border border-zinc-200 shadow-md rounded p-1 min-w-[140px] z-50">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setEditingWholesaler(w);
                                  setEditName(w.name);
                                  setEditEmail(w.email);
                                  setEditPhone(w.phone || '');
                                  setEditImage(w.image || '');
                                  setEditNidImage(w.nidImage || '');
                                  setEditTradeLicenseImage(w.tradeLicenseImage || '');
                                  setShowEditModal(true);
                                }}
                                className="flex items-center gap-2 cursor-pointer text-zinc-700 hover:bg-zinc-50 p-2 text-xs rounded transition-colors"
                              >
                                <Edit className="h-3.5 w-3.5" /> {t("wholesalers.edit_profile")}
                              </DropdownMenuItem>
                              {(w.totalDue || 0) > 0 && (
                                <DropdownMenuItem 
                                  disabled={collectingId !== null}
                                  onClick={() => {
                                    if (collectingId) return;
                                    handleCollectCash(w);
                                  }}
                                  className={`flex items-center gap-2 cursor-pointer text-green-600 hover:bg-green-50 p-2 text-xs rounded transition-colors font-semibold border-t border-zinc-100/50 ${collectingId ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <CreditCard className="h-3.5 w-3.5" /> {collectingId === w._id ? t("wholesalers.collecting") : t("wholesalers.collect_cash")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleRevokeWholesaler(w._id, w.name)}
                                className="flex items-center gap-2 cursor-pointer text-red-600 hover:bg-red-50 p-2 text-xs rounded transition-colors border-t border-zinc-100/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> {t("wholesalers.revoke_privilege")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

      {/* Add Wholesaler Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in duration-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black text-zinc-900">{t("wholesalers.register_title")}</CardTitle>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleRegisterWholesaler} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="p-5 space-y-4 overflow-y-auto flex-1">
                <ImageUpload 
                  aspect="circle" 
                  value={formImage} 
                  onUpload={setFormImage} 
                  label={t("wholesalers.profile_photo")}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="wName">{t("wholesalers.full_name")}</Label>
                  <Input 
                    id="wName"
                    required
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    placeholder="e.g. Acme Corporates" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wEmail">{t("wholesalers.email_address")}</Label>
                  <Input 
                    id="wEmail"
                    type="email"
                    required
                    value={formEmail} 
                    onChange={(e) => setFormEmail(e.target.value)} 
                    placeholder="e.g. acme@example.com" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wPass">{t("wholesalers.password")}</Label>
                  <Input 
                    id="wPass"
                    type="password"
                    required
                    value={formPassword} 
                    onChange={(e) => setFormPassword(e.target.value)} 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wPhone">{t("wholesalers.phone_number")}</Label>
                  <Input 
                    id="wPhone"
                    value={formPhone} 
                    onChange={(e) => setFormPhone(e.target.value)} 
                    placeholder="+880 1700..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>NID Photo (Optional)</Label>
                    <ImageUpload 
                      aspect="video" 
                      value={formNidImage} 
                      onUpload={setFormNidImage} 
                      label="Upload NID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trade License (Optional)</Label>
                    <ImageUpload 
                      aspect="video" 
                      value={formTradeLicenseImage} 
                      onUpload={setFormTradeLicenseImage} 
                      label="Upload License"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>{t("wholesalers.cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">{t("wholesalers.register_btn")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {/* Edit Wholesaler Modal */}
      {showEditModal && editingWholesaler && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in duration-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black text-zinc-900">{t("wholesalers.edit_title")}</CardTitle>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingWholesaler(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleEditWholesaler} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="p-5 space-y-4 overflow-y-auto flex-1">
                <ImageUpload 
                  aspect="circle" 
                  value={editImage} 
                  onUpload={setEditImage} 
                  label={t("wholesalers.profile_photo")}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="editWName">{t("wholesalers.full_name")}</Label>
                  <Input 
                    id="editWName"
                    required
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    placeholder="e.g. Acme Corporates" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editWEmail">{t("wholesalers.email_address")}</Label>
                  <Input 
                    id="editWEmail"
                    type="email"
                    required
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    placeholder="e.g. acme@example.com" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editWPhone">{t("wholesalers.phone_number")}</Label>
                  <Input 
                    id="editWPhone"
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)} 
                    placeholder="+880 1700..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>NID Photo (Optional)</Label>
                    <ImageUpload 
                      aspect="video" 
                      value={editNidImage} 
                      onUpload={setEditNidImage} 
                      label="Upload NID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trade License (Optional)</Label>
                    <ImageUpload 
                      aspect="video" 
                      value={editTradeLicenseImage} 
                      onUpload={setEditTradeLicenseImage} 
                      label="Upload License"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => {
                  setShowEditModal(false);
                  setEditingWholesaler(null);
                }}>{t("wholesalers.cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold">{t("wholesalers.save_changes")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

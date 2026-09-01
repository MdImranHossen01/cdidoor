'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  CreditCard,
  MapPin,
  Filter,
  RotateCcw
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { divisions, bdDivisions, bdLocations } from '@/lib/bd-locations';
import { getWhatsAppLink } from '@/lib/utils';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={{ fill: 'currentColor', stroke: 'none' }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface Wholesaler {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  nidImage?: string;
  tradeLicenseImage?: string;
  division?: string;
  district?: string;
  thana?: string;
  area?: string;
  addresses?: {
    street?: string;
    division?: string;
    district?: string;
    thana?: string;
    area?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }[];
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
  const [formDivision, setFormDivision] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formThana, setFormThana] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formAddress, setFormAddress] = useState('');

  // Edit Wholesaler Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editNidImage, setEditNidImage] = useState('');
  const [editTradeLicenseImage, setEditTradeLicenseImage] = useState('');
  const [editDivision, setEditDivision] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editThana, setEditThana] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterThana, setFilterThana] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('');
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
          tradeLicenseImage: formTradeLicenseImage,
          division: formDivision,
          district: formDistrict,
          thana: formThana,
          area: formArea,
          address: formAddress
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
        setFormDivision('');
        setFormDistrict('');
        setFormThana('');
        setFormArea('');
        setFormAddress('');
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
          tradeLicenseImage: editTradeLicenseImage,
          division: editDivision,
          district: editDistrict,
          thana: editThana,
          area: editArea,
          address: editAddress
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
        setEditDivision('');
        setEditDistrict('');
        setEditThana('');
        setEditArea('');
        setEditAddress('');
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

    // 4. Geographic filters
    const wDiv = (w.division || w.addresses?.[0]?.division || '').trim();
    const wDist = (w.district || w.addresses?.[0]?.district || w.addresses?.[0]?.city || '').trim();
    const wThana = (w.thana || w.addresses?.[0]?.thana || w.addresses?.[0]?.state || '').trim();
    const wArea = (w.area || w.addresses?.[0]?.area || '').trim();

    let matchesGeo = true;
    if (filterDivision !== 'all') {
      matchesGeo = matchesGeo && wDiv.toLowerCase() === filterDivision.toLowerCase();
    }
    if (filterDistrict !== 'all') {
      matchesGeo = matchesGeo && wDist.toLowerCase() === filterDistrict.toLowerCase();
    }
    if (filterThana !== 'all') {
      matchesGeo = matchesGeo && wThana.toLowerCase() === filterThana.toLowerCase();
    }
    if (filterArea.trim() !== '') {
      matchesGeo = matchesGeo && wArea.toLowerCase().includes(filterArea.trim().toLowerCase());
    }
    
    return matchesSearch && matchesStatus && matchesDate && matchesGeo;
  });

  const availableFilterDistricts = filterDivision !== 'all' && bdDivisions[filterDivision] 
    ? bdDivisions[filterDivision] 
    : [];

  const availableFilterThanas = filterDistrict !== 'all' && bdLocations[filterDistrict] 
    ? bdLocations[filterDistrict] 
    : [];

  const isGeoFilterActive = filterDivision !== 'all' || filterDistrict !== 'all' || filterThana !== 'all' || filterArea.trim() !== '';

  const handleResetGeoFilter = () => {
    setFilterDivision('all');
    setFilterDistrict('all');
    setFilterThana('all');
    setFilterArea('');
  };

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
          <div className="p-5 border-b border-zinc-200 flex flex-col gap-4 bg-zinc-50/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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

              {/* Geographic Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-500 font-semibold mr-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Location Filter:</span>
                </div>

                <div className="w-36">
                  <Select
                    value={filterDivision}
                    onValueChange={(val) => {
                      setFilterDivision(val || 'all');
                      setFilterDistrict('all');
                      setFilterThana('all');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36">
                  <Select
                    disabled={filterDivision === 'all'}
                    value={filterDistrict}
                    onValueChange={(val) => {
                      setFilterDistrict(val || 'all');
                      setFilterThana('all');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="All Districts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Districts</SelectItem>
                      {availableFilterDistricts.map((dist) => (
                        <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36">
                  <Select
                    disabled={filterDistrict === 'all'}
                    value={filterThana}
                    onValueChange={(val) => setFilterThana(val || 'all')}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="All Thanas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Thanas</SelectItem>
                      {availableFilterThanas.map((th) => (
                        <SelectItem key={th} value={th}>{th}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36">
                  <Input
                    placeholder="Filter by Area..."
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {isGeoFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetGeoFilter}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Filter
                  </Button>
                )}
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
                      {filteredWholesalers.map((w) => {
                        const locParts = [
                          w.area || w.addresses?.[0]?.area,
                          w.thana || w.addresses?.[0]?.thana || w.addresses?.[0]?.state,
                          w.district || w.addresses?.[0]?.district || w.addresses?.[0]?.city,
                          w.division || w.addresses?.[0]?.division
                        ].filter(Boolean);

                        return (
                          <tr key={w._id} className="block md:table-row border md:border-b border-slate-100 rounded-xl p-3 sm:p-4 md:p-0 bg-white md:bg-transparent shadow-sm md:shadow-none mb-3 md:mb-0 hover:bg-zinc-50/50 transition-colors">
                            <td className="p-2 md:p-4 font-bold text-zinc-900 block md:table-cell text-left">
                              <div className="flex items-center gap-3">
                                {w.image ? (
                                  <Image 
                                    src={w.image} 
                                    alt={w.name} 
                                    width={36} 
                                    height={36}
                                    className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                    {w.name ? w.name.charAt(0).toUpperCase() : 'W'}
                                  </div>
                                )}
                                <div className="flex flex-col text-left">
                                  <span className="text-zinc-950 font-bold text-sm">{w.name}</span>
                                  {w.phone && (
                                    <div className="flex items-center gap-1 text-zinc-600 font-medium text-xs mt-0.5">
                                      <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                                      <a
                                        href={getWhatsAppLink(w.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline hover:text-green-600 inline-flex items-center gap-1 font-semibold transition-colors"
                                        title="Chat on WhatsApp"
                                      >
                                        <span>{w.phone}</span>
                                        <WhatsAppIcon className="h-3 w-3 text-green-600" />
                                      </a>
                                    </div>
                                  )}
                                  {w.email && (
                                    <div className="flex items-center gap-1 text-zinc-500 font-normal text-xs mt-0.5">
                                      <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                      <span>{w.email}</span>
                                    </div>
                                  )}
                                  {locParts.length > 0 && (
                                    <div className="flex items-center gap-1 text-zinc-500 font-normal text-[11px] mt-0.5">
                                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate max-w-[220px]">{locParts.join(', ')}</span>
                                    </div>
                                  )}
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
                                    setEditDivision(w.division || w.addresses?.[0]?.division || '');
                                    setEditDistrict(w.district || w.addresses?.[0]?.district || w.addresses?.[0]?.city || '');
                                    setEditThana(w.thana || w.addresses?.[0]?.thana || w.addresses?.[0]?.state || '');
                                    setEditArea(w.area || w.addresses?.[0]?.area || '');
                                    setEditAddress(w.addresses?.[0]?.street || '');
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
                      );
                    })}
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
          <Card className="w-full max-w-lg bg-white border border-zinc-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in duration-200">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Geographic Fields */}
                <div className="pt-2 border-t space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Location Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Division</Label>
                      <Select
                        value={formDivision}
                        onValueChange={(val) => {
                          setFormDivision(val || '');
                          setFormDistrict('');
                          setFormThana('');
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">District</Label>
                      <Select
                        disabled={!formDivision}
                        value={formDistrict}
                        onValueChange={(val) => {
                          setFormDistrict(val || '');
                          setFormThana('');
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {(formDivision && bdDivisions[formDivision] ? bdDivisions[formDivision] : []).map((dist) => (
                            <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Thana / Upazila</Label>
                      <Select
                        disabled={!formDistrict}
                        value={formThana}
                        onValueChange={(val) => setFormThana(val || '')}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Thana" />
                        </SelectTrigger>
                        <SelectContent>
                          {(formDistrict && bdLocations[formDistrict] ? bdLocations[formDistrict] : []).map((th) => (
                            <SelectItem key={th} value={th}>{th}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Area / Village</Label>
                      <Input
                        placeholder="e.g. Chowmatha, Road 4"
                        value={formArea}
                        onChange={(e) => setFormArea(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Street / Shop Address</Label>
                    <Input
                      placeholder="e.g. Shop #12, Ground Floor"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
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
          <Card className="w-full max-w-lg bg-white border border-zinc-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in duration-200">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                {/* Geographic Fields */}
                <div className="pt-2 border-t space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Location Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Division</Label>
                      <Select
                        value={editDivision}
                        onValueChange={(val) => {
                          setEditDivision(val || '');
                          setEditDistrict('');
                          setEditThana('');
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">District</Label>
                      <Select
                        disabled={!editDivision}
                        value={editDistrict}
                        onValueChange={(val) => {
                          setEditDistrict(val || '');
                          setEditThana('');
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {(editDivision && bdDivisions[editDivision] ? bdDivisions[editDivision] : []).map((dist) => (
                            <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Thana / Upazila</Label>
                      <Select
                        disabled={!editDistrict}
                        value={editThana}
                        onValueChange={(val) => setEditThana(val || '')}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Thana" />
                        </SelectTrigger>
                        <SelectContent>
                          {(editDistrict && bdLocations[editDistrict] ? bdLocations[editDistrict] : []).map((th) => (
                            <SelectItem key={th} value={th}>{th}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Area / Village</Label>
                      <Input
                        placeholder="e.g. Chowmatha, Road 4"
                        value={editArea}
                        onChange={(e) => setEditArea(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Street / Shop Address</Label>
                    <Input
                      placeholder="e.g. Shop #12, Ground Floor"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
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

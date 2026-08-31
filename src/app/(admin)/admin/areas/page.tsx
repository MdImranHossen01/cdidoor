'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Trash2,
  Search,
  Loader2,
  X,
  MoreHorizontal,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { divisions, bdDivisions, bdLocations } from '@/lib/bd-locations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AreaData {
  _id: string;
  name: string;
  division: string;
  district?: string;
  thana?: string;
  createdAt: string;
}

export default function AdminAreasPage() {
  const { t } = useLanguage();
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedThana, setSelectedThana] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaData | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editDivision, setEditDivision] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editThana, setEditThana] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/areas');
      if (res.ok) {
        const data = await res.json();
        setAreas(data || []);
      } else {
        toast.error('Failed to load areas');
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim() || !selectedDivision) {
      toast.error('Area name and division are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAreaName.trim(),
          division: selectedDivision,
          district: selectedDistrict || undefined,
          thana: selectedThana || undefined
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Area created successfully',
          confirmButtonColor: 'var(--primary)'
        });
        setNewAreaName('');
        setSelectedDivision('');
        setSelectedDistrict('');
        setSelectedThana('');
        setShowAddModal(false);
        fetchAreas();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to create area');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !editAreaName.trim() || !editDivision) {
      toast.error('Area name and division are required');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/areas/${editingArea._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAreaName.trim(),
          division: editDivision,
          district: editDistrict || undefined,
          thana: editThana || undefined
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Area updated successfully',
          confirmButtonColor: 'var(--primary)'
        });
        setEditingArea(null);
        setEditAreaName('');
        setEditDivision('');
        setEditDistrict('');
        setEditThana('');
        setShowEditModal(false);
        fetchAreas();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to update area');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating area');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteArea = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/areas/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Area has been deleted.',
            icon: 'success',
            confirmButtonColor: 'var(--primary)'
          });
          fetchAreas();
        } else {
          toast.error('Failed to delete area');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error deleting area');
      }
    }
  };

  // Filtered areas list
  const filteredAreas = areas.filter(area => {
    const matchesSearch = 
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (area.district && area.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (area.thana && area.thana.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="flex-1 space-y-0 md:space-y-4 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.areas_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.areas_desc")}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-none h-10 font-bold">
          <Plus className="h-4 w-4" />
          {t("settings.add_area")}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-0 md:px-0 !mt-[1px] md:!mt-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search areas..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-0 md:px-0 !mt-[1px] md:!mt-4">
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <AdminTableSkeleton rowCount={6} columnCount={5} />
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-base font-semibold">{t("settings.no_areas")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto md:overflow-visible">
                {/* Desktop Table View */}
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="px-6 py-4 text-left font-bold text-muted-foreground/80">{t("settings.area_name")}</th>
                      <th className="px-6 py-4 text-left font-bold text-muted-foreground/80">{t("settings.division")}</th>
                      <th className="px-6 py-4 text-left font-bold text-muted-foreground/80">{t("settings.district")}</th>
                      <th className="px-6 py-4 text-left font-bold text-muted-foreground/80">{t("settings.thana")}</th>
                      <th className="px-6 py-4 text-right font-bold text-muted-foreground/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredAreas.map((area) => (
                      <tr key={area._id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">{area.name}</td>
                        <td className="px-6 py-4 text-foreground/90">{area.division}</td>
                        <td className="px-6 py-4 text-foreground/90">{area.district || '-'}</td>
                        <td className="px-6 py-4 text-foreground/90">{area.thana || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingArea(area);
                                  setEditAreaName(area.name);
                                  setEditDivision(area.division);
                                  setEditDistrict(area.district || '');
                                  setEditThana(area.thana || '');
                                  setShowEditModal(true);
                                }}
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteArea(area._id)}
                                className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards List View */}
                <div className="block md:hidden space-y-3 p-3 bg-zinc-50/50">
                  {filteredAreas.map((area) => (
                    <div key={area._id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="font-bold text-zinc-900 text-sm">{area.name}</div>
                          <div className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Area Name</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingArea(area);
                                setEditAreaName(area.name);
                                setEditDivision(area.division);
                                setEditDistrict(area.district || '');
                                setEditThana(area.thana || '');
                                setShowEditModal(true);
                              }}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Edit className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteArea(area._id)}
                              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 border-t pt-3 text-[11px]">
                        <div>
                          <div className="text-zinc-500 font-semibold mb-0.5">Division</div>
                          <div className="font-bold text-zinc-800">{area.division}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 font-semibold mb-0.5">District</div>
                          <div className="font-bold text-zinc-800">{area.district || '-'}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 font-semibold mb-0.5">Thana</div>
                          <div className="font-bold text-zinc-800">{area.thana || '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Area Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl bg-white border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {t("settings.add_area")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateArea} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.area_name")} <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Dhanmondi 27"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.division")} <span className="text-destructive">*</span></Label>
              <Select
                value={selectedDivision}
                onValueChange={(val) => {
                  setSelectedDivision(val || '');
                  setSelectedDistrict('');
                  setSelectedThana('');
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_division") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {divisions.map((div) => (
                    <SelectItem key={div} value={div}>
                      {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.district")}</Label>
              <Select
                disabled={!selectedDivision}
                value={selectedDistrict}
                onValueChange={(val) => {
                  setSelectedDistrict(val || '');
                  setSelectedThana('');
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_district") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {(bdDivisions[selectedDivision] || []).map((dist) => (
                    <SelectItem key={dist} value={dist}>
                      {dist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.thana")}</Label>
              <Select
                disabled={!selectedDistrict}
                value={selectedThana}
                onValueChange={(val) => setSelectedThana(val || '')}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_thana") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {(bdLocations[selectedDistrict] || []).map((th) => (
                    <SelectItem key={th} value={th}>
                      {th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl px-5 h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground rounded-xl px-5 h-10">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Area Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md rounded-3xl bg-white border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Edit Area
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateArea} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.area_name")} <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Dhanmondi 27"
                value={editAreaName}
                onChange={(e) => setEditAreaName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.division")} <span className="text-destructive">*</span></Label>
              <Select
                value={editDivision}
                onValueChange={(val) => {
                  setEditDivision(val || '');
                  setEditDistrict('');
                  setEditThana('');
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_division") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {divisions.map((div) => (
                    <SelectItem key={div} value={div}>
                      {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.district")}</Label>
              <Select
                disabled={!editDivision}
                value={editDistrict}
                onValueChange={(val) => {
                  setEditDistrict(val || '');
                  setEditThana('');
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_district") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {(bdDivisions[editDivision] || []).map((dist) => (
                    <SelectItem key={dist} value={dist}>
                      {dist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.thana")}</Label>
              <Select
                disabled={!editDistrict}
                value={editThana}
                onValueChange={(val) => setEditThana(val || '')}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={t("settings.select_thana") as string} />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  {(bdLocations[editDistrict] || []).map((th) => (
                    <SelectItem key={th} value={th}>
                      {th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingArea(null); }} className="rounded-xl px-5 h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-primary text-primary-foreground rounded-xl px-5 h-10">
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline Label for styling since Dialog doesn't have it imported separately
function Label({ children, className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm font-semibold text-gray-700 ${className || ''}`} {...props}>
      {children}
    </label>
  );
}

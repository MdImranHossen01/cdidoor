'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Trash2,
  Search,
  Loader2,
  X
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
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.areas_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.areas_desc")}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("settings.add_area")}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-4 md:px-0">
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

      <div className="px-4 md:px-0">
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteArea(area._id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Add Area Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl">
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
                <SelectContent>
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
                <SelectContent>
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
                <SelectContent>
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

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit,
  Mail,
  Phone,
  Store,
  Loader2,
  ShieldAlert,
  MoreHorizontal
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ShowroomManagersPage() {
  const { t } = useLanguage();
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingManager, setEditingManager] = useState<any>(null);
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formImage, setFormImage] = useState('');

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/showroom-managers');
      if (res.ok) {
        const data = await res.json();
        setManagers(data.managers || []);
      } else {
        toast.error('Failed to load showroom managers');
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load showroom managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleAddOrUpdateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingManager) {
        // Edit Manager
        const response = await fetch(`/api/admin/showroom-managers/${editingManager._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            phone: formPhone,
            image: formImage,
          })
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Manager details updated successfully',
            confirmButtonColor: '#eab308'
          });
          setEditingManager(null);
          setShowAddModal(false);
          resetForm();
          fetchManagers();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to update manager');
        }
      } else {
        // Create Manager
        if (!formName || !formEmail || !formPassword) {
          toast.error('Name, Email, and Password are required');
          return;
        }

        const response = await fetch('/api/admin/showroom-managers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            phone: formPhone,
            image: formImage,
          })
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Showroom Manager added successfully',
            confirmButtonColor: '#eab308'
          });
          setShowAddModal(false);
          resetForm();
          fetchManagers();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to add manager');
        }
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleEditClick = (manager: any) => {
    setEditingManager(manager);
    setFormName(manager.name);
    setFormEmail(manager.email);
    setFormPhone(manager.phone || '');
    setFormImage(manager.image || '');
    setShowAddModal(true);
  };

  const handleRevokeRole = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will revoke their showroom manager status and unassign them from any showrooms!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Revoke',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/showroom-managers/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Revoked!',
            text: 'Showroom Manager status has been revoked.',
            confirmButtonColor: '#eab308'
          });
          fetchManagers();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to revoke manager role');
        }
      } catch (err) {
        toast.error('Something went wrong');
      }
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormImage('');
    setEditingManager(null);
  };

  if (loading) {
    return <AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-56" />;
  }

  return (
    <div className="space-y-0 md:space-y-6 px-[1px] pt-[1px] pb-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-0 px-0 md:px-0">
        <div className="hidden md:block">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t("showroom_managers.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("showroom_managers.subtitle")}</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex gap-2 h-10 text-xs sm:text-sm md:h-11 px-4 rounded-none w-full sm:w-auto justify-center"
        >
          <UserPlus className="h-4 w-4" /> {t("showroom_managers.add_manager")}
        </Button>
      </div>

      {managers.length === 0 ? (
        <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
          <Card className="border-dashed border-2 py-10">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <h3 className="font-bold text-lg">{t("showroom_managers.no_managers_found")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("showroom_managers.no_managers_desc")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-0 md:px-0 !mt-[1px] md:!mt-6">
          <Card className="border-muted overflow-hidden">
            <CardContent className="p-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">{t("showroom_managers.name")}</TableHead>
                      <TableHead className="font-bold">{t("showroom_managers.email")}</TableHead>
                      <TableHead className="font-bold">{t("showroom_managers.phone")}</TableHead>
                      <TableHead className="font-bold">{t("showroom_managers.assigned_showroom")}</TableHead>
                      <TableHead className="font-bold text-right">{t("showroom_managers.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managers.map((manager) => (
                      <TableRow key={manager._id}>
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            {manager.image ? (
                              <Image 
                                src={manager.image} 
                                alt={manager.name} 
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-full object-cover border border-muted"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                {manager.name ? manager.name.charAt(0).toUpperCase() : 'M'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-sm md:text-base text-foreground">{manager.name}</div>
                              <div className="text-xs text-muted-foreground">{t("showroom_managers.role")}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-muted-foreground">
                          {manager.email}
                        </TableCell>
                        <TableCell className="py-4 text-sm text-muted-foreground">
                          {manager.phone || 'N/A'}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant={manager.showroomName === 'Not Assigned' ? 'outline' : 'default'}
                            className={`font-semibold border-none text-[10px] ${
                              manager.showroomName === 'Not Assigned' 
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' 
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {manager.showroomName === 'Not Assigned' ? t("showroom_managers.not_assigned") : manager.showroomName}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(manager)}
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRevokeRole(manager._id)}
                                className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Revoke</span>
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
              <div className="block md:hidden space-y-3 p-3 bg-zinc-50/55">
                {managers.map((manager) => (
                  <div key={manager._id} className="p-4 mb-3 border border-border/50 rounded-2xl bg-card bg-white shadow-sm flex flex-col gap-2.5 relative">
                    {/* Header info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {manager.image ? (
                          <Image 
                            src={manager.image} 
                            alt={manager.name} 
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-full object-cover border border-muted"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base border border-primary/20">
                            {manager.name ? manager.name.charAt(0).toUpperCase() : 'M'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-base text-foreground">{manager.name}</div>
                          <div className="text-xs text-muted-foreground">{t("showroom_managers.role")}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={manager.showroomName === 'Not Assigned' ? 'outline' : 'default'}
                          className={`font-semibold border-none text-xs px-2 py-0.5 ${
                            manager.showroomName === 'Not Assigned' 
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' 
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {manager.showroomName === 'Not Assigned' ? t("showroom_managers.not_assigned") : manager.showroomName}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-sm">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(manager)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Edit className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRevokeRole(manager._id)}
                              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Revoke</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm border-t pt-2 mt-1">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted-foreground">{t("showroom_managers.email")}:</span>
                        <span className="text-foreground font-semibold">{manager.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-t border-border/30">
                        <span className="text-muted-foreground">{t("showroom_managers.phone")}:</span>
                        <span className="text-foreground font-semibold">{manager.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-muted max-h-[90vh] flex flex-col">
            <CardHeader className="pb-4 border-b shrink-0">
              <CardTitle className="text-xl font-bold">
                {editingManager ? t("showroom_managers.edit_details") : t("showroom_managers.add_details")}
              </CardTitle>
              <CardDescription>
                {editingManager ? t("showroom_managers.edit_desc") : t("showroom_managers.add_desc")}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddOrUpdateManager} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="pt-6 space-y-4 overflow-y-auto flex-1">
                <ImageUpload 
                  aspect="circle" 
                  value={formImage} 
                  onUpload={setFormImage} 
                  label={t("showroom_managers.profile_photo")}
                />

                <div className="space-y-2">
                  <Label htmlFor="name">{t("showroom_managers.full_name")}</Label>
                  <Input 
                    id="name" 
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    placeholder="e.g. John Doe"
                    required 
                  />
                </div>

                {!editingManager && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("showroom_managers.email_address")}</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formEmail} 
                        onChange={(e) => setFormEmail(e.target.value)} 
                        placeholder="e.g. john@example.com"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t("showroom_managers.password")}</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={formPassword} 
                        onChange={(e) => setFormPassword(e.target.value)} 
                        placeholder="Min 6 characters"
                        required 
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("showroom_managers.phone_optional")}</Label>
                  <Input 
                    id="phone" 
                    value={formPhone} 
                    onChange={(e) => setFormPhone(e.target.value)} 
                    placeholder="e.g. 017XXXXXXXX" 
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-3 p-6 border-t bg-muted/10 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                >
                  {t("showroom_managers.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  {editingManager ? t("showroom_managers.update_details") : t("showroom_managers.add_manager_btn")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

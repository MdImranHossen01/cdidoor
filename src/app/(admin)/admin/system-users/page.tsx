'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  ShieldCheck,
  Search,
  MoreHorizontal,
  Trash2,
  Phone,
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  UserCog,
  Shield,
  Briefcase,
  Store,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import Image from 'next/image';
import { ImageUpload } from '@/components/ui/image-upload';
import { Pagination } from '@/components/ui/pagination';
import { useSession } from 'next-auth/react';

interface SystemUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'manager' | 'showroom_manager';
  image?: string;
  createdAt: string;
  lastActive?: string;
}

function SystemUsersContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [roleTab, setRoleTab] = useState<'all' | 'admin' | 'manager'>('all');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);

  // Assign System User Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assignIdentifier, setAssignIdentifier] = useState('');
  const [assignPassword, setAssignPassword] = useState('');
  const [assignRole, setAssignRole] = useState<'admin' | 'manager' | 'showroom_manager'>('admin');
  const [assignImage, setAssignImage] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchSystemUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (roleTab !== 'all') params.set('role', roleTab);

      const res = await fetch(`/api/admin/system-users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch system users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load system users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemUsers();
  }, [currentPage, roleTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchSystemUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAssignSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignIdentifier.trim()) {
      toast.error('Email or phone number is required');
      return;
    }

    setIsAssigning(true);
    try {
      const isEmail = assignIdentifier.includes('@');
      const payload = {
        name: assignName.trim(),
        [isEmail ? 'email' : 'phone']: assignIdentifier.trim(),
        password: assignPassword.trim(),
        role: assignRole,
        image: assignImage
      };

      const res = await fetch('/api/admin/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign system user');

      toast.success(data.message || 'System User assigned successfully!');
      setIsAssignOpen(false);
      setAssignName('');
      setAssignIdentifier('');
      setAssignPassword('');
      setAssignRole('admin');
      setAssignImage('');
      fetchSystemUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign access');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const result = await Swal.fire({
      title: 'Update System Role?',
      text: `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, update!',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        fetchSystemUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Error updating user role');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const result = await Swal.fire({
      title: 'Revoke Access?',
      text: `Are you sure you want to revoke system privileges and delete "${userName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove access!',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success(`Access for "${userName}" removed`);
        fetchSystemUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Error removing system access');
    }
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            System Users
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-0.5">
            Manage administrative personnel, project managers, and showroom managers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setIsAssignOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-4 sm:px-6 h-10 sm:h-11 shadow-lg shadow-blue-200 border-none transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Assign System User
          </Button>
          <div className="bg-primary/10 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-primary/20">
            <span className="text-primary font-bold text-xs sm:text-sm">{totalCount} System Accounts</span>
          </div>
        </div>
      </div>

      {/* Filters: Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 sm:h-11 rounded-xl border bg-white focus-visible:ring-primary/20 shadow-sm text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setRoleTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              roleTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              roleTab === 'admin' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="h-3 w-3" /> Admins
          </button>
          <button
            onClick={() => setRoleTab('manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              roleTab === 'manager' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-3 w-3" /> Managers
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Name & Contact</TableHead>
              <TableHead className="font-bold">System Role</TableHead>
              <TableHead className="font-bold">Assigned On</TableHead>
              <TableHead className="font-bold">Last Login</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="p-4 text-center text-muted-foreground animate-pulse">
                    Loading accounts...
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-medium">
                  No system users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border border-border/80">
                          <Image src={u.image} alt={u.name} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
                          <UserIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {u.email}
                            </span>
                          )}
                          {u.phone && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Phone className="h-3 w-3" /> {u.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`font-bold text-xs uppercase px-2.5 py-0.5 border-none shadow-none ${
                        u.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'manager'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {u.role === 'showroom_manager' ? 'Showroom Mgr' : u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {new Date(u.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {u.lastActive ? new Date(u.lastActive).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">Change Role</DropdownMenuLabel>
                          {u.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(u._id, 'admin')} className="cursor-pointer text-blue-600 font-bold">
                              <Shield className="mr-2 h-4 w-4" /> Make Admin
                            </DropdownMenuItem>
                          )}
                          {u.role !== 'manager' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(u._id, 'manager')} className="cursor-pointer text-emerald-600 font-bold">
                              <Briefcase className="mr-2 h-4 w-4" /> Make Manager
                            </DropdownMenuItem>
                          )}
                          {u.role !== 'showroom_manager' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(u._id, 'showroom_manager')} className="cursor-pointer text-purple-600 font-bold">
                              <Store className="mr-2 h-4 w-4" /> Make Showroom Mgr
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleUpdateRole(u._id, 'user')} className="cursor-pointer text-slate-600 font-bold">
                            <UserCog className="mr-2 h-4 w-4" /> Revoke to Regular User
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          className="text-destructive cursor-pointer font-bold bg-red-50 hover:bg-red-100"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Account
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

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-white rounded-2xl border">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-white rounded-2xl border">No system users found.</div>
        ) : (
          users.map((u) => (
            <div key={u._id} className="p-4 border rounded-xl bg-card shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {u.image ? (
                    <div className="relative h-10 w-10 rounded-full overflow-hidden border">
                      <Image src={u.image} alt={u.name} width={40} height={40} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email || u.phone}</div>
                  </div>
                </div>
                <Badge
                  className={`font-bold text-xs uppercase px-2 py-0.5 border-none ${
                    u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {u.role}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-muted-foreground">Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold text-blue-600"
                    onClick={() => handleUpdateRole(u._id, u.role === 'admin' ? 'manager' : 'admin')}
                  >
                    Switch Role
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteUser(u._id, u.name)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="py-4 border-t bg-background px-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Assign System User Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-blue-600 px-6 py-5 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Assign System User
              </DialogTitle>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mt-1">
                Grant Admin or Manager role using email or phone number.
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleAssignSystemUser} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 bg-white overflow-y-auto flex-1">
              <div className="flex flex-col items-center justify-center">
                <ImageUpload
                  aspect="circle"
                  value={assignImage}
                  onUpload={setAssignImage}
                  label="Profile Photo"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignRole('admin')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      assignRole === 'admin'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignRole('manager')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      assignRole === 'manager'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignRole('showroom_manager')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      assignRole === 'showroom_manager'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Showroom Mgr
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>

              {/* Email or Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Email or Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignIdentifier}
                  onChange={(e) => setAssignIdentifier(e.target.value)}
                  placeholder="email@example.com or 017xxxxxxxx"
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={assignPassword}
                  onChange={(e) => setAssignPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignOpen(false)}
                className="flex-1 h-11 rounded-xl font-bold border-2 hover:bg-slate-50 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAssigning}
                className="flex-[2] h-11 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-sm text-white shadow-lg shadow-blue-200 border-none group"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Confirm Assign
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SystemUsersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={6} columnCount={5} titleWidth="w-48" />}>
      <SystemUsersContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Loader2,
  User as UserIcon,
  Eye,
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  UserCog,
  Trash2,
  Search
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import { normalizePhoneNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import Image from 'next/image';
import Swal from 'sweetalert2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from '@/contexts/LanguageContext';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  phone?: string;
  addresses?: any[];
  createdAt: string;
  lastActive?: string;
  totalOrders: number;
  totalSpent: number;
  totalDue?: number;
  lastOrderDate?: string;
}

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));

  const [users, setUsers] = useState<UserData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage > 1) {
      Promise.resolve().then(() => {
        setCurrentPage(1);
      });
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.push(`/admin/users?${params.toString()}`);
    }
  }, [debouncedSearchTerm]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState(false);
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminImage, setAdminImage] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === 'super_admin' || userRole === 'admin';
  const isSuperAdmin = userRole === 'super_admin'; // kept for assign-admin button visibility

  useEffect(() => {
    if (status === 'authenticated' && !isAuthorized) {
      router.push('/admin/dashboard');
    }
  }, [status, isAuthorized, router]);

  const fetchUsers = async (page = currentPage) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=20&search=${debouncedSearchTerm}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchUsers(currentPage);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
    if (pageFromParams !== currentPage) {
      Promise.resolve().then(() => {
        setCurrentPage(pageFromParams);
      });
    }
  }, [searchParams]);

  if (status === 'loading') {
    return <AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" />;
  }

  if (status === 'authenticated' && !isAuthorized) {
    return null;
  }

  const openUserDetails = (user: UserData) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const result = await Swal.fire({
      title: 'Change User Role?',
      text: `Are you sure you want to change this user's role to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb', // blue-600
      cancelButtonColor: '#64748b', // slate-500
      confirmButtonText: 'Yes, change it!',
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
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Error updating user role');
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminIdentifier.trim()) {
      toast.error('Email or phone number is required');
      return;
    }

    const isEmail = adminIdentifier.includes('@');
    const email = isEmail ? adminIdentifier.trim() : undefined;
    const phone = !isEmail ? normalizePhoneNumber(adminIdentifier) : undefined;

    setIsAssigning(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          name: adminName,
          image: adminImage,
          phone,
          password: adminPassword
        }),
      });

      if (response.ok) {
        toast.success(`Successfully assigned Admin role to ${adminIdentifier}`);
        setAdminIdentifier('');
        setAdminName('');
        setAdminImage('');
        setAdminPassword('');
        setIsAssignAdminOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign admin');
      }
    } catch (error) {
      toast.error('Error assigning admin');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // red-500
      cancelButtonColor: '#64748b', // slate-500
      confirmButtonText: 'Yes, delete permanently!',
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
        toast.success(`User "${userName}" deleted successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  return (
    <div className="flex flex-col gap-0 md:gap-6 px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900">{t("users.title")}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">{t("users.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {(isSuperAdmin || (session?.user as any)?.role === 'admin') && (
            <Button
              onClick={() => setIsAssignAdminOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-4 sm:px-6 h-10 sm:h-11 shadow-lg shadow-blue-200 border-none transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
            >
              <ShieldCheck className="mr-1.5 sm:mr-2 h-4 w-4" />
              {t("users.assign_admin")}
            </Button>
          )}
          <div className="bg-primary/10 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-primary/20">
            <span className="text-primary font-bold text-xs sm:text-sm">{totalCount} {t("users.total_users")}</span>
          </div>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("users.search_placeholder") as string}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-10 sm:h-11 rounded-xl border bg-white focus-visible:ring-primary/20 shadow-sm text-sm"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">{t("users.name")} / {t("users.contact") || "Contact"}</TableHead>
              <TableHead className="font-bold">{t("users.orders")}</TableHead>
              <TableHead className="font-bold">{t("users.total_due") || "Due"}</TableHead>
              <TableHead className="font-bold">{t("users.role")}</TableHead>
              <TableHead className="font-bold">{t("users.joined")}</TableHead>
              <TableHead className="font-bold">{t("users.last_visit") || "Last Login"}</TableHead>
              <TableHead className="text-right font-bold">{t("users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-40 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <p className="text-muted-foreground">{t("users.no_users_found")}</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.image && user.image !== '' ? (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border shrink-0">
                          <Image
                            src={user.image}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                          <UserIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex flex-col text-left">
                        <button
                          onClick={() => openUserDetails(user)}
                          className="font-bold text-slate-900 hover:text-primary transition-colors text-left text-sm"
                        >
                          {user.name}
                        </button>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-slate-600 font-medium text-xs mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {user.email && (
                          <div className="flex items-center gap-1 text-slate-500 font-normal text-xs mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[240px]">{user.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{user.totalOrders} {t("users.orders")}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">৳{user.totalSpent.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${(user.totalDue || 0) > 0 ? 'text-red-700 bg-red-50 border border-red-100' : 'text-slate-500 bg-slate-50 border border-slate-200'}`}>
                      ৳{Math.round(user.totalDue || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === 'admin' || user.role === 'manager' ? 'default' : 'outline'}
                      className={`
                        capitalize px-3 py-0.5 rounded-full font-bold text-[10px] tracking-wider
                        ${user.role === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        ${user.role === 'manager' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      `}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : t("users.never") || 'Never'}
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
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">{t("users.user_actions")}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openUserDetails(user)} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">{t("users.management")}</DropdownMenuLabel>

                          {user.role !== 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(user._id, 'admin')}
                              className="cursor-pointer text-blue-600 font-bold"
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" /> {t("users.make_admin")}
                            </DropdownMenuItem>
                          )}

                          {user.role !== 'manager' && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(user._id, 'manager')}
                              className="cursor-pointer text-primary font-bold"
                            >
                              <UserCog className="mr-2 h-4 w-4" /> {t("users.make_manager")}
                            </DropdownMenuItem>
                          )}

                          {user.role !== 'user' && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(user._id, 'user')}
                              className="cursor-pointer text-slate-600 font-bold"
                            >
                              <UserCog className="mr-2 h-4 w-4" /> {t("users.make_user")}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive cursor-pointer font-medium">
                            <ShieldAlert className="mr-2 h-4 w-4" /> {t("users.suspend_user")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="text-destructive cursor-pointer font-bold bg-red-50 hover:bg-red-100 mt-1"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("users.delete_user")}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-150 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-40 rounded" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-white rounded-2xl border border-slate-100">
            {t("users.no_users_found")}
          </div>
        ) : (
          users.map((user) => (
            <div key={user._id} className="p-4 mb-3 border border-border/50 rounded-xl bg-card shadow-sm flex flex-col gap-2.5 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.image && user.image !== '' ? (
                    <div className="relative h-11 w-11 rounded-full overflow-hidden border border-border/60">
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <UserIcon className="h-5.5 w-5.5" />
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <button
                      onClick={() => openUserDetails(user)}
                      className="font-bold text-base text-slate-900 hover:underline text-left block"
                    >
                      {user.name}
                    </button>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-slate-600 font-medium text-xs mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.email && (
                      <div className="flex items-center gap-1 text-slate-500 font-normal text-xs mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{user.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={user.role === 'admin' || user.role === 'manager' ? 'default' : 'outline'}
                    className={`
                      capitalize px-2 py-0.5 rounded-full font-bold text-xs tracking-wider
                      ${user.role === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      ${user.role === 'manager' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    `}
                  >
                    {user.role}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary flex items-center justify-center">
                        <MoreHorizontal className="h-4.5 w-4.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">{t("users.user_actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openUserDetails(user)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" /> {t("bills.view_details")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator />

                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">{t("users.management")}</DropdownMenuLabel>

                        {user.role !== 'admin' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(user._id, 'admin')}
                            className="cursor-pointer text-blue-600 font-bold"
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" /> {t("users.make_admin")}
                          </DropdownMenuItem>
                        )}

                        {user.role !== 'manager' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(user._id, 'manager')}
                            className="cursor-pointer text-primary font-bold"
                          >
                            <UserCog className="mr-2 h-4 w-4" /> {t("users.make_manager")}
                          </DropdownMenuItem>
                        )}

                        {user.role !== 'user' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(user._id, 'user')}
                            className="cursor-pointer text-slate-600 font-bold"
                          >
                            <UserCog className="mr-2 h-4 w-4" /> {t("users.make_user")}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive cursor-pointer font-medium">
                          <ShieldAlert className="mr-2 h-4 w-4" /> {t("users.suspend_user")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="text-destructive cursor-pointer font-bold bg-red-50 hover:bg-red-100 mt-1"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("users.delete_user")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 mt-2">
                <div className="text-[10px] text-muted-foreground">
                  <span>{t("users.joined")}: </span>
                  <span className="font-semibold text-slate-700">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-xs block">{user.totalOrders} {t("users.orders")}</span>
                  <span className="text-[10px] text-muted-foreground block font-medium">৳{user.totalSpent.toLocaleString()} {t("users.spent")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="py-6 border-t bg-white px-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', page.toString());
              router.push(`?${params.toString()}`);
            }}
          />
        </div>
      )}

      {/* User Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
              {t("users.user_profile")}
              <Badge className="bg-primary/10 text-primary border-none">{selectedUser?.role}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="flex flex-col gap-6 pt-4">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0 bg-primary/10 flex items-center justify-center">
                  {selectedUser.image ? (
                    <Image
                      src={selectedUser.image}
                      alt={selectedUser.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-10 w-10 text-primary" />
                  )}
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h2 className="font-black text-2xl tracking-tight text-slate-900">{selectedUser.name}</h2>
                  <p className="text-muted-foreground font-medium">{selectedUser.email}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                    <Badge className="bg-primary/10 text-primary border-none font-bold">{selectedUser.role}</Badge>
                    <Badge variant="outline" className="font-bold">{t("users.id")}: {selectedUser._id.slice(-6).toUpperCase()}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t("users.contact_information")}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:border-primary/30 transition-colors">
                      <div className="p-2.5 bg-blue-50 rounded-xl">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t("users.phone_number")}</p>
                        <p className="text-sm font-bold text-slate-700">{selectedUser.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl border bg-white hover:border-primary/30 transition-colors">
                      <div className="p-2.5 bg-emerald-50 rounded-xl">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t("users.shipping_address")}</p>
                        <p className="text-sm font-bold text-slate-700 leading-snug">
                          {selectedUser.addresses && selectedUser.addresses.length > 0
                            ? `${selectedUser.addresses[0].street || ''}, ${selectedUser.addresses[0].city || ''}, ${selectedUser.addresses[0].state || ''}`
                            : t("users.no_address_saved")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t("users.order_statistics")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
                      <ShoppingBag className="h-6 w-6 text-orange-500 mb-2" />
                      <span className="text-2xl font-black text-orange-600">{selectedUser.totalOrders}</span>
                      <span className="text-[10px] font-bold uppercase text-orange-400">{t("users.total_orders")}</span>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center text-center">
                      <CreditCard className="h-6 w-6 text-primary mb-2" />
                      <span className="text-xl font-black text-primary">৳{selectedUser.totalSpent.toLocaleString()}</span>
                      <span className="text-[10px] font-bold uppercase text-primary/60">{t("users.total_spent")}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">{t("users.last_visit")}</span>
                      <span className="font-black text-slate-700">
                        {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : t("users.never")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">{t("users.last_order")}</span>
                      <span className="font-black text-slate-700">
                        {selectedUser.lastOrderDate ? new Date(selectedUser.lastOrderDate).toLocaleDateString() : t("users.no_orders")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full h-14 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 group">
                  {t("users.view_full_order_history")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Admin Modal */}
      <Dialog open={isAssignAdminOpen} onOpenChange={setIsAssignAdminOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-blue-600 px-6 py-5 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">{t("users.assign_admin_access")}</DialogTitle>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mt-1">Grant admin access using email or phone number.</p>
            </DialogHeader>
          </div>

          <form onSubmit={handleAssignAdmin} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-8 space-y-5 bg-white overflow-y-auto flex-1">
              {/* Profile Image */}
              <div className="flex flex-col items-center justify-center">
                <ImageUpload 
                  aspect="circle" 
                  value={adminImage} 
                  onUpload={setAdminImage} 
                  label={t("users.profile_photo") || "Profile Photo"}
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("users.full_name") || "Full Name"}</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>

              {/* Email or Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  {t("auth.login.email_phone") || "Email or Phone Number"}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="email@example.com or 017xxxxxxxx"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("users.password") || "Password"}</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>

              {/* Warning Note */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mt-2">
                <div className="h-4 w-4 rounded-full bg-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 font-bold leading-normal">
                  {t("users.admin_note")}
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignAdminOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-2 hover:bg-slate-50 text-sm"
              >
                {t("users.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isAssigning}
                className="flex-[2] h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-sm text-white shadow-xl shadow-blue-200 border-none group"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t("users.processing")}
                  </>
                ) : (
                  <>
                    {t("users.confirm_assign")}
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

export default function UsersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton rowCount={7} columnCount={5} titleWidth="w-48" />}>
      <UsersContent />
    </Suspense>
  );
}


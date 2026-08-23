'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
    Clock, 
    CheckCircle2, 
    Truck, 
    Package,
    ChevronRight,
    Loader2,
    FileText,
    AlertCircle,
    Calendar,
    DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrdersPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Employee Dashboard States
  const [attendance, setAttendance] = useState<any[]>([]);
  const [checkingInOut, setCheckingInOut] = useState(false);
  const [todayAtt, setTodayAtt] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const userRole = (session?.user as any)?.role;

        if (['employee', 'showroom_manager', 'manager'].includes(userRole)) {
          const [settingsRes, profileRes, attRes, taskRes] = await Promise.all([
            fetch('/api/settings'),
            fetch('/api/user/profile'),
            fetch('/api/admin/employees/attendance'),
            fetch('/api/admin/employees/tasks')
          ]);

          if (settingsRes.ok) setSettings(await settingsRes.json());
          if (profileRes.ok) setProfile(await profileRes.json());
          
          if (attRes.ok) {
            const data = await attRes.json();
            const list = data.attendance || [];
            setAttendance(list);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayRec = list.find((a: any) => a.date === todayStr);
            setTodayAtt(todayRec || null);
          }

          if (taskRes.ok) {
            const data = await taskRes.json();
            setTasks(data.tasks || []);
          }
        } else {
          const [ordersRes, settingsRes, profileRes] = await Promise.all([
            fetch('/api/orders'),
            fetch('/api/settings'),
            fetch('/api/user/profile')
          ]);

          if (ordersRes.ok) {
            const data = await ordersRes.json();
            setOrders(Array.isArray(data) ? data : []);
          } else {
            toast.error(`Failed to load orders: ${ordersRes.statusText || ordersRes.status}`);
          }

          if (settingsRes.ok) setSettings(await settingsRes.json());
          if (profileRes.ok) setProfile(await profileRes.json());
        }
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Placed': return 'secondary';
      case 'Confirmed': return 'default';
      case 'Paid': return 'default';
      case 'Ready for Delivery': return 'default';
      case 'Released for Delivery': return 'default';
      case 'Delivered': return 'default';
      case 'Cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const handleCheckInOut = async (action: 'check-in' | 'check-out') => {
    setCheckingInOut(true);
    try {
      const res = await fetch('/api/admin/employees/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        
        const attRes = await fetch('/api/admin/employees/attendance');
        if (attRes.ok) {
          const attData = await attRes.json();
          const list = attData.attendance || [];
          setAttendance(list);
          const todayStr = new Date().toISOString().split('T')[0];
          const todayRec = list.find((a: any) => a.date === todayStr);
          setTodayAtt(todayRec || null);
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Action failed');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setCheckingInOut(false);
    }
  };

  const handleMarkTaskCompleted = async (id: string) => {
    setMarkingComplete(id);
    try {
      const res = await fetch(`/api/admin/employees/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });

      if (res.ok) {
        toast.success('Task marked as Completed!');
        const taskRes = await fetch('/api/admin/employees/tasks');
        if (taskRes.ok) {
          const data = await taskRes.json();
          setTasks(data.tasks || []);
        }
      } else {
        toast.error('Failed to update task status');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setMarkingComplete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;

  if (['employee', 'showroom_manager', 'manager'].includes(userRole)) {
    const totalPresent = attendance.filter(a => ['Present', 'Late'].includes(a.status)).length;
    const totalLate = attendance.filter(a => a.status === 'Late').length;

    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Attendance Center</h1>
            <p className="text-sm text-muted-foreground mt-1">View your work records and attendance history here.</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <div className="text-2xl font-black">{totalPresent} Days</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Days Present</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <div className="text-2xl font-black text-amber-600">{totalLate} Days</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Late Check-ins</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-500/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
              <Calendar className="h-6 w-6 text-zinc-500" />
              <div className="text-2xl font-black">{attendance.length} Logs</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Logged Days</div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Tasks */}
        <div className="space-y-4 mt-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Assigned Tasks</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track your assigned work and submit completed tasks to get paid.</p>
          </div>
          <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">Task Title</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="font-bold">Payout</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold w-[160px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-zinc-400">
                      No tasks assigned yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task._id} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-bold text-zinc-900">{task.title}</TableCell>
                      <TableCell className="text-zinc-500 max-w-[250px] truncate" title={task.description}>
                        {task.description || 'No description'}
                      </TableCell>
                      <TableCell className="font-bold text-zinc-800">{task.payout?.toLocaleString()} Tk</TableCell>
                      <TableCell>
                        <Badge 
                          className="font-bold"
                          variant={
                            task.status === 'Paid' 
                              ? 'default' 
                              : task.status === 'Completed' 
                              ? 'secondary' 
                              : 'outline'
                          }
                        >
                          {task.status === 'Paid' ? 'Paid' : task.status === 'Completed' ? 'Completed (Pending Review)' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {task.status === 'Pending' ? (
                          <Button 
                            onClick={() => handleMarkTaskCompleted(task._id)}
                            disabled={markingComplete === task._id}
                            size="sm"
                            className="h-8 bg-primary text-primary-foreground font-bold"
                          >
                            {markingComplete === task._id ? 'Updating...' : 'Mark Completed'}
                          </Button>
                        ) : task.status === 'Completed' ? (
                          <span className="text-xs text-zinc-400 italic font-semibold">Pending Approval</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold">Paid & Cleared</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Attendance logs list */}
        <div className="rounded-xl border bg-background shadow-sm overflow-hidden mt-6">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Check In Time</TableHead>
                <TableHead className="font-bold">Check Out Time</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-zinc-400">
                    No logs found. Check in to get started!
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((log) => (
                  <TableRow key={log._id}>
                    <td className="p-4 font-bold text-zinc-900">{log.date}</td>
                    <td className="p-4 text-zinc-600 font-medium">
                      {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                    <td className="p-4 text-zinc-600 font-medium">
                      {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                    <td className="p-4">
                      <Badge className="font-bold" variant={log.status === 'Present' ? 'default' : log.status === 'Late' ? 'secondary' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">{t('store.dashboard.order_history') || 'Order History'}</h1>
        <p className="text-sm text-muted-foreground">{orders.length} {t('store.dashboard.total_orders') || 'total orders found'}</p>
      </div>

      <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">{t('store.dashboard.order_id') || 'Order ID'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.date') || 'Date'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.items') || 'Items'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.total') || 'Total'}</TableHead>
              <TableHead className="font-bold">{t('store.dashboard.status') || 'Status'}</TableHead>
              <TableHead className="text-right font-bold w-[120px]">{t('store.dashboard.action') || 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2">
                         <Package className="h-8 w-8 text-muted-foreground opacity-20" />
                         <p className="text-muted-foreground">{t('store.dashboard.no_orders') || "You haven't placed any orders yet."}</p>
                    </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs">#{order?._id?.slice(-8).toUpperCase() || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-xs">{Array.isArray(order?.items) ? order.items.length : 0} {t('store.dashboard.items_count') || 'items'}</TableCell>
                  <TableCell className="font-bold">৳{typeof order?.totalAmount === 'number' ? Math.round(order.totalAmount) : '0'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getStatusColor(order.status) as any}>
                        {order.status}
                      </Badge>
                      {order.shippingDetails?.trackingUrl && (
                        <a 
                          href={order.shippingDetails.trackingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-1"
                        >
                          <Truck className="h-3 w-3" /> {t('store.dashboard.track_parcel') || 'Track Parcel'}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            title={settings ? "Download Invoice" : "Loading settings..."}
                            disabled={!settings}
                            onClick={() => settings && generateInvoicePDF(order, settings)}
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 group"
                            onClick={() => router.push(`/dashboard/orders/${order._id}`)}
                        >
                            {t('store.dashboard.details') || 'Details'}
                            <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-10">
          <Card className="bg-primary/5 border-none shadow-none">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  <div className="text-2xl font-black">৳{profile?.walletBalance || 0}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                    {t('store.dashboard.available_tokens') || 'Available Tokens'}
                  </div>
                  {profile?.isSubscriptionActive ? (
                    <Badge variant="default" className="text-[8px] h-4">{t('store.dashboard.active_subscriber') || 'Active Subscriber'}</Badge>
                  ) : (
                    <div className="text-[8px] text-muted-foreground">{t('store.dashboard.inactive') || 'Inactive'}</div>
                  )}
              </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  <div className="text-2xl font-black">{orders.filter(o => o.status === 'Pending').length}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('store.dashboard.pending_orders') || 'Pending Orders'}</div>
              </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  <div className="text-2xl font-black">{orders.filter(o => o.status === 'Shipped').length}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('store.dashboard.shipped_orders') || 'Shipped Orders'}</div>
              </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div className="text-2xl font-black">{orders.filter(o => o.status === 'Delivered').length}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('store.dashboard.delivered_orders') || 'Delivered Orders'}</div>
              </CardContent>
          </Card>
      </div>
    </>
  );
}


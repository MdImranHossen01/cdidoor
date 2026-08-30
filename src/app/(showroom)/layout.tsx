'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ShowroomSidebar } from '@/components/layout/ShowroomSidebar';
import ShowroomTopbar from '@/components/layout/ShowroomTopbar';

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role !== 'showroom_manager') {
        if (role === 'admin' || role === 'super_admin' || role === 'manager') {
          router.push('/admin/dashboard');
        } else if (role === 'employee') {
          router.push('/employee/dashboard');
        } else if (role === 'wholesaler') {
          router.push('/wholesaler/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <AdminDashboardSkeleton />;
  }

  if (status === 'unauthenticated') return null;

  const role = (session?.user as any)?.role;
  if (role !== 'showroom_manager') return null;

  return (
    <SidebarProvider>
      <ShowroomSidebar />
      <SidebarInset>
        <ShowroomTopbar />
        <main className="flex-1 items-start gap-4 px-[1px] py-4 md:px-4 md:py-6 md:gap-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

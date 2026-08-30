'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';
import { EmployeeSidebar } from '@/components/layout/EmployeeSidebar';
import EmployeeTopbar from '@/components/layout/EmployeeTopbar';
import { ShowroomSidebar } from '@/components/layout/ShowroomSidebar';
import ShowroomTopbar from '@/components/layout/ShowroomTopbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      const isAllowed = role === 'employee' || role === 'showroom_manager';
      if (!isAllowed) {
        if (role === 'admin' || role === 'super_admin' || role === 'manager') {
          router.push('/admin/dashboard');
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
  const isAllowed = role === 'employee' || role === 'showroom_manager';
  if (!isAllowed) return null;

  return (
    <SidebarProvider>
      {role === 'showroom_manager' ? (
        <>
          <ShowroomSidebar />
          <SidebarInset>
            <ShowroomTopbar />
            <main className="flex-1 items-start gap-4 px-[1px] py-4 md:px-4 md:py-6 md:gap-8">
              {children}
            </main>
          </SidebarInset>
        </>
      ) : (
        <>
          <EmployeeSidebar />
          <SidebarInset>
            <EmployeeTopbar />
            <main className="flex-1 items-start gap-4 px-[1px] py-4 md:px-4 md:py-6 md:gap-8">
              {children}
            </main>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  );
}

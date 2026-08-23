'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-bold">Loading...</p>
        </div>
      </div>
    );
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
            <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </SidebarInset>
        </>
      ) : (
        <>
          <EmployeeSidebar />
          <SidebarInset>
            <EmployeeTopbar />
            <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  );
}

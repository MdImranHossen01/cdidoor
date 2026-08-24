'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import AdminTopbar from '@/components/layout/AdminTopbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role !== 'admin' && role !== 'super_admin' && role !== 'manager') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'unauthenticated') {
    return null;
  }

  if (status === 'authenticated') {
    const role = (session?.user as any)?.role;
    if (role !== 'admin' && role !== 'super_admin' && role !== 'manager') {
      return null;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminTopbar />
        <main className="flex-1 items-start gap-4 px-1 py-4 md:px-4 md:py-6 md:gap-8 pb-20 md:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}


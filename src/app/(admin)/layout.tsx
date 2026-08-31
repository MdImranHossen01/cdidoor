'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import AdminTopbar from '@/components/layout/AdminTopbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import Link from 'next/link';
import { FilePlus, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/TransactionForm';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);

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

  useEffect(() => {
    const handleOpen = () => setIsTransactionOpen(true);
    window.addEventListener('open-transaction-dialog', handleOpen);
    return () => window.removeEventListener('open-transaction-dialog', handleOpen);
  }, []);

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
        <main className="flex-1 items-start gap-4 px-1 py-0 md:px-4 md:py-6 md:gap-8 pb-20 md:pb-0">
          {children}
        </main>
        
        {/* Floating Action Buttons */}
        <div className="fixed bottom-4 right-[1px] z-50 hidden md:flex flex-col gap-2">
          {/* Create Invoice Button */}
          <Link
            href="/admin/bills/create"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#9d174d] text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 group relative"
            title="Create New Invoice"
          >
            <FilePlus className="w-4 h-4" />
            <span className="absolute right-11 scale-0 group-hover:scale-100 transition-all duration-150 origin-right bg-popover text-popover-foreground text-[10px] font-semibold px-1.5 py-1 rounded-md shadow-md border whitespace-nowrap">
              Create New Invoice
            </span>
          </Link>

          {/* Add Transaction Button */}
          <button
            onClick={() => setIsTransactionOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-600 text-white shadow-md hover:shadow-lg hover:scale-105 hover:bg-teal-700 transition-all duration-200 group relative border-none cursor-pointer"
            title="Add Transaction"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="absolute right-11 scale-0 group-hover:scale-100 transition-all duration-150 origin-right bg-popover text-popover-foreground text-[10px] font-semibold px-1.5 py-1 rounded-md shadow-md border whitespace-nowrap">
              Add Transaction
            </span>
          </button>
        </div>

        <MobileBottomNav />
      </SidebarInset>

      <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
        <DialogContent className="sm:max-w-md bg-background border shadow-lg rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSuccess={() => {
            setIsTransactionOpen(false);
            router.refresh();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('refresh-dashboard'));
            }
          }} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}


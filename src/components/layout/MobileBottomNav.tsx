'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Receipt,
  Menu,
  ShoppingBag,
  FilePlus,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/TransactionForm';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile, openMobile } = useSidebar();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const navItems = [
    {
      label: 'ড্যাশবোর্ড',
      enLabel: 'Dashboard',
      icon: LayoutDashboard,
      href: '/admin/dashboard',
    },
    {
      label: 'টালি',
      enLabel: 'Tally/Ledger',
      icon: BookOpen,
      href: '/admin/ledger',
    },
    {
      label: 'অর্ডারসমূহ',
      enLabel: 'Orders',
      icon: ShoppingBag,
      href: '/admin/orders',
    },
  ];

  const rightNavItems = [
    {
      label: 'ইনভয়েস',
      enLabel: 'Invoices',
      icon: FilePlus,
      href: '/admin/bills/create',
    },
    {
      label: 'ক্যাশবক্স',
      enLabel: 'Cashbook',
      icon: Receipt,
      href: '/admin/expenses-incomes',
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-lg border-t border-border md:hidden flex justify-between items-center h-16 px-4 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* Left side items */}
        <div className="flex justify-around items-center w-5/12">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.enLabel}
                className={`flex flex-col items-center justify-center w-12 transition-all ${
                  isActive
                    ? 'text-primary scale-105 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          })}
        </div>

        {/* Floating Center Button */}
        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex flex-col items-center z-50">
          <button
            onClick={() => setIsTransactionDialogOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/95 transition-transform active:scale-90 border-4 border-background"
            aria-label="Add Transaction"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* Right side items */}
        <div className="flex justify-around items-center w-5/12 ml-auto">
          {rightNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.enLabel}
                className={`flex flex-col items-center justify-center w-12 transition-all ${
                  isActive
                    ? 'text-primary scale-105 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          })}

          {/* Sidebar Menu Toggle */}
          <button
            onClick={() => setOpenMobile(!openMobile)}
            aria-label="Toggle Navigation Menu"
            className={`flex flex-col items-center justify-center w-12 transition-all ${
              openMobile ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border shadow-lg rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSuccess={() => {
            setIsTransactionDialogOpen(false);
            router.refresh();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('refresh-dashboard'));
            }
          }} />
        </DialogContent>
      </Dialog>
    </>
  );
}


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  ShoppingBagIcon,
  Menu,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

export function WholesalerMobileBottomNav() {
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();

  const navItems = [
    {
      label: 'ড্যাশবোর্ড',
      enLabel: 'Dashboard',
      icon: LayoutDashboard,
      href: '/wholesaler/dashboard',
    },
    {
      label: 'অর্ডার',
      enLabel: 'Orders',
      icon: ShoppingBag,
      href: '/wholesaler/orders',
    },
  ];

  const rightNavItems = [
    {
      label: 'প্রোফাইল',
      enLabel: 'Profile',
      icon: User,
      href: '/wholesaler/profile',
    },
  ];

  return (
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

      {/* Floating Center Button: Shop/Order */}
      <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex flex-col items-center z-50">
        <Link
          href="/shop"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/95 transition-transform active:scale-90 border-4 border-background"
          aria-label="Shop"
        >
          <ShoppingBagIcon className="h-5 w-5 stroke-[2.5]" />
        </Link>
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
          className={`flex flex-col items-center justify-center w-12 transition-all ${
            openMobile ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

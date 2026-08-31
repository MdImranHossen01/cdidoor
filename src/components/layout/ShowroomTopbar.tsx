"use client";
import { useLanguage } from '@/contexts/LanguageContext';

import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Store, Plus, Home, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getPageTitle } from '@/lib/page-title';

export default function ShowroomTopbar() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showroomName, setShowroomName] = useState<string | null>(null);
  const { open, toggleSidebar } = useSidebar();

  useEffect(() => {
    fetch('/api/showroom/info')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.showroom?.name) setShowroomName(data.showroom.name);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 justify-between sticky top-0 z-30">
      {/* Mobile Left - Menu Trigger & Language Toggle */}
      <div className="flex items-center gap-1 md:hidden z-10 -ml-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-9 w-9 shrink-0"
          aria-label={t("topbar.toggle_menu") || "Toggle Menu"}
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <LanguageToggle />
      </div>

      {/* Mobile Title (Centered) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden z-0">
        <div className="font-bold text-lg truncate px-12">
          {getPageTitle(pathname)}
        </div>
      </div>

      {/* Mobile Right - Theme Toggle */}
      <div className="flex items-center md:hidden z-10 -mr-2">
        <ModeToggle />
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center gap-2">
        {!open && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0 h-8 w-8 mr-1"
            aria-label={t("topbar.open_sidebar") || "Open sidebar"}
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Store className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Showroom Panel</span>
        {showroomName && (
          <Badge variant="secondary" className="text-xs">{showroomName}</Badge>
        )}
        <span className="text-muted-foreground mx-1">/</span>
        <span className="font-bold text-lg">{getPageTitle(pathname)}</span>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <LanguageToggle />
        <ModeToggle />
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger nativeButton={true} render={
              <Button variant="secondary" size="icon" className="rounded-full overflow-hidden border border-primary/20">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle user menu</span>
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {session.user.email}
                    </p>
                    {showroomName && (
                      <p className="text-xs text-primary font-medium">{showroomName}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: window.location.origin })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("store.dashboard.log_out") || "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="secondary" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}

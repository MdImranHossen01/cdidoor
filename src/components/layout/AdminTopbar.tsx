"use client";

import { useSession, signOut } from 'next-auth/react';
import {
  User,
  LogOut,
  Plus,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useRouter, usePathname } from 'next/navigation';
import { getPageTitle } from '@/lib/page-title';
export default function AdminTopbar() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <header className="relative flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 justify-between sticky top-0 z-30">
      {/* Mobile Left - Language Toggle */}
      <div className="flex items-center md:hidden z-10 -ml-2">
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
      
      {/* Desktop spacer */}
      <div className="hidden md:flex flex-1" />
      
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
                    alt={session.user.name || "Admin"}
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
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: window.location.origin })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("topbar.log_out")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="secondary" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        )}
      </div>
    </header>
  );
}


"use client";

import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Store, Plus, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
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
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShowroomTopbar() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const [showroomName, setShowroomName] = useState<string | null>(null);

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
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-muted md:hidden">
          <Home className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="hidden md:flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Showroom Panel</span>
          {showroomName && (
            <Badge variant="secondary" className="text-xs">{showroomName}</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
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

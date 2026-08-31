'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export function EmployeeTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const tabs = [
    { name: t("employees.tabs.staff_list"), href: '/admin/employees' },
    { name: t("employees.tabs.leave_requests"), href: '/admin/employees/leaves' },
    { name: t("employees.tabs.attendance_sheet"), href: '/admin/employees/attendance' },
    { name: t("employees.tabs.tasks"), href: '/admin/employees/tasks' },
  ];

  return (
    <div className="flex border-b border-zinc-200 mb-6 overflow-x-auto whitespace-nowrap">
      {tabs.map((tab) => {
        // Handle active state
        const isActive = tab.href === '/admin/employees' 
          ? pathname === '/admin/employees' 
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "px-3 py-2.5 md:px-5 md:py-3 text-xs md:text-sm font-bold border-b-2 transition-all hover:text-primary",
              isActive 
                ? "border-primary text-primary" 
                : "border-transparent text-zinc-500 hover:border-zinc-300"
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}

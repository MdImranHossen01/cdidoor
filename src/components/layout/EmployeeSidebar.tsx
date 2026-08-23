"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  DollarSign,
  CalendarOff,
  CheckSquare,
} from "lucide-react"
import { Logo } from "@/components/ui/logo"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const navItems = [
  {
    titleKey: "store.employee.overview",
    titleDefault: "Overview",
    icon: LayoutDashboard,
    items: [{ titleKey: "store.dashboard.dashboard", titleDefault: "Dashboard", url: "/employee/dashboard" }],
  },
  {
    titleKey: "store.employee.my_profile",
    titleDefault: "My Profile",
    icon: User,
    items: [
      { titleKey: "store.dashboard.profile", titleDefault: "Profile Info", url: "/employee/profile" },
      { titleKey: "store.dashboard.change_password", titleDefault: "Change Password", url: "/employee/change-password" },
    ],
  },
  {
    titleKey: "store.employee.salary",
    titleDefault: "Salary",
    icon: DollarSign,
    items: [{ titleKey: "store.employee.salary_history", titleDefault: "Salary History", url: "/employee/salary" }],
  },
  {
    titleKey: "store.employee.leave",
    titleDefault: "Leave",
    icon: CalendarOff,
    items: [{ titleKey: "store.employee.my_leaves", titleDefault: "My Leaves", url: "/employee/leaves" }],
  },
  {
    titleKey: "store.employee.tasks",
    titleDefault: "Tasks",
    icon: CheckSquare,
    items: [{ titleKey: "store.employee.my_tasks", titleDefault: "My Tasks", url: "/employee/tasks" }],
  },
]


function NavMain({ items, pathname }: { items: typeof navItems; pathname: string }) {
  const { setOpenMobile, isMobile } = useSidebar()
  const { t } = useLanguage()
  const handleLinkClick = () => { if (isMobile) setOpenMobile(false) }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isParentActive = item.items.some(
            (sub) => pathname === sub.url || pathname.startsWith(sub.url + "/")
          )
          return (
            <Collapsible key={item.titleDefault} defaultOpen={isParentActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip={t(item.titleKey) || item.titleDefault} isActive={isParentActive} />}>
                  {item.icon && <item.icon />}
                  <span>{t(item.titleKey) || item.titleDefault}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.titleDefault}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} onClick={handleLinkClick} />}
                          isActive={pathname === subItem.url || pathname.startsWith(subItem.url + "/")}
                        >
                          <span>{t(subItem.titleKey) || subItem.titleDefault}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function EmployeeSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [employeeType, setEmployeeType] = React.useState<'monthly' | 'task-based' | null>(null);

  React.useEffect(() => {
    fetch('/api/employee/dashboard/stats')
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (d?.profile?.employeeType) {
          setEmployeeType(d.profile.employeeType);
        }
      })
      .catch(() => { });
  }, []);

  const filteredNavItems = navItems
    .filter((item) => {
      // Hide tasks for permanent monthly employees
      if (item.titleDefault === 'Tasks' && employeeType === 'monthly') return false;
      // Hide leaves for contractual task-based employees
      if (item.titleDefault === 'Leave' && employeeType === 'task-based') return false;
      return true;
    })
    .map((item) => {
      if (item.titleDefault === 'Salary' && employeeType === 'task-based') {
        return {
          ...item,
          titleDefault: 'Payments', titleKey: 'store.employee.payments',
          items: [{ titleDefault: 'Payout History', titleKey: 'store.employee.payout_history', url: '/employee/salary' }],
        };
      }
      return item;
    });

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center">
        <Link href="/employee/dashboard">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} pathname={pathname} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

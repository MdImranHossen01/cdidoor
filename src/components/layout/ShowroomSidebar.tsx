"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  DollarSign,
  Package,
  Store,
  User,
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
  SidebarGroupLabel,
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
    titleKey: "store.showroom.overview",
    titleDefault: "Overview",
    icon: LayoutDashboard,
    items: [{ titleKey: "store.dashboard.dashboard", titleDefault: "Dashboard", url: "/showroom/dashboard" }],
  },
  {
    titleKey: "store.showroom.operations",
    titleDefault: "Operations",
    icon: ShoppingBag,
    items: [
      { titleKey: "store.showroom.orders", titleDefault: "Orders", url: "/showroom/orders" },
      { titleKey: "sidebar.offers_quotations", titleDefault: "Offers / Quotations", url: "/showroom/offers" },
      { titleKey: "sidebar.delivery_challans", titleDefault: "Delivery Challans", url: "/showroom/chalans" },
      { titleKey: "store.showroom.bills", titleDefault: "Client Bills", url: "/showroom/bills" },
    ],
  },
  {
    titleKey: "sidebar.product_management",
    titleDefault: "Product Management",
    icon: Package,
    items: [
      { titleKey: "store.showroom.stock", titleDefault: "Stock", url: "/showroom/stock" },
      { titleKey: "sidebar.low_stock", titleDefault: "Low Stock", url: "/showroom/low-stock" },
      { titleKey: "sidebar.upcoming_expiry", titleDefault: "Upcoming Expire", url: "/showroom/upcoming-expiry" },
    ],
  },
  {
    titleKey: "sidebar.product_return",
    titleDefault: "Product Return",
    icon: Store,
    items: [
      { titleKey: "sidebar.new_return", titleDefault: "New Return", url: "/showroom/returns/new" },
      { titleKey: "sidebar.return_list", titleDefault: "Return List", url: "/showroom/returns" },
    ],
  },
  {
    titleKey: "store.showroom.finance",
    titleDefault: "Finance",
    icon: DollarSign,
    items: [
      { titleKey: "store.showroom.expenses", titleDefault: "Expenses", url: "/showroom/expenses" },
    ],
  },
  {
    titleKey: "store.showroom.my_employment",
    titleDefault: "My Employment",
    icon: User,
    items: [
      { titleKey: "store.dashboard.profile", titleDefault: "Profile Info", url: "/showroom/profile" },
      { titleKey: "store.dashboard.change_password", titleDefault: "Change Password", url: "/showroom/change-password" },
      { titleKey: "store.employee.salary_history", titleDefault: "Salary History", url: "/showroom/salary" },
      { titleKey: "store.employee.my_leaves", titleDefault: "Leave Application", url: "/showroom/leaves" },
    ],
  }
]


function NavMain({ items, pathname }: { items: typeof navItems; pathname: string }) {
  const { setOpenMobile, isMobile } = useSidebar()
  const { t } = useLanguage()
  const handleLinkClick = () => { if (isMobile) setOpenMobile(false) }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
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

export function ShowroomSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center">
        <Link href="/showroom/dashboard">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} pathname={pathname} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

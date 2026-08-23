"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  ExternalLink,
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
    titleKey: "store.wholesaler.overview",
    titleDefault: "Overview",
    icon: LayoutDashboard,
    items: [{ titleKey: "store.dashboard.dashboard", titleDefault: "Dashboard", url: "/wholesaler/dashboard" }],
  },
  {
    titleKey: "store.wholesaler.my_orders",
    titleDefault: "My Orders",
    icon: ShoppingBag,
    items: [{ titleKey: "store.wholesaler.order_history", titleDefault: "Order History", url: "/wholesaler/orders" }],
  },
  {
    titleKey: "store.wholesaler.my_account",
    titleDefault: "My Account",
    icon: User,
    items: [
      { titleKey: "store.dashboard.profile", titleDefault: "Profile", url: "/wholesaler/profile" },
      { titleKey: "store.dashboard.change_password", titleDefault: "Change Password", url: "/wholesaler/change-password" },
    ],
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
        {/* Browse Store - direct link item */}
        <SidebarMenuItem>
          <SidebarMenuButton tooltip={t('store.wholesaler.browse_store') || "Browse Store"} render={<Link href="/shop" />}>
            <ExternalLink className="h-4 w-4" />
            <span>{t('store.wholesaler.browse_store') || "Browse Store"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function WholesalerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center">
        <Logo href="/wholesaler/dashboard" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} pathname={pathname} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

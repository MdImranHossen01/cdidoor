"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Globe,
  ShoppingCart,
  Users,
  HandCoins,
  PackagePlus,
  RotateCcw,
  FileText,
  CalendarClock,
  Barcode,
  MessageSquare,
  Receipt,
  Landmark,
  FileSpreadsheet,
  UserCheck,
  Settings,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

const data = {
  navMain: [
    {
      title: "Home",
      tKey: "sidebar.home",
      url: "/admin/dashboard",
      icon: Home,
      items: [],
    },
    {
      title: "eCommerce",
      tKey: "sidebar.ecommerce",
      url: "#",
      icon: Globe,
      items: [
        {
          title: "Abandoned Carts",
          tKey: "sidebar.abandoned_carts",
          url: "/admin/abandoned-carts",
        },
        {
          title: "eCommerce Sale List",
          tKey: "sidebar.ecommerce_sale_list",
          url: "/admin/orders",
        },
      ],
    },
    {
      title: "Sales",
      tKey: "sidebar.sales",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Add Sale",
          tKey: "sidebar.add_sale",
          url: "/admin/bills/create",
        },
        {
          title: "Sale List",
          tKey: "sidebar.sale_list",
          url: "/admin/bills",
        },
        {
          title: "Add Quotation",
          tKey: "sidebar.add_quotation",
          url: "/admin/offers/new",
        },
        {
          title: "Quotation List",
          tKey: "sidebar.quotation_list",
          url: "/admin/offers",
        },
        {
          title: "Sales Delete Log",
          tKey: "sidebar.sales_delete_log",
          url: "/admin/orders?status=deleted",
        },
        {
          title: "Delivery Challans",
          tKey: "sidebar.delivery_challans",
          url: "/admin/chalans",
        },
      ],
    },
    {
      title: "Contacts",
      tKey: "sidebar.contacts",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Customer Bulk Add",
          tKey: "sidebar.customer_bulk_add",
          url: "/admin/users?action=bulk-add",
        },
        {
          title: "Customer List",
          tKey: "sidebar.customer_list",
          url: "/admin/users",
        },
        {
          title: "Customer Group",
          tKey: "sidebar.customer_group",
          url: "/admin/users?tab=groups",
        },
        {
          title: "Area List",
          tKey: "sidebar.area_list",
          url: "/admin/areas",
        },
        {
          title: "Supplier Bulk Add",
          tKey: "sidebar.supplier_bulk_add",
          url: "/admin/suppliers?action=bulk-add",
        },
        {
          title: "Supplier List",
          tKey: "sidebar.supplier_list",
          url: "/admin/suppliers",
        },
        {
          title: "Staff List",
          tKey: "sidebar.staff_list",
          url: "/admin/employees",
        },
        {
          title: "Agent List",
          tKey: "sidebar.agent_list",
          url: "/admin/wholesalers",
        },
      ],
    },
    {
      title: "Installment",
      tKey: "sidebar.installment",
      url: "#",
      icon: HandCoins,
      items: [
        {
          title: "Installment List",
          tKey: "sidebar.installment_list",
          url: "/admin/loans",
        },
        {
          title: "Today's Installment",
          tKey: "sidebar.today_installment",
          url: "/admin/loans?filter=today",
        },
        {
          title: "Upcoming Installment",
          tKey: "sidebar.upcoming_installment",
          url: "/admin/loans/upcoming",
        },
        {
          title: "Overdue Installment",
          tKey: "sidebar.overdue_installment",
          url: "/admin/loans?filter=overdue",
        },
        {
          title: "All Loan Providers",
          tKey: "sidebar.all_loan_providers",
          url: "/admin/loans/providers",
        },
      ],
    },
    {
      title: "Purchases",
      tKey: "sidebar.purchases",
      url: "#",
      icon: PackagePlus,
      items: [
        {
          title: "Add Purchase",
          tKey: "sidebar.add_purchase",
          url: "/admin/supplier-bills/create",
        },
        {
          title: "Purchase List",
          tKey: "sidebar.purchase_list",
          url: "/admin/supplier-bills",
        },
        {
          title: "Suppliers / Vendors",
          tKey: "sidebar.suppliers_vendors",
          url: "/admin/suppliers",
        },
      ],
    },
    {
      title: "Return",
      tKey: "sidebar.product_return",
      url: "#",
      icon: RotateCcw,
      items: [
        {
          title: "Add Sale Return",
          tKey: "sidebar.add_sale_return",
          url: "/admin/returns/new",
        },
        {
          title: "Sale Return List",
          tKey: "sidebar.sale_return_list",
          url: "/admin/returns",
        },
      ],
    },
    {
      title: "Items",
      tKey: "sidebar.items",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "All Products",
          tKey: "sidebar.all_products",
          url: "/admin/products",
        },
        {
          title: "Add Product",
          tKey: "sidebar.add_product",
          url: "/admin/products/new",
        },
        {
          title: "Categories",
          tKey: "sidebar.categories",
          url: "/admin/categories",
        },
        {
          title: "Brands",
          tKey: "sidebar.brands",
          url: "/admin/brands",
        },
      ],
    },
    {
      title: "Expiry Dates",
      tKey: "sidebar.expiry_dates",
      url: "#",
      icon: CalendarClock,
      items: [
        {
          title: "Upcoming Expire",
          tKey: "sidebar.upcoming_expire",
          url: "/admin/upcoming-expiry",
        },
        {
          title: "Low Stock",
          tKey: "sidebar.low_stock",
          url: "/admin/low-stock",
        },
      ],
    },
    {
      title: "Label Print",
      tKey: "sidebar.label_print",
      url: "#",
      icon: Barcode,
      items: [
        {
          title: "All Products",
          tKey: "sidebar.all_products",
          url: "/admin/products",
        },
      ],
    },
    {
      title: "SMS",
      tKey: "sidebar.sms",
      url: "#",
      icon: MessageSquare,
      items: [
        {
          title: "Subscribers",
          tKey: "sidebar.subscribers",
          url: "/admin/subscribers",
        },
      ],
    },
    {
      title: "Expenses",
      tKey: "sidebar.expenses",
      url: "#",
      icon: Receipt,
      items: [
        {
          title: "Expenses & Incomes",
          tKey: "sidebar.expenses_incomes",
          url: "/admin/expenses-incomes",
        },
        {
          title: "Add New Entry",
          tKey: "sidebar.add_expense_income",
          url: "/admin/expenses-incomes?action=new",
        },
        {
          title: "Category",
          tKey: "sidebar.add_category",
          url: "/admin/expenses-incomes/categories",
        },
      ],
    },
    {
      title: "Accounts",
      tKey: "sidebar.accounts",
      url: "#",
      icon: Landmark,
      items: [
        {
          title: "All Accounts",
          tKey: "sidebar.all_accounts",
          url: "/admin/accounts",
        },
        {
          title: "Add Account",
          tKey: "sidebar.add_account",
          url: "/admin/accounts/new",
        },
        {
          title: "Accounts Ledger",
          tKey: "sidebar.accounts_ledger",
          url: "/admin/ledger",
        },
        {
          title: "Account Receivable",
          tKey: "sidebar.account_receivable",
          url: "/admin/ledger/receivable",
        },
        {
          title: "Account Payable",
          tKey: "sidebar.account_payable",
          url: "/admin/ledger/payable",
        },
      ],
    },
    {
      title: "Reports",
      tKey: "sidebar.reports",
      url: "#",
      icon: FileSpreadsheet,
      items: [
        {
          title: "Due Customer List",
          tKey: "sidebar.due_customer_list",
          url: "/admin/bills?filter=due",
        },
        {
          title: "Due Supplier List",
          tKey: "sidebar.due_supplier_list",
          url: "/admin/supplier-bills?filter=due",
        },
        {
          title: "Customer Payment",
          tKey: "sidebar.customer_payment_report",
          url: "/admin/ledger/receivable",
        },
        {
          title: "Supplier Payment",
          tKey: "sidebar.supplier_payment_report",
          url: "/admin/ledger/payable",
        },
        {
          title: "Item Stock Alert",
          tKey: "sidebar.item_stock_alert",
          url: "/admin/low-stock",
        },
        {
          title: "Stock Add/Remove (Manual)",
          tKey: "sidebar.manual_stock_adjust",
          url: "/admin/products?action=stock-adjust",
        },
        {
          title: "Item Stock Report",
          tKey: "sidebar.item_stock_report",
          url: "/admin/products?view=stock",
        },
        {
          title: "Damage Add/Remove Report",
          tKey: "sidebar.damage_stock_adjust",
          url: "/admin/returns?type=damage",
        },
        {
          title: "Damage Item Report",
          tKey: "sidebar.damage_item_report",
          url: "/admin/returns?type=damage-list",
        },
        {
          title: "Item Purchase Report",
          tKey: "sidebar.item_purchase_report",
          url: "/admin/supplier-bills?view=items",
        },
        {
          title: "Purchase Report",
          tKey: "sidebar.purchase_report",
          url: "/admin/supplier-bills",
        },
        {
          title: "Sales Report",
          tKey: "sidebar.sales_report",
          url: "/admin/orders",
        },
        {
          title: "Item Sales Return Report",
          tKey: "sidebar.item_sales_return_report",
          url: "/admin/returns?view=items",
        },
        {
          title: "Supplier Item Report",
          tKey: "sidebar.supplier_item_report",
          url: "/admin/suppliers?view=items",
        },
        {
          title: "Customer Sales Item Report",
          tKey: "sidebar.customer_sales_item_report",
          url: "/admin/orders?view=customer-items",
        },
        {
          title: "Staff Sales Item Report",
          tKey: "sidebar.staff_sales_item_report",
          url: "/admin/orders?view=staff-items",
        },
        {
          title: "Staff Sales Report",
          tKey: "sidebar.staff_sales_report",
          url: "/admin/employees?tab=sales",
        },
        {
          title: "Staff Monthly Sales Report",
          tKey: "sidebar.staff_monthly_sales_report",
          url: "/admin/employees?tab=monthly-sales",
        },
        {
          title: "Staff Brand Report",
          tKey: "sidebar.staff_brand_report",
          url: "/admin/employees?tab=brand-sales",
        },
        {
          title: "Agent Commission Report",
          tKey: "sidebar.agent_commission_report",
          url: "/admin/wholesalers?tab=commission",
        },
        {
          title: "Expense Report",
          tKey: "sidebar.expense_report",
          url: "/admin/expenses-incomes",
        },
      ],
    },
    {
      title: "Admin Users",
      tKey: "sidebar.admin_users",
      url: "#",
      icon: UserCheck,
      items: [
        {
          title: "System Users",
          tKey: "sidebar.system_users",
          url: "/admin/system-users",
        },
        {
          title: "Employees",
          tKey: "sidebar.employees",
          url: "/admin/employees",
        },
        {
          title: "Task Management",
          tKey: "sidebar.task_management",
          url: "/admin/task-management",
        },
        {
          title: "Showroom Managers",
          tKey: "sidebar.showroom_managers",
          url: "/admin/showroom-managers",
        },
        {
          title: "Showrooms",
          tKey: "sidebar.showrooms",
          url: "/admin/showrooms",
        },
      ],
    },
    {
      title: "Settings",
      tKey: "sidebar.settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "General Settings",
          tKey: "sidebar.general_settings",
          url: "/admin/settings",
        },
        {
          title: "Profile",
          tKey: "sidebar.profile",
          url: "/admin/settings/profile",
        },
        {
          title: "Coupons",
          tKey: "sidebar.coupons",
          url: "/admin/coupons",
        },
        {
          title: "Marketing Settings",
          tKey: "sidebar.marketing_settings",
          url: "/admin/marketing",
        },
        {
          title: "Banners",
          tKey: "sidebar.banners",
          url: "/admin/cms/banners",
        },
        {
          title: "Landing Pages",
          tKey: "sidebar.landing_pages",
          url: "/admin/landing-pages",
        },
        {
          title: "Testimonials",
          tKey: "sidebar.testimonials",
          url: "/admin/cms/testimonials",
        },
        {
          title: "FAQs",
          tKey: "sidebar.faqs",
          url: "/admin/cms/faqs",
        },
        {
          title: "Manage Blog",
          tKey: "sidebar.manage_blog",
          url: "/admin/blogs",
        },
        {
          title: "Infrastructure & Marketing",
          tKey: "sidebar.infrastructure_marketing",
          url: "/admin/system-design",
          superOnly: true,
        },
      ],
    },
  ],
}


import { useSession } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"

function NavMain({ items, pathname, role }: { items: typeof data.navMain; pathname: string; role?: string }) {
  const { setOpenMobile, isMobile } = useSidebar()
  const { t } = useLanguage()

  // Filter items based on role
  const filteredItems = items.map(item => ({
    ...item,
    items: item.items.filter((subItem: any) => {
      if (subItem.superOnly && role !== 'super_admin') return false;
      if (role === 'showroom_manager') {
        const allowedUrls = [
          '/admin/dashboard',
          '/admin/showrooms',
          '/admin/products',
          '/admin/orders',
          '/admin/expenses-incomes'
        ];
        return allowedUrls.includes(subItem.url);
      }
      return true;
    })
  })).filter(item => item.items.length > 0 || (item.url && item.url !== '#'));

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (url === '/admin/expenses-incomes?action=new') {
      e.preventDefault();
      window.dispatchEvent(new Event('open-transaction-dialog'));
      if (isMobile) {
        setOpenMobile(false);
      }
    } else {
      handleLinkClick();
    }
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {filteredItems.map((item) => {
          if (!item.items || item.items.length === 0) {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} onClick={(e) => handleItemClick(e, item.url)} />}
                  tooltip={t(item.tKey as string) || item.title}
                  isActive={isActive}
                >
                  {item.icon && <item.icon />}
                  <span>{t(item.tKey as string) || item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const isParentActive =
            item.items.some(
              (subItem) =>
                pathname === subItem.url ||
                (subItem.url !== "#" &&
                  subItem.url !== "/admin" &&
                  pathname.startsWith(subItem.url + "/"))
            ) || pathname === item.url

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isParentActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip={t(item.tKey as string) || item.title} isActive={isParentActive} />}>
                  {item.icon && <item.icon />}
                  <span>{t(item.tKey as string) || item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-open/collapsible:rotate-90 group-[[data-state=open]]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} onClick={(e) => handleItemClick(e, subItem.url)} />}
                          isActive={
                            pathname === subItem.url ||
                            (subItem.url !== "#" &&
                              subItem.url !== "/admin" &&
                              pathname.startsWith(subItem.url + "/") &&
                              !item.items.some(
                                (otherItem) =>
                                  otherItem !== subItem &&
                                  otherItem.url.length > subItem.url.length &&
                                  (pathname === otherItem.url || pathname.startsWith(otherItem.url + "/"))
                              ))
                          }
                        >
                          <span>{subItem.tKey ? t(subItem.tKey as string) : subItem.title}</span>
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

import { User, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import { LanguageToggle } from "@/components/layout/LanguageToggle"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const { t } = useLanguage()

  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b p-0 flex flex-col gap-0 bg-primary/10">
        <div className="h-12 px-4 flex items-center justify-between border-b bg-primary text-primary-foreground">
          <Logo textClassName="text-base font-black tracking-wide whitespace-nowrap text-primary-foreground" />
          <Button
            variant="ghost"
            size="icon"
            onClick={isMobile ? () => setOpenMobile(false) : toggleSidebar}
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User profile & ID badge section (matching screenshot) */}
        <div className="flex items-center gap-3 p-3 bg-background/50 border-b">
          <div className="h-12 w-12 rounded-full overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate leading-tight">
              {session?.user?.name || session?.user?.email || "demo@user"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.email || "কাস্টমার আইডি: 6051"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <NavMain items={data.navMain} pathname={pathname} role={role} />
      </SidebarContent>

      {/* Sidebar Footer with Profile, Logout and Version */}
      <div className="border-t p-3 bg-background/50 flex flex-col gap-2">
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin/settings/profile"
            className="flex items-center justify-center h-9 px-4 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            title="Profile"
          >
            <User className="h-4 w-4" />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center h-9 px-4 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {t("sidebar.system_version") || "ভার্সন"}: 2.2.0
        </div>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}


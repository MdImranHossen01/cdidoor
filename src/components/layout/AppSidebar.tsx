"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,

  FileText,
  Users,
  Image as ImageIcon,
  Settings,
  Store,
  Mail,
  CreditCard,
  RotateCcw,
  Truck,
  Landmark,
  X,
  Briefcase,
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
      title: "Dashboard",
      tKey: "sidebar.dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Overview",
          tKey: "sidebar.overview",
          url: "/admin/dashboard",
        },
        {
          title: "Report",
          tKey: "sidebar.report",
          url: "/admin/dashboard/report",
        },
        {
          title: "Insight",
          tKey: "sidebar.insight",
          url: "/admin/dashboard/insight",
        }
      ],
    },
    {
      title: "Product Management",
      tKey: "sidebar.product_management",
      url: "#",
      icon: ShoppingBag,
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
          title: "Upcoming Expire",
          tKey: "sidebar.upcoming_expire",
          url: "/admin/upcoming-expiry",
        },
        {
          title: "Low Stock",
          tKey: "sidebar.low_stock",
          url: "/admin/low-stock",
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
      title: "Product Return",
      tKey: "sidebar.product_return",
      url: "#",
      icon: RotateCcw,
      items: [
        {
          title: "New Return",
          tKey: "sidebar.new_return",
          url: "/admin/returns/new",
        },
        {
          title: "Return List",
          tKey: "sidebar.return_list",
          url: "/admin/returns",
        },
      ],
    },
    {
      title: "Sales & Orders",
      tKey: "sidebar.sales_orders",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "All Orders",
          tKey: "sidebar.all_orders",
          url: "/admin/orders",
        },
        {
          title: "Abandoned Carts",
          tKey: "sidebar.abandoned_carts",
          url: "/admin/abandoned-carts",
        },
        {
          title: "Offers / Quotations",
          tKey: "sidebar.offers_quotations",
          url: "/admin/offers",
        },
        {
          title: "Delivery Challans",
          tKey: "sidebar.delivery_challans",
          url: "/admin/chalans",
        },
        {
          title: "Client Bills",
          tKey: "sidebar.client_bills",
          url: "/admin/bills",
        },
        {
          title: "Create Invoice",
          tKey: "sidebar.create_invoice",
          url: "/admin/bills/create",
        },
      ],
    },
    {
      title: "Suppliers & Purchases",
      tKey: "sidebar.suppliers",
      url: "#",
      icon: Truck,
      items: [
        {
          title: "Suppliers / Vendors",
          tKey: "sidebar.suppliers_vendors",
          url: "/admin/suppliers",
        },
        {
          title: "Supplier Bills",
          tKey: "sidebar.supplier_bills",
          url: "/admin/supplier-bills",
        },
      ],
    },
    {
      title: "Loan",
      tKey: "sidebar.loan",
      url: "#",
      icon: Landmark,
      items: [
        {
          title: "Add Loan Provider",
          tKey: "sidebar.add_loan_provider",
          url: "/admin/loans/providers/new",
        },
        {
          title: "All Loan Providers",
          tKey: "sidebar.all_loan_providers",
          url: "/admin/loans/providers",
        },
        {
          title: "All Loans",
          tKey: "sidebar.all_loans",
          url: "/admin/loans",
        },
        {
          title: "Upcoming Payable",
          tKey: "sidebar.upcoming_payable",
          url: "/admin/loans/upcoming",
        },
      ],
    },
    {
      title: "Ledger & Accounting",
      tKey: "sidebar.ledger_accounting",
      url: "#",
      icon: CreditCard,
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

        {
          title: "Accounts Ledger",
          tKey: "sidebar.accounts_ledger",
          url: "/admin/ledger"
        },
        {
          title: "Account Receivable",
          tKey: "sidebar.account_receivable",
          url: "/admin/ledger/receivable"
        },
        {
          title: "Account Payable",
          tKey: "sidebar.account_payable",
          url: "/admin/ledger/payable"
        },
      ],
    },
    {
      title: "Showrooms",
      tKey: "sidebar.showrooms",
      url: "#",
      icon: Store,
      items: [
        {
          title: "Showrooms",
          tKey: "sidebar.showrooms",
          url: "/admin/showrooms",
        },
        {
          title: "Add Showroom",
          tKey: "sidebar.add_showroom",
          url: "/admin/showrooms?action=add",
        }
      ],
    },
    {
      title: "Customer Management",
      tKey: "sidebar.customer_management",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Users",
          tKey: "sidebar.all_users",
          url: "/admin/users"
        },
        {
          title: "System Users",
          tKey: "sidebar.system_users",
          url: "/admin/system-users"
        },
        {
          title: "Wholesalers",
          tKey: "sidebar.wholesalers",
          url: "/admin/wholesalers",
        },
        {
          title: "Areas",
          tKey: "sidebar.areas",
          url: "/admin/areas",
        },
      ],
    },
    {
      title: "Employee Management",
      tKey: "sidebar.employee_management",
      url: "#",
      icon: Briefcase,
      items: [
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
      ],
    },
    {
      title: "CMS Manager",
      tKey: "sidebar.cms_manager",
      url: "#",
      icon: ImageIcon,
      items: [
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
      ],
    },
    {
      title: "Blogs",
      tKey: "sidebar.blogs",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "Manage Blog",
          tKey: "sidebar.manage_blog",
          url: "/admin/blogs",
        },
        {
          title: "Add New Blog",
          tKey: "sidebar.add_new_blog",
          url: "/admin/blogs/new",
        },
      ],
    },
    {
      title: "System Settings",
      tKey: "sidebar.system_settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Coupons",
          tKey: "sidebar.coupons",
          url: "/admin/coupons",
        },
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
          title: "Marketing Settings",
          tKey: "sidebar.marketing_settings",
          url: "/admin/marketing",
        },
        {
          title: "Subscribers",
          tKey: "sidebar.subscribers",
          url: "/admin/subscribers",
          icon: Mail,
        },
        {
          title: "Infrastructure & Marketing",
          tKey: "sidebar.infrastructure_marketing",
          url: "/admin/system-design",
          superOnly: true
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
  })).filter(item => item.items.length > 0);

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center relative">
        <Logo textClassName="text-sm md:text-base font-black tracking-wide whitespace-nowrap" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden md:flex absolute top-0 right-0 h-6 w-6 rounded-none rounded-bl-md"
          aria-label="Close sidebar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain items={data.navMain} pathname={pathname} role={role} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}


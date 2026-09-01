const routeTranslationMap: Record<string, string> = {
  '/admin/dashboard': 'sidebar.dashboard',
  '/admin/dashboard/report': 'sidebar.report',
  '/admin/dashboard/insight': 'sidebar.insight',
  '/admin/products': 'sidebar.all_products',
  '/admin/products/new': 'sidebar.add_product',
  '/admin/upcoming-expiry': 'sidebar.upcoming_expire',
  '/admin/low-stock': 'sidebar.low_stock',
  '/admin/categories': 'sidebar.categories',
  '/admin/brands': 'sidebar.brands',
  '/admin/returns': 'sidebar.return_list',
  '/admin/returns/new': 'sidebar.new_return',
  '/admin/orders': 'sidebar.all_orders',
  '/admin/abandoned-carts': 'sidebar.abandoned_carts',
  '/admin/offers': 'sidebar.offers_quotations',
  '/admin/chalans': 'sidebar.delivery_challans',
  '/admin/bills': 'sidebar.client_bills',
  '/admin/bills/create': 'sidebar.create_invoice',
  '/admin/suppliers': 'sidebar.suppliers_vendors',
  '/admin/supplier-bills': 'sidebar.supplier_bills',
  '/admin/loans': 'sidebar.all_loans',
  '/admin/loans/providers': 'sidebar.all_loan_providers',
  '/admin/loans/providers/new': 'sidebar.add_loan_provider',
  '/admin/loans/upcoming': 'sidebar.upcoming_payable',
  '/admin/accounts': 'sidebar.all_accounts',
  '/admin/accounts/new': 'sidebar.add_account',
  '/admin/expenses-incomes': 'sidebar.expenses_incomes',
  '/admin/expenses-incomes/categories': 'sidebar.add_category',
  '/admin/ledger': 'sidebar.accounts_ledger',
  '/admin/ledger/receivable': 'sidebar.account_receivable',
  '/admin/ledger/payable': 'sidebar.account_payable',
  '/admin/showrooms': 'sidebar.showrooms',
  '/admin/users': 'sidebar.all_users',
  '/admin/wholesalers': 'sidebar.wholesalers',
  '/admin/areas': 'sidebar.areas',
  '/admin/employees': 'sidebar.employees',
  '/admin/task-management': 'sidebar.task_management',
  '/admin/showroom-managers': 'sidebar.showroom_managers',
  '/admin/cms/banners': 'sidebar.banners',
  '/admin/landing-pages': 'sidebar.landing_pages',
  '/admin/cms/testimonials': 'sidebar.testimonials',
  '/admin/cms/faqs': 'sidebar.faqs',
  '/admin/blogs': 'sidebar.manage_blog',
  '/admin/blogs/new': 'sidebar.add_new_blog',
  '/admin/coupons': 'sidebar.coupons',
  '/admin/settings': 'sidebar.general_settings',
  '/admin/settings/profile': 'sidebar.profile',
  '/admin/marketing': 'sidebar.marketing_settings',
  '/admin/subscribers': 'sidebar.subscribers',
  '/admin/system-design': 'sidebar.infrastructure_marketing',
  '/employee/dashboard': 'sidebar.dashboard',
  '/showroom/dashboard': 'sidebar.dashboard',
  '/wholesaler/dashboard': 'sidebar.dashboard',
};

export function getPageTitle(pathname: string, t?: (key: string) => string): string {
  const cleanPath = pathname?.split('?')[0]?.replace(/\/$/, '') || '';
  
  if (t && routeTranslationMap[cleanPath]) {
    const translated = t(routeTranslationMap[cleanPath]);
    if (translated && translated !== routeTranslationMap[cleanPath]) {
      return translated;
    }
  }

  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length === 0) return 'Home';
  
  const last = parts[parts.length - 1];
  
  // Handle /new and /edit
  if (last === 'new' && parts.length > 1) {
    const parent = parts[parts.length - 2];
    return `Add ${formatWord(parent)}`;
  }
  if (last === 'edit' && parts.length > 2) {
    const parent = parts[parts.length - 3];
    return `Edit ${formatWord(parent)}`;
  }
  
  // Default fallback
  return formatWord(last);
}

function formatWord(word: string): string {
  if (!word) return '';
  return word.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}


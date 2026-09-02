'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Plus,
  FileText,
  HandCoins,
  Receipt,
  Package,
  ShoppingCart,
  Landmark,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/TransactionForm';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

  const topRowItems = [
    {
      title: 'হোম',
      labelKey: 'bottomnav.home',
      fallback: 'হোম',
      icon: Home,
      href: '/admin/dashboard',
    },
    {
      title: 'অ্যাড বিক্রয়',
      labelKey: 'bottomnav.sale',
      fallback: 'বিক্রয়',
      icon: Plus,
      href: '/admin/bills/create',
    },
    {
      title: 'বিক্রয় তালিকা',
      labelKey: 'bottomnav.sale_list',
      fallback: 'বিক্রয় তালিকা',
      icon: FileText,
      href: '/admin/orders',
    },
    {
      title: 'পেমেন্ট রিসিভ',
      labelKey: 'bottomnav.received',
      fallback: 'রিসিভ',
      icon: HandCoins,
      onClick: () => {
        setTransactionType('income');
        setIsTransactionDialogOpen(true);
      },
    },
    {
      title: 'পেমেন্ট',
      labelKey: 'bottomnav.payment',
      fallback: 'পেমেন্ট',
      icon: HandCoins,
      onClick: () => {
        setTransactionType('expense');
        setIsTransactionDialogOpen(true);
      },
    },
  ];

  const bottomRowItems = [
    {
      title: 'খরচ অ্যাড',
      labelKey: 'bottomnav.expense',
      fallback: 'খরচ',
      icon: Plus,
      onClick: () => {
        setTransactionType('expense');
        setIsTransactionDialogOpen(true);
      },
    },
    {
      title: 'স্টক',
      labelKey: 'bottomnav.stock',
      fallback: 'স্টক',
      icon: Plus,
      href: '/admin/products/new',
    },
    {
      title: 'এ্যাড ক্রয়',
      labelKey: 'bottomnav.purchase',
      fallback: 'মালক্রয়',
      icon: Plus,
      href: '/admin/supplier-bills/create',
    },
    {
      title: 'অ্যাকাউন্ট',
      labelKey: 'sidebar.accounts',
      fallback: 'অ্যাকাউন্ট',
      icon: Landmark,
      href: '/admin/accounts',
    },
  ];

  const renderItem = (item: any, idx: number) => {
    const Icon = item.icon;
    const label = t(item.labelKey) || item.fallback;
    const isActive =
      item.href &&
      (pathname === item.href ||
        (item.href !== '/admin/dashboard' && pathname.startsWith(item.href)));

    const linkClass = `inline-flex flex-col items-center justify-center px-1 py-1 no-underline text-center transition-colors rounded ${
      isActive
        ? 'bg-white font-bold shadow-xs'
        : 'text-white hover:bg-white/20'
    }`;

    if (item.href) {
      return (
        <li key={idx} className="inline-block flex-1 max-w-[70px]">
          <Link
            href={item.href}
            title={item.title}
            className={`${linkClass} w-full`}
            style={{
              color: isActive ? '#009688' : '#ffffff',
            }}
          >
            <Icon
              className="h-4 w-4 mb-0.5 shrink-0"
              style={{ color: isActive ? '#009688' : '#ffffff' }}
            />
            <span
              className="text-[11px] leading-tight whitespace-nowrap"
              style={{ color: isActive ? '#009688' : '#ffffff' }}
            >
              {label}
            </span>
          </Link>
        </li>
      );
    }

    return (
      <li key={idx} className="inline-block flex-1 max-w-[70px]">
        <button
          type="button"
          title={item.title}
          onClick={item.onClick}
          className={`${linkClass} border-0 cursor-pointer w-full`}
          style={{
            color: '#ffffff',
          }}
        >
          <Icon
            className="h-4 w-4 mb-0.5 shrink-0"
            style={{ color: '#ffffff' }}
          />
          <span
            className="text-[11px] leading-tight whitespace-nowrap"
            style={{ color: '#ffffff' }}
          >
            {label}
          </span>
        </button>
      </li>
    );
  };

  return (
    <>
      <div
        className="fixed md:hidden z-40 bg-[#009688] text-white shadow-[0_2px_12px_rgba(0,0,0,0.25)] select-none text-center"
        style={{
          left: '8px',
          right: '8px',
          bottom: '8px',
          borderRadius: '8px',
          padding: '4px 2px',
        }}
      >
        {/* Row 1: 5 items (হোম, বিক্রয়, বিক্রয় তালিকা, রিসিভ, পেমেন্ট) */}
        <ul className="flex items-center justify-around p-0 m-0 list-none text-center w-full">
          {topRowItems.map((item, idx) => renderItem(item, idx))}
        </ul>

        {/* Row 2: 4 items (খরচ, স্টক, মালক্রয়, অ্যাকাউন্ট) */}
        <ul className="flex items-center justify-around p-0 mt-0.5 mb-0 list-none text-center w-full">
          {bottomRowItems.map((item, idx) => renderItem(item, idx + 10))}
        </ul>
      </div>

      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border shadow-lg rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {transactionType === 'income' ? 'Add Income / Receive' : 'Add Expense / Payment'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultType={transactionType}
            onSuccess={() => {
              setIsTransactionDialogOpen(false);
              router.refresh();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('refresh-dashboard'));
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}


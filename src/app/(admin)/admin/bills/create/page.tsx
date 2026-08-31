import React from 'react';
import { BillForm } from '@/components/admin/bills/BillForm';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  return {
    title: `Create Invoice | ${storeName}`,
  };
}

export default function CreateBillPage() {
  return (
    <div className="px-[1px] pt-[1px] pb-4 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="hidden md:block mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground text-sm">Generate a new billing invoice for your customer</p>
      </div>
      <BillForm />
    </div>
  );
}

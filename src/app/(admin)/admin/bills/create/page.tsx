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
    <div className="px-[1px] pt-[1px] pb-4 md:pt-[6px] md:px-4 md:pb-6 w-full max-w-full overflow-x-hidden">
      <BillForm />
    </div>
  );
}

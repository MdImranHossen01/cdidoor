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
    <div className="container mx-auto py-8">
      <BillForm />
    </div>
  );
}

import React from 'react';
import { BillForm } from '@/components/admin/bills/BillForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Invoice | CDI Door Ind',
};

export default function CreateBillPage() {
  return (
    <div className="container mx-auto py-8">
      <BillForm />
    </div>
  );
}

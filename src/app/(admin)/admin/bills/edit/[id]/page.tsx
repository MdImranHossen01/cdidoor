'use client';

import React, { useEffect, useState } from 'react';
import { BillForm } from '@/components/admin/bills/BillForm';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditBillPage() {
  const { id } = useParams();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchBill = async () => {
      try {
        const res = await fetch(`/api/admin/bills/${id}`);
        if (!res.ok) throw new Error('Failed to load bill');
        const data = await res.json();
        setBill(data);
      } catch (err: any) {
        toast.error(err.message || 'Error loading bill');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBill();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Bill not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <BillForm initialData={bill} />
    </div>
  );
}

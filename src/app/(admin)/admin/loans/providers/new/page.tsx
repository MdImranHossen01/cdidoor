'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizePhoneNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function NewLoanProviderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Name is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/loans/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: normalizePhoneNumber(phone), email, address, description }),
      });

      if (res.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Loan provider added successfully.',
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
        });
        router.push('/admin/loans/providers');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to create provider');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Add Loan Provider</h1>
          <p className="text-muted-foreground text-sm">Create a new lender or financial source</p>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Lender Details
          </CardTitle>
          <CardDescription>Fill out the form below to add a new provider to your system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Lender / Provider Name *</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bank Asia, Imran Shuvo, etc."
                className="bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., +88017xxxxxxxx"
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., info@bank.com"
                  className="bg-background text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Lender address details"
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Notes / Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any special terms, notes, or descriptions"
                className="bg-background text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Provider'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

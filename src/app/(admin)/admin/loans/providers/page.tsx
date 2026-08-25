'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Trash2, Edit, Users, Phone, Mail, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function LoanProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/loans/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (error) {
      toast.error('Failed to load loan providers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will delete the loan provider. You can't delete providers with active loans.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/loans/providers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Provider deleted successfully');
        fetchProviders();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete provider');
      }
    } catch (error) {
      toast.error('Error deleting provider');
    }
  };

  const handleEditClick = (provider: any) => {
    setEditProvider(provider);
    setEditName(provider.name);
    setEditPhone(provider.phone || '');
    setEditEmail(provider.email || '');
    setEditAddress(provider.address || '');
    setEditDescription(provider.description || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) {
      toast.error('Name is required');
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch(`/api/admin/loans/providers/${editProvider._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail,
          address: editAddress,
          description: editDescription
        })
      });

      if (res.ok) {
        toast.success('Provider updated successfully');
        setIsEditOpen(false);
        fetchProviders();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to update provider');
      }
    } catch (error) {
      toast.error('Error updating provider');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Loan Providers</h1>
          <p className="text-muted-foreground mt-1">Manage individuals and banks who provide business loans</p>
        </div>
        <Link href="/admin/loans/providers/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Add New Provider
          </Button>
        </Link>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <Users className="h-5 w-5" />
              Providers List
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : filteredProviders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No providers found</TableCell></TableRow>
              ) : (
                filteredProviders.map((provider) => (
                  <TableRow key={provider._id}>
                    <TableCell className="font-semibold">{provider.name}</TableCell>
                    <TableCell>
                      {provider.phone ? (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {provider.phone}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {provider.email ? (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {provider.email}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {provider.address ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> {provider.address}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{provider.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(provider)} className="text-primary hover:text-primary/80 mr-1">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(provider._id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Loan Provider</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Lender / Provider Name *</Label>
              <Input required value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone Number</Label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} />
            </div>
            <div>
              <Label>Notes / Description</Label>
              <Textarea rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

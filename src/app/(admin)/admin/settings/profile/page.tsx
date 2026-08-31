'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { User, Shield, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setImage(data.image || '');
        if (data.addresses && data.addresses.length > 0) {
          const addr = data.addresses[0];
          setStreet(addr.street || '');
          setCity(addr.city || '');
          setState(addr.state || '');
          setZipCode(addr.zipCode || '');
          setCountry(addr.country || 'Bangladesh');
        }
      } else {
        toast.error('Failed to load profile details.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred loading profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Name and Email are required.');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          image,
          address: {
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: true
          },
          password: password || undefined
        })
      });

      if (res.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Profile updated successfully.',
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
        });
        setPassword('');
        setConfirmPassword('');
        fetchProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-[1px] pt-[1px] pb-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information, address, and password settings</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - profile image upload */}
        <div className="space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-lg font-bold">Profile Photo</CardTitle>
              <CardDescription>Upload a clear portrait photo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <ImageUpload
                value={image}
                onUpload={(url) => setImage(url)}
                aspect="square"
              />
              {image && (
                <Button type="button" variant="outline" size="sm" onClick={() => setImage('')}>
                  Remove Photo
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - profile details and password */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              {/* Address details */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="font-semibold text-sm text-primary">Default Address</h4>
                <div className="space-y-1">
                  <Label htmlFor="street">Street Address</Label>
                  <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state">State / Division</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="zipCode">Zip / Postal Code</Label>
                    <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>Leave password fields blank if you do not want to change it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="password">New Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

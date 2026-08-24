'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AddAccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    accountCategory: 'Cash',
    mfsProvider: 'bKash',
    mfsType: 'Merchant',
    branchName: '',
    bankAccountType: 'Savings',
    accountNo: '',
    openingBalance: '',
    note: ''
  });
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('অ্যাকাউন্টের নাম আবশ্যক (Account Name is required)');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create account');
      }
      
      toast.success('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! (Account created successfully!)');
      router.push('/admin/accounts');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-6 pb-20 px-4">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 px-4 py-3 flex justify-between items-center text-white">
          <h2 className="text-lg font-semibold">
            {t("sidebar.add_account") || "অ্যাড অ্যাকাউন্ট (Add Account)"}
          </h2>
          <Link href="/admin/accounts">
            <button className="text-white hover:bg-emerald-700 p-1 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              অ্যাকাউন্টের নাম <span className="text-red-500">*</span>
            </Label>
            <Input 
              placeholder="অ্যাকাউন্টের নাম (e.g. Bkash, Dutch Bangla)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 border-gray-300 focus-visible:ring-emerald-600 text-lg"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">অ্যাকাউন্টের ধরন (Account Type)</Label>
            <Select value={formData.accountCategory} onValueChange={(val) => setFormData({ ...formData, accountCategory: val })}>
              <SelectTrigger className="h-12 border-gray-300 focus:ring-emerald-600 text-lg">
                <SelectValue placeholder="সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="MFS">MFS (bKash, Nagad, etc.)</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accountCategory === 'MFS' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-2">
                <Label className="text-base font-semibold">MFS Provider (bKash/Nagad etc.)</Label>
                <Select value={formData.mfsProvider} onValueChange={(val) => setFormData({ ...formData, mfsProvider: val })}>
                  <SelectTrigger className="h-12 border-gray-300 focus:ring-emerald-600 text-lg bg-white dark:bg-black">
                    <SelectValue placeholder="সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Nagad">Nagad</SelectItem>
                    <SelectItem value="Rocket">Rocket</SelectItem>
                    <SelectItem value="Upay">Upay</SelectItem>
                    <SelectItem value="mCash">mCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">MFS Type</Label>
                <Select value={formData.mfsType} onValueChange={(val) => setFormData({ ...formData, mfsType: val })}>
                  <SelectTrigger className="h-12 border-gray-300 focus:ring-emerald-600 text-lg bg-white dark:bg-black">
                    <SelectValue placeholder="সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Merchant">Merchant</SelectItem>
                    <SelectItem value="Agent">Agent</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.accountCategory === 'Bank' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-base font-semibold">ব্রাঞ্চের নাম (Branch Name)</Label>
                <Input 
                  placeholder="e.g. Gulshan Branch"
                  value={formData.branchName || ""}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="h-12 border-gray-300 focus-visible:ring-emerald-600 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">ব্যাংক অ্যাকাউন্টের ধরন</Label>
                <Select value={formData.bankAccountType} onValueChange={(val) => setFormData({ ...formData, bankAccountType: val })}>
                  <SelectTrigger className="h-12 border-gray-300 focus:ring-emerald-600 text-lg">
                    <SelectValue placeholder="সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(formData.accountCategory === 'MFS' || formData.accountCategory === 'Bank') && (
            <div className="space-y-2 animate-in fade-in">
              <Label className="text-base font-semibold">অ্যাকাউন্ট নং (Account Number)</Label>
              <Input 
                placeholder="অ্যাকাউন্ট নং"
                value={formData.accountNo}
                onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                className="h-12 border-gray-300 focus-visible:ring-emerald-600 text-lg"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-base font-semibold">ওপেনিং ব্যালান্স</Label>
            <Input 
              type="number"
              min="0"
              placeholder="ওপেনিং ব্যালান্স"
              value={formData.openingBalance}
              onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
              className="h-12 border-gray-300 focus-visible:ring-emerald-600 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">নোট</Label>
            <Textarea 
              placeholder="নোট"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="min-h-[100px] border-gray-300 focus-visible:ring-emerald-600 text-lg resize-y"
            />
          </div>

          <div className="pt-2 flex justify-center">
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto px-8 h-12 text-lg rounded-full"
              disabled={submitting}
            >
              <Save className="w-5 h-5 mr-2" />
              সাবমিট
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

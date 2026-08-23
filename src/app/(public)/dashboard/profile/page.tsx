'use client';

import { ProfileForm } from '@/components/user/ProfileForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfilePage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">{t('store.dashboard.profile_info') || 'Profile Information'}</h1>
        <p className="text-sm text-muted-foreground">{t('store.dashboard.manage_personal_details') || 'Manage your personal details'}</p>
      </div>
      <ProfileForm />
    </div>
  );
}


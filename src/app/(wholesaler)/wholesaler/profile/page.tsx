'use client';

import { ProfileForm } from '@/components/user/ProfileForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WholesalerProfilePage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col space-y-4 pt-3 pb-6 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('store.dashboard.profile_info') || 'Profile Information'}</h1>
        </div>
      </div>
      <ProfileForm />
    </div>
  );
}

'use client';

import { PasswordChangeForm } from '@/components/user/PasswordChangeForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">{t('store.dashboard.account_settings') || 'Account Settings'}</h1>
        <p className="text-sm text-muted-foreground">{t('store.dashboard.update_security') || 'Update password and security'}</p>
      </div>
      <PasswordChangeForm />
    </div>
  );
}


'use client';

import { ProfileForm } from '@/components/user/ProfileForm';

export default function EmployeeProfilePage() {
  return (
    <div className="flex flex-col space-y-4 pt-3 pb-6 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Profile Information</h1>
        </div>
      </div>
      <ProfileForm />
    </div>
  );
}

'use client';

import { PasswordChangeForm } from '@/components/user/PasswordChangeForm';
import { Card, CardContent } from '@/components/ui/card';

export default function EmployeeChangePasswordPage() {
  return (
    <div className="flex flex-col space-y-4 pt-3 pb-6 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Change Password</h1>
        </div>
      </div>
      <Card className="w-full">
        <CardContent className="pt-6">
          <PasswordChangeForm hideHeader={true} />
        </CardContent>
      </Card>
    </div>
  );
}

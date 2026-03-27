'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { AuthForm } from '@/components/auth-form';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isPending && session?.user) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      <AuthForm mode="forgot-password" />
    </div>
  );
}

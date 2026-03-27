'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button, Card, Alert, Spinner, useToast } from '@/components/ui';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    verifyEmail(token);
  }, [token]);

  async function verifyEmail(token: string) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/verify-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Verification failed');
      }

      setStatus('success');
      toast('Email verified successfully!', 'success');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStatus('error');
    }
  }

  async function resendVerification() {
    toast('Please sign in to resend verification email', 'info');
    router.push('/login');
  }

  if (status === 'verifying') {
    return (
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Verifying Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Email Verified!</h2>
            <p className="mb-6 text-gray-600">
              Your email has been verified successfully. You can now sign in to your account.
            </p>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
            <p className="mt-4 text-sm text-gray-500">Redirecting to sign in automatically...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'no-token') {
    return (
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="mb-6 text-gray-600">
              Please check your inbox for a verification link. If you haven&apos;t received an
              email, you can request a new one.
            </p>
            <div className="space-y-3">
              <Button onClick={resendVerification} variant="secondary" className="w-full">
                Resend Verification Email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="w-full max-w-md">
      <Card>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Verification Failed</h2>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <p className="mb-6 text-gray-600">
            The verification link may have expired or already been used.
          </p>
          <div className="space-y-3">
            <Button onClick={resendVerification} className="w-full">
              Resend Verification Email
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

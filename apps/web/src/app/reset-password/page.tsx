'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button, Input, Label, Card, Alert, useToast } from '@/components/ui';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
      toast('Password reset successfully!', 'success');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Password Reset</h2>
            <p className="mb-6 text-gray-600">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Set New Password</h2>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {!token ? (
          <div className="text-center">
            <p className="mb-4 text-gray-600">The reset link is invalid or has expired.</p>
            <Link href="/forgot-password">
              <Button variant="secondary" className="w-full">
                Request New Link
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="mb-1">
                New Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="mb-1">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Confirm new password"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { signIn, signUp, signInGoogle } from '@/lib/auth-client';
import { Button, Input, Label, Card, Alert, useToast } from '@/components/ui';

interface AuthFormProps {
  mode: 'login' | 'signup' | 'forgot-password' | 'reset-password';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgotPassword = mode === 'forgot-password';

  // Get referral code from URL if present
  const referralCode = searchParams.get('ref');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (isForgotPassword) {
        // Better Auth uses `forgetPassword` via the API call
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/forget-password`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, redirectTo: '/reset-password' }),
          }
        );
        if (!response.ok) {
          throw new Error('Failed to send reset email');
        }
        setSuccess(true);
        toast('Check your email for a reset link', 'success');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const result = await signIn.email({
          email,
          password,
        });

        if (result.error) {
          if (result.error.message?.includes('verify')) {
            setError('Please verify your email address. Check your inbox for a verification link.');
          } else {
            setError(result.error.message || 'Invalid email or password');
          }
          setLoading(false);
          return;
        }

        router.push('/dashboard');
        router.refresh();
      } else if (isSignup) {
        const result = await signUp.email({
          email,
          password,
          name,
        });

        if (result.error) {
          setError(result.error.message || 'Failed to create account');
          setLoading(false);
          return;
        }

        // Store referral code for org creation
        if (referralCode) {
          sessionStorage.setItem('referralCode', referralCode);
        }

        // Show verification message
        setSuccess(true);
        toast('Account created! Please check your email to verify your account.', 'success');
        setLoading(false);
      }
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInGoogle('/dashboard');
    } catch {
      toast('Failed to sign in with Google', 'error');
      setGoogleLoading(false);
    }
  }

  if (success && (isSignup || isForgotPassword)) {
    return (
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {isSignup ? 'Check your email' : 'Reset link sent'}
            </h2>
            <p className="mb-6 text-gray-600">
              {isSignup
                ? "We've sent you a verification email. Please click the link to verify your account."
                : "We've sent you a password reset link. Please check your email."}
            </p>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {isLogin && 'Sign in to your account'}
          {isSignup && 'Create your account'}
          {isForgotPassword && 'Reset your password'}
        </h2>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <Label htmlFor="name" className="mb-1">
                Display Name
              </Label>
              <Input id="name" name="name" type="text" required placeholder="John Doe" />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="mb-1">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="mb-1">
                  Password
                </Label>
                {isLogin && (
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Loading...'
              : isLogin
                ? 'Sign In'
                : isSignup
                  ? 'Create Account'
                  : 'Send Reset Link'}
          </Button>
        </form>

        {!isForgotPassword && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={googleLoading}
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up
              </Link>
            </>
          ) : isSignup ? (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </>
          ) : (
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Back to sign in
            </Link>
          )}
        </p>
      </Card>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Button, Spinner } from '@/components/ui';
import { PricingSection } from '@/components/pricing-section';

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

const features = [
  {
    name: 'Authentication Built-in',
    description: 'Email/password and Google OAuth with organization-based multi-tenancy.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
  {
    name: 'Subscription Billing',
    description: 'Stripe integration with trials, usage tracking, and plan management.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
        />
      </svg>
    ),
  },
  {
    name: 'Role-Based Access',
    description: 'Owners, admins, and members with fine-grained permissions.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    name: 'Usage Limits',
    description: 'Plan-based resource limits with automatic enforcement.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    name: 'Email Notifications',
    description: 'Transactional emails via Resend for onboarding, invites, and alerts.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
  {
    name: 'Analytics Ready',
    description: 'PostHog integration for product analytics and user tracking.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
        />
      </svg>
    ),
  },
];

const stats = [
  { label: 'Time saved', value: '100+ hrs' },
  { label: 'Components', value: '50+' },
  { label: 'API Routes', value: '25+' },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  // Get referral code from URL if present
  const refCode = searchParams.get('ref');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (!isPending && session?.user) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  // Show loading state during initial mount or session check
  const isLoading = !mounted || isPending;

  // If logged in, show redirect state
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const signupUrl = refCode ? `/signup?ref=${refCode}` : '/signup';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">SaaS Kit</span>
            </div>
            {/* Centered nav links */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="h-9 w-20 animate-pulse bg-gray-200 rounded-lg"></div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href={signupUrl}>
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-50 rounded-full blur-3xl opacity-80"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              <span className="text-sm text-primary-700 font-medium">
                Production-ready SaaS boilerplate
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
              <span className="text-gray-900">Ship your SaaS</span>
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                in days, not months
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A beautifully crafted boilerplate with auth, billing, teams, and everything you need.
              Stop rebuilding infrastructure. Start building your product.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              {isLoading ? (
                <div className="h-14 w-48 animate-pulse bg-gray-200 rounded-xl"></div>
              ) : (
                <>
                  <Link href={signupUrl}>
                    <Button size="lg" className="w-full sm:w-auto px-8 py-3 h-auto text-base">
                      Start Free Trial
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto px-8 py-3 h-auto text-base"
                    >
                      See Features
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500">14-day free trial &middot; Cancel anytime</p>

            {/* Stats */}
            <div className="mt-16 flex justify-center gap-8 sm:gap-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-600">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 mb-4">
              <span className="text-xs font-medium text-primary-700 uppercase tracking-wider">
                Features
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to launch
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stop rebuilding the same infrastructure. Focus on what makes your product unique.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4 text-primary-600 group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 mb-4">
              <span className="text-xs font-medium text-primary-700 uppercase tracking-wider">
                Pricing
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
          </div>
          <PricingSection signupUrl={signupUrl} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to ship your product?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Join developers building their SaaS products faster. Start your free trial today and
            launch in days.
          </p>
          <Link href={signupUrl}>
            <Button
              size="lg"
              className="!bg-white !text-primary-700 hover:!bg-gray-100 px-8 py-3 h-auto text-base font-semibold shadow-lg"
            >
              Start Free Trial
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <span className="text-sm text-gray-600">
                Built with Next.js, Tailwind CSS, and Better Auth
              </span>
            </div>
            <div className="flex gap-6">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={signupUrl}
                className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

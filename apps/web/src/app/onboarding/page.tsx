'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useSession, useActiveOrganization, organization } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { Button, Card, Input, Label, Alert, Spinner } from '@/components/ui';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type OnboardingStep = 'organization' | 'billing' | 'complete';

function PaymentForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding?step=complete`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          Back
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? 'Processing...' : 'Start Trial'}
        </Button>
      </div>
    </form>
  );
}

function BillingStep({
  clientSecret,
  onSuccess,
  onBack,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#6366f1',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: activeOrg, isPending: orgPending } = useActiveOrganization();

  const [step, setStep] = useState<OnboardingStep>('organization');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organization form
  const [orgName, setOrgName] = useState('');

  // Billing setup
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Get plan and interval from URL
  const planId = searchParams.get('plan') || 'starter';
  const interval = (searchParams.get('interval') as 'monthly' | 'annual') || 'monthly';

  // Check URL step param (for redirect from Stripe)
  useEffect(() => {
    const urlStep = searchParams.get('step');
    if (urlStep === 'complete') {
      setStep('complete');
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push('/login');
    }
  }, [session, sessionPending, router]);

  // Check if user already has an org with billing setup
  useEffect(() => {
    if (activeOrg && !orgPending) {
      // Check billing status
      api.billing
        .getSubscription()
        .then((response) => {
          if (response.data?.stripeSubscriptionId) {
            // Already has billing setup, redirect to dashboard
            router.push('/dashboard');
          } else if (activeOrg) {
            // Has org but no billing, go to billing step
            setStep('billing');
            setupBilling();
          }
        })
        .catch(() => {
          // No subscription data, stay in onboarding
        });
    }
  }, [activeOrg, orgPending, router]);

  const setupBilling = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.billing.setup(planId, interval);
      if (response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
      } else {
        setError('Failed to initialize billing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup billing');
    } finally {
      setLoading(false);
    }
  }, [planId, interval]);

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create the organization
      const result = await organization.create({
        name: orgName,
        slug: orgName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-'),
      });

      if (result.error) {
        setError(result.error.message || 'Failed to create organization');
        setLoading(false);
        return;
      }

      // Set as active organization
      await organization.setActive({
        organizationId: result.data!.id,
      });

      // Apply referral code if present
      const referralCode = sessionStorage.getItem('referralCode');
      if (referralCode) {
        try {
          await api.billing.applyReferral(referralCode);
          sessionStorage.removeItem('referralCode');
        } catch {
          // Referral code application is best-effort
        }
      }

      // Setup billing
      await setupBilling();
      setStep('billing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleBillingSuccess() {
    setStep('complete');
  }

  function handleComplete() {
    router.push('/dashboard');
  }

  if (sessionPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'organization' || step === 'billing' || step === 'complete'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm text-gray-600">Organization</span>
            </div>
            <div className="flex-1 h-0.5 mx-4 bg-gray-200">
              <div
                className={`h-full bg-primary-600 transition-all ${
                  step === 'billing' || step === 'complete' ? 'w-full' : 'w-0'
                }`}
              />
            </div>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'billing' || step === 'complete'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm text-gray-600">Billing</span>
            </div>
          </div>
        </div>

        <Card className="p-6">
          {step === 'organization' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your organization</h2>
              <p className="text-gray-600 mb-6">Set up your workspace to get started.</p>

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div>
                  <Label htmlFor="orgName" className="mb-1">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Inc."
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>

                <Button type="submit" disabled={loading || !orgName.trim()} className="w-full">
                  {loading ? 'Creating...' : 'Continue'}
                </Button>
              </form>
            </>
          )}

          {step === 'billing' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Start your free trial</h2>
              <p className="text-gray-600 mb-6">
                Add a payment method to start your 14-day free trial. You won&apos;t be charged
                until the trial ends.
              </p>

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              {loading && !clientSecret && (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              )}

              {clientSecret && (
                <BillingStep
                  clientSecret={clientSecret}
                  onSuccess={handleBillingSuccess}
                  onBack={() => setStep('organization')}
                />
              )}
            </>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
              <p className="text-gray-600 mb-6">
                Your 14-day free trial has started. Enjoy exploring all features.
              </p>
              <Button onClick={handleComplete} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Questions?{' '}
          <a href="mailto:support@example.com" className="text-primary-600 hover:text-primary-500">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
          <Spinner size="lg" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

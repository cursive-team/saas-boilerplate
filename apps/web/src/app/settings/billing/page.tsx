'use client';

import { useState, useEffect } from 'react';
import { useActiveOrganization } from '@/lib/auth-client';
import {
  Card,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  Spinner,
  useToast,
} from '@/components/ui';
import { RoleGate, AccessDenied } from '@/components/gates';

interface Subscription {
  planId: string;
  planName: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  isTrialing: boolean;
  referralCode: string;
  referralCredits: number;
}

interface Plan {
  name: string;
  stripePriceId: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

type Usage = Record<string, { current: number; limit: number; percentage: number }>;

export default function BillingSettingsPage() {
  return (
    <RoleGate
      roles={['owner', 'admin']}
      fallback={<AccessDenied message="Only admins can manage billing." />}
    >
      <BillingSettingsContent />
    </RoleGate>
  );
}

function BillingSettingsContent() {
  const { data: activeOrg, isPending } = useActiveOrganization();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (activeOrg) {
      fetchBillingData();
    }
  }, [activeOrg]);

  async function fetchBillingData() {
    setLoading(true);
    try {
      const [subRes, plansRes, usageRes] = await Promise.all([
        fetch(`${apiUrl}/api/billing/subscription`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/billing/plans`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/billing/usage`, { credentials: 'include' }),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.data);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.data.plans);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(planId: string) {
    if (!confirm(`Are you sure you want to change to the ${plans[planId]?.name} plan?`)) return;

    setActionLoading('change-plan');
    try {
      const res = await fetch(`${apiUrl}/api/billing/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change plan');
      }

      toast('Plan changed successfully!', 'success');
      fetchBillingData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to change plan', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.'
      )
    ) {
      return;
    }

    setActionLoading('cancel');
    try {
      const res = await fetch(`${apiUrl}/api/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ immediately: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast(
        'Subscription canceled. You will retain access until the end of your billing period.',
        'info'
      );
      fetchBillingData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleOpenPortal() {
    setActionLoading('portal');
    try {
      const res = await fetch(`${apiUrl}/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to open billing portal');
      }

      const { data } = await res.json();
      window.location.href = data.url;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to open billing portal', 'error');
      setActionLoading(null);
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentPlan = subscription?.planId ? plans[subscription.planId] : null;
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Billing & Subscription</h2>
        <p className="mt-1 text-sm text-gray-600">Manage your subscription and payment methods</p>
      </div>

      {/* Trial Banner */}
      {subscription?.isTrialing && trialDaysLeft > 0 && (
        <Alert variant="info">
          You have {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your trial. Add a
          payment method to continue after your trial ends.
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardTitle className="mb-2">Current Plan</CardTitle>
        <CardDescription className="mb-4">
          {currentPlan?.name || 'Unknown'} Plan
          {subscription?.isTrialing && ' (Trial)'}
        </CardDescription>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Features</h4>
          <ul className="space-y-2">
            {currentPlan &&
              Object.entries(currentPlan.features).map(([feature, enabled]) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  {enabled ? (
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className={enabled ? 'text-gray-900' : 'text-gray-400'}>
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleOpenPortal} disabled={!!actionLoading}>
            {actionLoading === 'portal' ? 'Loading...' : 'Manage Payment Method'}
          </Button>
          {subscription?.stripeSubscriptionId && (
            <Button
              variant="ghost"
              onClick={handleCancelSubscription}
              disabled={!!actionLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          )}
        </div>
      </Card>

      {/* Usage */}
      {usage && (
        <Card>
          <CardTitle className="mb-2">Usage</CardTitle>
          <CardDescription className="mb-4">
            Your current usage for this billing period
          </CardDescription>

          <div className="space-y-4">
            {Object.entries(usage).map(([metric, { current, limit }]) => {
              const percentage = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
              const isNearLimit = percentage >= 80;
              const metricName =
                metric === 'api:calls'
                  ? 'API Calls'
                  : metric.charAt(0).toUpperCase() + metric.slice(1);

              return (
                <div key={metric}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{metricName}</span>
                    <span className={isNearLimit ? 'text-yellow-600' : 'text-gray-600'}>
                      {current} / {limit === Infinity ? 'Unlimited' : limit}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearLimit ? 'bg-yellow-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardTitle className="mb-2">Available Plans</CardTitle>
        <CardDescription className="mb-4">
          Choose the plan that best fits your needs
        </CardDescription>

        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(plans).map(([planId, plan]) => {
            const isCurrentPlan = subscription?.planId === planId;

            return (
              <div
                key={planId}
                className={`rounded-lg border p-4 ${
                  isCurrentPlan ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                  {isCurrentPlan && (
                    <span className="text-xs font-medium text-primary-600">Current</span>
                  )}
                </div>

                <ul className="space-y-1 mb-4">
                  <li className="text-sm text-gray-600">
                    Up to {plan.limits.members} team members
                  </li>
                  {Object.entries(plan.features).map(([feature, enabled]) => (
                    <li key={feature} className="text-sm text-gray-600 flex items-center gap-1">
                      {enabled ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-gray-300">✗</span>
                      )}
                      {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </li>
                  ))}
                </ul>

                {!isCurrentPlan && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleChangePlan(planId)}
                    disabled={!!actionLoading}
                    className="w-full"
                  >
                    {actionLoading === 'change-plan' ? 'Changing...' : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

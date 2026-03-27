'use client';

import { useState } from 'react';
import { useActiveOrganization } from '@/lib/auth-client';
import { Button } from './ui/button';

interface TrialExpiredBannerProps {
  /** Custom message to display */
  message?: string;
  /** Custom CTA text */
  ctaText?: string;
  /** URL to redirect to when CTA is clicked */
  ctaUrl?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Called when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * Banner displayed when the organization's trial has expired.
 * Prompts users to add a payment method to continue using the app.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TrialExpiredBanner />
 *
 * // With custom message
 * <TrialExpiredBanner
 *   message="Your free trial ended. Upgrade now!"
 *   ctaText="Upgrade Now"
 * />
 * ```
 */
export function TrialExpiredBanner({
  message = 'Your trial has expired. Add a payment method to continue using all features.',
  ctaText = 'Add Payment Method',
  ctaUrl = '/settings/billing',
  dismissible = false,
  onDismiss,
}: TrialExpiredBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { data: activeOrg, isPending } = useActiveOrganization();

  // Check if trial has expired
  const isTrialExpired = (() => {
    if (isPending || !activeOrg) return false;

    const org = activeOrg as { planId?: string; trialEndsAt?: string };
    if (!org.trialEndsAt) return false;

    const trialEnd = new Date(org.trialEndsAt);
    const now = new Date();

    const isTrialPlan =
      org.planId?.toLowerCase().includes('trial') || org.planId?.toLowerCase() === 'starter';

    return isTrialPlan && trialEnd < now;
  })();

  // Don't render if not expired, loading, or dismissed
  if (!isTrialExpired || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-amber-800">{message}</p>
          </div>

          <div className="flex items-center gap-3">
            <a href={ctaUrl}>
              <Button size="sm" variant="primary">
                {ctaText}
              </Button>
            </a>

            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md p-1.5 text-amber-600 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if the current organization's trial has expired.
 */
export function useTrialExpired(): boolean {
  const { data: activeOrg, isPending } = useActiveOrganization();

  if (isPending || !activeOrg) return false;

  const org = activeOrg as { planId?: string; trialEndsAt?: string };
  if (!org.trialEndsAt) return false;

  const trialEnd = new Date(org.trialEndsAt);
  const now = new Date();

  const isTrialPlan =
    org.planId?.toLowerCase().includes('trial') || org.planId?.toLowerCase() === 'starter';

  return isTrialPlan && trialEnd < now;
}

/**
 * Hook to get trial status information.
 */
export function useTrialStatus(): {
  isTrialPlan: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  trialEndsAt: Date | null;
} {
  const { data: activeOrg, isPending } = useActiveOrganization();

  if (isPending || !activeOrg) {
    return {
      isTrialPlan: false,
      isExpired: false,
      daysRemaining: null,
      trialEndsAt: null,
    };
  }

  const org = activeOrg as { planId?: string; trialEndsAt?: string };

  const isTrialPlan =
    org.planId?.toLowerCase().includes('trial') || org.planId?.toLowerCase() === 'starter';

  if (!org.trialEndsAt) {
    return {
      isTrialPlan,
      isExpired: false,
      daysRemaining: null,
      trialEndsAt: null,
    };
  }

  const trialEnd = new Date(org.trialEndsAt);
  const now = new Date();
  const isExpired = isTrialPlan && trialEnd < now;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isTrialPlan,
    isExpired,
    daysRemaining: isTrialPlan ? daysRemaining : null,
    trialEndsAt: trialEnd,
  };
}

'use client';

import { type ReactNode } from 'react';
import { useActiveOrganization, useActiveMember } from '@/lib/auth-client';
import { PLANS } from '@project/shared';

interface FeatureGateProps {
  /** The feature key to check (e.g., 'advancedReports') */
  feature: string;
  /** Content to show when feature is available */
  children: ReactNode;
  /** Content to show when feature is not available (upgrade prompt) */
  fallback?: ReactNode;
}

/**
 * Gate content based on plan features.
 *
 * @example
 * ```tsx
 * <FeatureGate feature="advancedReports" fallback={<UpgradePrompt />}>
 *   <AdvancedReportsPanel />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { data: activeOrg, isPending } = useActiveOrganization();

  if (isPending) {
    return null;
  }

  if (!activeOrg) {
    return fallback || null;
  }

  const org = activeOrg as { planId?: string; customPlanConfig?: string | null };

  // Check for custom plan config first (enterprise/custom plans)
  if (org.customPlanConfig) {
    try {
      const customConfig = JSON.parse(org.customPlanConfig);
      if (customConfig.features && typeof customConfig.features[feature] === 'boolean') {
        // Custom config explicitly defines this feature
        if (customConfig.features[feature]) {
          return <>{children}</>;
        } else {
          return fallback || null;
        }
      }
      // If custom config doesn't define this feature, fall through to standard plan check
    } catch (error) {
      console.warn('Failed to parse custom plan config, falling back to standard plan', error);
      // Fall through to standard plan check
    }
  }

  // Fall back to standard plan features
  const plan = PLANS[org.planId || 'starter'];
  const hasFeature = plan?.features[feature] ?? false;

  if (!hasFeature) {
    return fallback || null;
  }

  return <>{children}</>;
}

interface RoleGateProps {
  /** Required roles (any of these) */
  roles: ('owner' | 'admin' | 'member')[];
  /** Content to show when user has required role */
  children: ReactNode;
  /** Content to show when user doesn't have required role */
  fallback?: ReactNode;
}

/**
 * Gate content based on member role.
 *
 * @example
 * ```tsx
 * <RoleGate roles={['owner', 'admin']} fallback={<AccessDenied />}>
 *   <AdminSettings />
 * </RoleGate>
 * ```
 */
export function RoleGate({ roles, children, fallback }: RoleGateProps) {
  const { data: activeOrg, isPending: orgPending } = useActiveOrganization();
  const { data: activeMember, isPending: memberPending } = useActiveMember();

  if (orgPending || memberPending) {
    return null;
  }

  if (!activeOrg || !activeMember) {
    return fallback || null;
  }

  // Check if member has one of the required roles
  const memberRole = activeMember.role as 'owner' | 'admin' | 'member';

  if (!roles.includes(memberRole)) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Default upgrade prompt component.
 */
export function UpgradePrompt({ feature, className }: { feature: string; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-primary-200 bg-primary-50 p-4 text-center ${className}`}
    >
      <p className="mb-2 text-sm font-medium text-primary-800">Upgrade to access {feature}</p>
      <a
        href="/settings/billing"
        className="text-sm font-medium text-primary-600 hover:text-primary-500"
      >
        View Plans →
      </a>
    </div>
  );
}

/**
 * Default access denied component.
 */
export function AccessDenied({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 text-center ${className}`}>
      <p className="text-sm font-medium text-red-800">
        {message || 'You do not have permission to view this content.'}
      </p>
    </div>
  );
}

/**
 * @project/metrics - Analytics Package
 *
 * Typed helpers for PostHog analytics.
 *
 * ## Usage
 *
 * ```typescript
 * import { initMetrics, metrics } from '@project/metrics';
 *
 * // Initialize once at app startup
 * initMetrics({
 *   posthogApiKey: process.env.POSTHOG_API_KEY!,
 *   appId: 'my-app',
 * });
 *
 * // Track events
 * metrics.track('subscription_created', { userId: user.id, plan: 'pro' });
 * ```
 */

import { PostHog } from 'posthog-node';

let posthog: PostHog | null = null;
let appId: string = '';
let enabled: boolean = false;

export interface MetricsConfig {
  posthogApiKey: string;
  posthogHost?: string;
  appId: string;
}

/**
 * Initialize the metrics module.
 * Must be called once at app startup.
 */
export function initMetrics(config: MetricsConfig): void {
  if (!config.posthogApiKey) {
    console.warn('PostHog API key not provided. Metrics will be disabled.');
    enabled = false;
    return;
  }

  posthog = new PostHog(config.posthogApiKey, {
    host: config.posthogHost || 'https://app.posthog.com',
    flushAt: 20,
    flushInterval: 10000,
  });
  appId = config.appId;
  enabled = true;
}

/**
 * Check if metrics are enabled.
 */
export function isEnabled(): boolean {
  return enabled;
}

/**
 * Metrics helpers for analytics tracking.
 */
export const metrics = {
  /**
   * Track a custom event.
   */
  track(
    event: string,
    properties?: Record<string, unknown> & {
      userId?: string;
      orgId?: string;
    }
  ): void {
    if (!enabled || !posthog) return;

    const distinctId = properties?.userId || properties?.orgId || 'anonymous';

    posthog.capture({
      distinctId,
      event,
      properties: {
        app_id: appId,
        ...properties,
      },
    });
  },

  /**
   * Identify a user with their properties.
   */
  identify(
    userId: string,
    properties?: Record<string, unknown> & {
      email?: string;
      name?: string;
      orgId?: string;
      plan?: string;
    }
  ): void {
    if (!enabled || !posthog) return;

    posthog.identify({
      distinctId: userId,
      properties: {
        app_id: appId,
        ...properties,
      },
    });
  },

  /**
   * Associate a user with a group (organization).
   */
  group(userId: string, orgId: string, properties?: Record<string, unknown>): void {
    if (!enabled || !posthog) return;

    posthog.groupIdentify({
      groupType: 'organization',
      groupKey: orgId,
      properties: {
        app_id: appId,
        ...properties,
      },
    });

    // Also capture a group association
    posthog.capture({
      distinctId: userId,
      event: '$groupidentify',
      properties: {
        $group_type: 'organization',
        $group_key: orgId,
        app_id: appId,
      },
    });
  },

  /**
   * Track a page view.
   */
  pageView(userId: string, path: string, properties?: Record<string, unknown>): void {
    if (!enabled || !posthog) return;

    posthog.capture({
      distinctId: userId,
      event: '$pageview',
      properties: {
        $current_url: path,
        app_id: appId,
        ...properties,
      },
    });
  },

  /**
   * Flush pending events (call before app shutdown).
   */
  async flush(): Promise<void> {
    if (!enabled || !posthog) return;
    await posthog.flush();
  },

  /**
   * Shutdown the PostHog client.
   */
  async shutdown(): Promise<void> {
    if (!enabled || !posthog) return;
    await posthog.shutdown();
    posthog = null;
    enabled = false;
  },
};

// ==========================================
// Pre-defined Event Types
// ==========================================

/**
 * Common event names for consistency.
 */
export const Events = {
  // Auth events
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  EMAIL_VERIFIED: 'email_verified',

  // Organization events
  ORGANIZATION_CREATED: 'organization_created',
  ORGANIZATION_UPDATED: 'organization_updated',
  ORGANIZATION_DELETED: 'organization_deleted',
  MEMBER_INVITED: 'member_invited',
  MEMBER_JOINED: 'member_joined',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',

  // Billing events
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDED: 'trial_ended',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  PLAN_UPGRADED: 'plan_upgraded',
  PLAN_DOWNGRADED: 'plan_downgraded',

  // Referral events
  REFERRAL_LINK_SHARED: 'referral_link_shared',
  REFERRAL_SIGNUP: 'referral_signup',
  REFERRAL_CREDITED: 'referral_credited',

  // Feature usage events
  FEATURE_USED: 'feature_used',
  FEATURE_LIMIT_REACHED: 'feature_limit_reached',
  FEATURE_UPGRADE_PROMPTED: 'feature_upgrade_prompted',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// ==========================================
// Typed Event Tracking Helpers
// ==========================================

/**
 * Track auth-related events.
 */
export const authEvents = {
  signedUp(userId: string, method: 'email' | 'google'): void {
    metrics.track(Events.USER_SIGNED_UP, { userId, method });
  },

  signedIn(userId: string, method: 'email' | 'google'): void {
    metrics.track(Events.USER_SIGNED_IN, { userId, method });
  },

  signedOut(userId: string): void {
    metrics.track(Events.USER_SIGNED_OUT, { userId });
  },

  emailVerified(userId: string): void {
    metrics.track(Events.EMAIL_VERIFIED, { userId });
  },
};

/**
 * Track organization-related events.
 */
export const orgEvents = {
  created(userId: string, orgId: string, orgName: string): void {
    metrics.track(Events.ORGANIZATION_CREATED, { userId, orgId, orgName });
  },

  memberInvited(orgId: string, inviterUserId: string, inviteeEmail: string, role: string): void {
    metrics.track(Events.MEMBER_INVITED, { orgId, userId: inviterUserId, inviteeEmail, role });
  },

  memberJoined(orgId: string, userId: string, role: string): void {
    metrics.track(Events.MEMBER_JOINED, { orgId, userId, role });
  },

  memberRemoved(orgId: string, removedUserId: string, removedByUserId: string): void {
    metrics.track(Events.MEMBER_REMOVED, { orgId, removedUserId, userId: removedByUserId });
  },

  roleChanged(orgId: string, userId: string, oldRole: string, newRole: string): void {
    metrics.track(Events.MEMBER_ROLE_CHANGED, { orgId, userId, oldRole, newRole });
  },
};

/**
 * Track billing-related events.
 */
export const billingEvents = {
  trialStarted(orgId: string, plan: string, durationDays: number): void {
    metrics.track(Events.TRIAL_STARTED, { orgId, plan, durationDays });
  },

  subscriptionCreated(orgId: string, plan: string, amount: number): void {
    metrics.track(Events.SUBSCRIPTION_CREATED, { orgId, plan, amount });
  },

  subscriptionCancelled(orgId: string, plan: string, reason?: string): void {
    metrics.track(Events.SUBSCRIPTION_CANCELLED, { orgId, plan, reason });
  },

  paymentSucceeded(orgId: string, amount: number): void {
    metrics.track(Events.PAYMENT_SUCCEEDED, { orgId, amount });
  },

  paymentFailed(orgId: string, amount: number, reason?: string): void {
    metrics.track(Events.PAYMENT_FAILED, { orgId, amount, reason });
  },

  planChanged(orgId: string, oldPlan: string, newPlan: string): void {
    const isUpgrade = newPlan === 'pro' && oldPlan === 'starter';
    metrics.track(isUpgrade ? Events.PLAN_UPGRADED : Events.PLAN_DOWNGRADED, {
      orgId,
      oldPlan,
      newPlan,
    });
  },
};

/**
 * Track feature usage events.
 */
export const featureEvents = {
  used(orgId: string, userId: string, feature: string): void {
    metrics.track(Events.FEATURE_USED, { orgId, userId, feature });
  },

  limitReached(orgId: string, feature: string, limit: number): void {
    metrics.track(Events.FEATURE_LIMIT_REACHED, { orgId, feature, limit });
  },

  upgradePrompted(orgId: string, userId: string, feature: string): void {
    metrics.track(Events.FEATURE_UPGRADE_PROMPTED, { orgId, userId, feature });
  },
};

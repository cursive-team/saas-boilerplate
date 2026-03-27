/**
 * Billing Service
 *
 * Handles subscription management, payment processing, and usage tracking.
 * Supports:
 * - Monthly and annual billing intervals (with configurable discount)
 * - Trial with card required upfront (auto-converts to paid)
 * - Custom plans for specific organizations
 * - Usage-based billing (API calls, storage)
 */

import { prisma } from '@project/db';
import { billing, type Stripe } from '@project/billing';
import { notifications } from '@project/notifications';
import { billingEvents } from '@project/metrics';
import { PLANS, TRIAL_CONFIG, REFERRAL_CONFIG, getStripePriceId } from '@project/auth';
import { logger } from '@project/logger';
import { isDowngrade } from '../lib/plan-limits.js';

export type BillingInterval = 'monthly' | 'annual';

export interface CreateSubscriptionOptions {
  planId?: string;
  interval?: BillingInterval;
  skipTrial?: boolean;
  customPriceId?: string; // For custom/enterprise deals
}

export interface CreateSubscriptionResult {
  subscription: Stripe.Subscription;
  clientSecret: string | null;
}

export interface LimitViolation {
  limitKey: string;
  currentCount: number;
  newLimit: number;
}

export interface DowngradeCheckResult {
  allowed: boolean;
  violations: LimitViolation[];
}

/**
 * Create a Stripe customer for an organization.
 */
export async function createCustomer(
  orgId: string,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  const customer = await billing.customers.create({
    email,
    name,
    orgId,
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeCustomerId: customer.id,
      billingEmail: email,
    },
  });

  logger.info({ orgId, customerId: customer.id }, 'Stripe customer created');
  return customer;
}

/**
 * Create a subscription with trial for an organization.
 *
 * Card is required upfront when TRIAL_CONFIG.requireCard is true.
 * The trial automatically converts to paid when it ends.
 */
export async function createSubscription(
  orgId: string,
  customerId: string,
  options: CreateSubscriptionOptions = {}
): Promise<CreateSubscriptionResult> {
  const { planId = 'starter', interval = 'monthly', skipTrial = false, customPriceId } = options;

  // Get the appropriate price ID
  let priceId: string | null;

  if (customPriceId) {
    // Custom enterprise deal
    priceId = customPriceId;
  } else {
    // Standard plan pricing
    priceId = getStripePriceId(planId, interval);
  }

  if (!priceId) {
    throw new Error(`No price ID found for plan ${planId} (${interval})`);
  }

  const trialDays = skipTrial ? 0 : TRIAL_CONFIG.durationDays;

  // Create subscription with trial
  // When trial ends, Stripe automatically charges the payment method
  const subscription = await billing.subscriptions.create({
    customerId,
    priceId,
    trialDays,
    metadata: { orgId, planId, interval },
  });

  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeSubscriptionId: subscription.id,
      planId,
      billingInterval: interval,
      trialEndsAt,
      customStripePriceId: customPriceId || null,
    },
  });

  // Track event
  if (trialDays > 0) {
    billingEvents.trialStarted(orgId, planId, trialDays);
  } else {
    billingEvents.subscriptionCreated(
      orgId,
      planId,
      subscription.items.data[0]?.price?.unit_amount || 0
    );
  }

  logger.info(
    { orgId, subscriptionId: subscription.id, planId, interval, trialEndsAt },
    'Subscription created'
  );

  // Get client secret for payment setup (needed for card collection)
  const pendingSetupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | null;

  const clientSecret = pendingSetupIntent?.client_secret ?? paymentIntent?.client_secret ?? null;

  return { subscription, clientSecret };
}

/**
 * Get the effective limits for an organization.
 * Checks for custom plan config, otherwise uses standard plan limits.
 */
export function getOrgLimits(
  planId: string,
  customPlanConfig: string | null
): Record<string, number> {
  // Check for custom config first
  if (customPlanConfig) {
    try {
      const config = JSON.parse(customPlanConfig);
      if (config.limits) {
        return config.limits;
      }
    } catch {
      logger.warn({ customPlanConfig }, 'Failed to parse custom plan config');
    }
  }

  // Fall back to standard plan limits
  const plan = PLANS[planId as keyof typeof PLANS];
  return (plan?.limits as Record<string, number>) || {};
}

/**
 * Check if an organization's current usage would violate limits on a new plan.
 * Used for downgrade prevention.
 */
export async function checkPlanLimits(
  orgId: string,
  newPlanId: string
): Promise<DowngradeCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const violations: LimitViolation[] = [];
  const newLimits = getOrgLimits(newPlanId, null);

  // Check all metric-based limits defined in the plan
  // This dynamically checks any limit defined in cursive.json (e.g., exampleResource, jobs, recordings)
  for (const [limitKey, limitValue] of Object.entries(newLimits)) {
    // Skip unlimited limits (-1) and undefined
    if (limitValue === undefined || limitValue === -1) continue;

    // Get current usage for this metric
    const currentUsage = await getCurrentUsage(orgId, limitKey);

    if (currentUsage > limitValue) {
      violations.push({
        limitKey,
        currentCount: currentUsage,
        newLimit: limitValue,
      });
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

/**
 * Change subscription plan.
 * Includes downgrade prevention: blocks plan changes that would exceed resource limits.
 */
export async function changePlan(
  orgId: string,
  newPlanId: string,
  newInterval?: BillingInterval
): Promise<Stripe.Subscription> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org?.stripeSubscriptionId) {
    throw new Error('No active subscription');
  }

  const newPlan = PLANS[newPlanId as keyof typeof PLANS];
  if (!newPlan) {
    throw new Error(`Invalid plan: ${newPlanId}`);
  }

  const oldPlanId = org.planId;
  const interval = newInterval || (org.billingInterval as BillingInterval) || 'monthly';

  // Check if this is a downgrade and validate limits
  if (isDowngrade(oldPlanId, newPlanId)) {
    const limitCheck = await checkPlanLimits(orgId, newPlanId);
    if (!limitCheck.allowed) {
      const violationMessages = limitCheck.violations.map(
        (v) => `${v.limitKey}: using ${v.currentCount}, limit is ${v.newLimit}`
      );
      logger.warn(
        { orgId, oldPlanId, newPlanId, violations: limitCheck.violations },
        'Plan downgrade blocked due to limit violations'
      );
      throw new Error(
        `Cannot downgrade: current usage exceeds new plan limits. ${violationMessages.join('; ')}`
      );
    }
  }

  // Get the new price ID
  const newPriceId = getStripePriceId(newPlanId, interval);
  if (!newPriceId) {
    throw new Error(`No price ID found for plan ${newPlanId} (${interval})`);
  }

  const subscription = await billing.subscriptions.changePlan(org.stripeSubscriptionId, newPriceId);

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planId: newPlanId,
      billingInterval: interval,
      customStripePriceId: null, // Clear custom pricing when changing to standard plan
    },
  });

  // Track event
  billingEvents.planChanged(orgId, oldPlanId, newPlanId);

  logger.info({ orgId, oldPlanId, newPlanId, interval }, 'Plan changed');
  return subscription;
}

/**
 * Change billing interval (monthly <-> annual).
 */
export async function changeBillingInterval(
  orgId: string,
  newInterval: BillingInterval
): Promise<Stripe.Subscription> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org?.stripeSubscriptionId) {
    throw new Error('No active subscription');
  }

  if (org.customStripePriceId) {
    throw new Error('Cannot change interval for custom-priced plans');
  }

  const newPriceId = getStripePriceId(org.planId, newInterval);
  if (!newPriceId) {
    throw new Error(`No price ID found for plan ${org.planId} (${newInterval})`);
  }

  const subscription = await billing.subscriptions.changePlan(org.stripeSubscriptionId, newPriceId);

  await prisma.organization.update({
    where: { id: orgId },
    data: { billingInterval: newInterval },
  });

  logger.info(
    { orgId, planId: org.planId, oldInterval: org.billingInterval, newInterval },
    'Billing interval changed'
  );
  return subscription;
}

/**
 * Set custom pricing for an organization (enterprise/sales-led deals).
 */
export async function setCustomPricing(
  orgId: string,
  customPriceId: string,
  customConfig?: { limits?: Record<string, number>; features?: Record<string, boolean> }
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  // If there's an active subscription, update it to the custom price
  if (org.stripeSubscriptionId) {
    await billing.subscriptions.changePlan(org.stripeSubscriptionId, customPriceId);
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      customStripePriceId: customPriceId,
      customPlanConfig: customConfig ? JSON.stringify(customConfig) : null,
    },
  });

  logger.info({ orgId, customPriceId, customConfig }, 'Custom pricing set');
}

/**
 * Cancel subscription.
 */
export async function cancelSubscription(
  orgId: string,
  cancelImmediately = false
): Promise<Stripe.Subscription> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org?.stripeSubscriptionId) {
    throw new Error('No active subscription');
  }

  const subscription = cancelImmediately
    ? await billing.subscriptions.cancelImmediately(org.stripeSubscriptionId)
    : await billing.subscriptions.cancel(org.stripeSubscriptionId);

  // Track event
  billingEvents.subscriptionCancelled(orgId, org.planId);

  logger.info(
    { orgId, subscriptionId: org.stripeSubscriptionId, cancelImmediately },
    'Subscription cancelled'
  );

  return subscription;
}

/**
 * Resume cancelled subscription.
 */
export async function resumeSubscription(orgId: string): Promise<Stripe.Subscription> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org?.stripeSubscriptionId) {
    throw new Error('No active subscription');
  }

  const subscription = await billing.subscriptions.resume(org.stripeSubscriptionId);

  logger.info({ orgId }, 'Subscription resumed');
  return subscription;
}

/**
 * Create a billing portal session.
 */
export async function createPortalSession(
  orgId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org?.stripeCustomerId) {
    throw new Error('No Stripe customer');
  }

  return billing.portal.createSession(org.stripeCustomerId, returnUrl);
}

/**
 * Get current usage for an organization.
 */
export async function getCurrentUsage(orgId: string, metric: string): Promise<number> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const record = await prisma.usageRecord.findFirst({
    where: {
      organizationId: orgId,
      metric,
      periodStart,
    },
  });

  return record ? Number(record.value) : 0;
}

/**
 * Track usage for an organization.
 */
export async function trackUsage(orgId: string, metric: string, amount: number = 1): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await prisma.usageRecord.upsert({
    where: {
      organizationId_metric_periodStart: {
        organizationId: orgId,
        metric,
        periodStart,
      },
    },
    create: {
      organizationId: orgId,
      metric,
      value: amount,
      periodStart,
      periodEnd,
    },
    update: {
      value: { increment: amount },
    },
  });
}

/**
 * Check if organization is within usage limit.
 */
export async function checkUsageLimit(
  orgId: string,
  metric: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const limits = getOrgLimits(org.planId, org.customPlanConfig);
  const limit = limits[metric];

  // -1 means unlimited
  if (limit === undefined || limit === -1) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const current = await getCurrentUsage(orgId, metric);

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

// ==========================================
// Webhook Handlers
// ==========================================

/**
 * Handle successful invoice payment.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) return;

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (!org) {
    logger.warn({ customerId: invoice.customer }, 'Invoice paid but org not found');
    return;
  }

  // Track event
  billingEvents.paymentSucceeded(org.id, invoice.amount_paid);

  logger.info(
    { orgId: org.id, invoiceId: invoice.id, amount: invoice.amount_paid },
    'Invoice paid'
  );

  // Handle referral credit if this is the first payment
  if (org.referredBy) {
    await handleReferralCredit(org.id, org.referredBy);
  }
}

/**
 * Handle failed invoice payment.
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
    include: {
      members: {
        where: { role: { in: ['owner', 'admin'] } },
        include: { user: true },
      },
    },
  });

  if (!org) {
    logger.warn({ customerId: invoice.customer }, 'Invoice payment failed but org not found');
    return;
  }

  // Track event
  billingEvents.paymentFailed(org.id, invoice.amount_due);

  logger.warn(
    { orgId: org.id, invoiceId: invoice.id, amount: invoice.amount_due },
    'Invoice payment failed'
  );

  // Notify admins
  for (const member of org.members) {
    void notifications.sendPaymentFailed({
      to: member.user.email,
      invoiceUrl: invoice.hosted_invoice_url || '',
    });
  }
}

/**
 * Find the plan ID from a Stripe price ID.
 */
function findPlanIdFromPriceId(
  priceId: string
): { planId: string; interval: BillingInterval } | null {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceIdMonthly === priceId) {
      return { planId, interval: 'monthly' };
    }
    if (plan.stripePriceIdAnnual === priceId) {
      return { planId, interval: 'annual' };
    }
  }
  return null;
}

/**
 * Handle subscription update.
 * Detects plan changes from Stripe (e.g., via customer portal) and validates limits.
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: {
      members: {
        where: { role: { in: ['owner', 'admin'] } },
        include: { user: true },
      },
    },
  });

  if (!org) {
    logger.warn({ subscriptionId: subscription.id }, 'Subscription updated but org not found');
    return;
  }

  // Update trial end date if changed
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  // Detect plan change from Stripe price ID
  const currentPriceId = subscription.items.data[0]?.price.id;
  const planInfo = currentPriceId ? findPlanIdFromPriceId(currentPriceId) : null;

  // If this is a custom price, skip plan detection
  if (org.customStripePriceId === currentPriceId) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { trialEndsAt },
    });
    logger.info(
      { orgId: org.id, subscriptionId: subscription.id, status: subscription.status },
      'Custom subscription updated'
    );
    return;
  }

  // If plan changed externally (via Stripe portal), validate limits
  if (planInfo && (planInfo.planId !== org.planId || planInfo.interval !== org.billingInterval)) {
    const newPlanId = planInfo.planId;
    const newInterval = planInfo.interval;

    if (isDowngrade(org.planId, newPlanId)) {
      const limitCheck = await checkPlanLimits(org.id, newPlanId);

      if (!limitCheck.allowed) {
        // Revert the subscription to the old plan
        const oldPriceId =
          org.customStripePriceId ||
          getStripePriceId(org.planId, org.billingInterval as BillingInterval);
        if (oldPriceId) {
          logger.warn(
            {
              orgId: org.id,
              attemptedPlan: newPlanId,
              currentPlan: org.planId,
              violations: limitCheck.violations,
            },
            'Reverting subscription due to limit violations'
          );

          try {
            await billing.subscriptions.changePlan(subscription.id, oldPriceId);

            // Notify admins about blocked downgrade
            const violationMessages = limitCheck.violations.map(
              (v) => `${v.limitKey}: using ${v.currentCount}, limit is ${v.newLimit}`
            );

            for (const member of org.members) {
              void notifications.sendCustomEmail({
                to: member.user.email,
                subject: 'Plan Downgrade Blocked',
                html: `
                  <p>Your attempt to downgrade to the ${newPlanId} plan was blocked because your current usage exceeds the new plan's limits:</p>
                  <ul>
                    ${violationMessages.map((msg) => `<li>${msg}</li>`).join('')}
                  </ul>
                  <p>Please reduce your usage or choose a plan that accommodates your current resources.</p>
                `,
              });
            }
          } catch (revertError) {
            logger.error(
              {
                orgId: org.id,
                error: revertError instanceof Error ? revertError.message : revertError,
              },
              'Failed to revert subscription after limit violation'
            );
          }
        }
        return;
      }
    }

    // Plan change allowed, update the database
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        planId: newPlanId,
        billingInterval: newInterval,
        trialEndsAt,
        customStripePriceId: null, // Clear custom pricing
      },
    });

    billingEvents.planChanged(org.id, org.planId, newPlanId);
    logger.info(
      { orgId: org.id, oldPlanId: org.planId, newPlanId, interval: newInterval },
      'Plan changed via Stripe'
    );
  } else {
    // No plan change, just update trial end date
    await prisma.organization.update({
      where: { id: org.id },
      data: { trialEndsAt },
    });
  }

  logger.info(
    { orgId: org.id, subscriptionId: subscription.id, status: subscription.status, trialEndsAt },
    'Subscription updated'
  );
}

/**
 * Handle subscription deletion.
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!org) {
    logger.warn({ subscriptionId: subscription.id }, 'Subscription deleted but org not found');
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: null,
      planId: 'starter', // Reset to default plan
      customStripePriceId: null,
      customPlanConfig: null,
    },
  });

  logger.info({ orgId: org.id, subscriptionId: subscription.id }, 'Subscription deleted');
}

/**
 * Handle checkout session completion.
 * Called when a customer completes the Stripe checkout flow.
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = session.metadata?.orgId;
  const planId = session.metadata?.planId;
  const interval = session.metadata?.interval as BillingInterval | undefined;

  if (!orgId) {
    logger.warn({ sessionId: session.id }, 'Checkout completed but no orgId in metadata');
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    logger.warn({ orgId, sessionId: session.id }, 'Checkout completed but org not found');
    return;
  }

  // Update customer ID if not set
  if (!org.stripeCustomerId && session.customer) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: session.customer as string },
    });
  }

  // Update subscription ID if a subscription was created
  if (session.subscription && !org.stripeSubscriptionId) {
    const subscription = await billing.subscriptions.get(session.subscription as string);
    const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: session.subscription as string,
        planId: planId || org.planId,
        billingInterval: interval || 'monthly',
        trialEndsAt,
      },
    });
  }

  logger.info(
    {
      orgId,
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
    },
    'Checkout completed'
  );
}

/**
 * Handle referral credit when referred org makes first payment.
 */
async function handleReferralCredit(referredOrgId: string, referrerOrgId: string): Promise<void> {
  // Check if already credited
  const existingCredit = await prisma.referralCredit.findFirst({
    where: { referredOrgId },
  });

  if (existingCredit) return;

  // Award credit
  const creditAmount = REFERRAL_CONFIG.creditAmount;

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: referrerOrgId },
      data: { referralCredits: { increment: creditAmount } },
    }),
    prisma.referralCredit.create({
      data: {
        referrerOrgId,
        referredOrgId,
        amount: creditAmount,
      },
    }),
  ]);

  // Notify referrer
  const referrer = await prisma.organization.findUnique({
    where: { id: referrerOrgId },
    include: {
      members: {
        where: { role: 'owner' },
        include: { user: true },
      },
    },
  });

  const referred = await prisma.organization.findUnique({
    where: { id: referredOrgId },
  });

  if (referrer?.members[0] && referred) {
    void notifications.sendReferralCredit({
      to: referrer.members[0].user.email,
      creditAmount: creditAmount / 100,
      referredOrgName: referred.name,
    });
  }

  logger.info({ referrerOrgId, referredOrgId, creditAmount }, 'Referral credit awarded');
}

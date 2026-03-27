/**
 * Billing Routes
 *
 * Handles subscription management and payment processing.
 * Supports monthly and annual billing with configurable discount.
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  requireAuth,
  requireOrgContext,
  requireRole,
  type OrgAuthenticatedRequest,
} from '../middleware/auth.js';
import * as billingService from '../services/billing.service.js';
import { logger } from '@project/logger';
import { PLANS, BILLING_CONFIG, getPublicPlans, getPlanPrice } from '@project/auth';

const router: ExpressRouter = Router();

/**
 * GET /api/billing/plans
 * Get available plans with pricing info.
 */
router.get('/plans', (_req, res) => {
  const publicPlans = getPublicPlans();
  const plansWithPricing = publicPlans.map((plan) => ({
    ...plan,
    pricing: {
      monthly: plan.monthlyPrice,
      annual: plan.monthlyPrice ? getPlanPrice(plan.id, 'annual') : null,
      annualPerMonth: plan.monthlyPrice
        ? Math.round((getPlanPrice(plan.id, 'annual') || 0) / 12)
        : null,
    },
  }));

  res.json({
    success: true,
    data: {
      plans: plansWithPricing,
      billing: {
        annualDiscountPercent: BILLING_CONFIG.annualDiscountPercent,
      },
    },
  });
});

/**
 * GET /api/billing/subscription
 * Get current subscription status.
 */
router.get(
  '/subscription',
  requireAuth,
  requireOrgContext,
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const org = req.organization!;
      const plan = PLANS[org.planId as keyof typeof PLANS];

      // Need to get billingInterval from database since it's not in the extended type
      const { prisma } = await import('@project/db');
      const fullOrg = await prisma.organization.findUnique({
        where: { id: org.id },
        select: {
          billingInterval: true,
          customStripePriceId: true,
          customPlanConfig: true,
        },
      });

      res.json({
        success: true,
        data: {
          planId: org.planId,
          planName: plan?.name || 'Custom',
          billingInterval: fullOrg?.billingInterval || 'monthly',
          stripeSubscriptionId: org.stripeSubscriptionId,
          trialEndsAt: org.trialEndsAt,
          isTrialing: org.trialEndsAt && new Date(org.trialEndsAt) > new Date(),
          isCustomPricing: !!fullOrg?.customStripePriceId,
          referralCode: org.referralCode,
          referralCredits: org.referralCredits,
        },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to get subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/setup
 * Setup billing for a new organization.
 * Creates Stripe customer and subscription with trial.
 */
router.post(
  '/setup',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { planId = 'starter', interval = 'monthly' } = req.body;
      const org = req.organization!;
      const user = req.user!;

      // Validate interval
      if (interval !== 'monthly' && interval !== 'annual') {
        return res.status(400).json({
          success: false,
          error: 'Invalid billing interval. Must be "monthly" or "annual".',
          requestId: req.requestId,
        });
      }

      // Validate plan
      if (planId && !PLANS[planId as keyof typeof PLANS]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan ID',
          requestId: req.requestId,
        });
      }

      // Check if already set up
      if (org.stripeCustomerId) {
        return res.status(400).json({
          success: false,
          error: 'Billing already set up',
          requestId: req.requestId,
        });
      }

      // Create customer
      const customer = await billingService.createCustomer(
        org.id,
        org.billingEmail || user.email,
        org.name
      );

      // Create subscription with trial
      const { subscription, clientSecret } = await billingService.createSubscription(
        org.id,
        customer.id,
        { planId, interval }
      );

      res.json({
        success: true,
        data: {
          customerId: customer.id,
          subscriptionId: subscription.id,
          clientSecret, // For Stripe Elements payment setup
        },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to setup billing');
      res.status(500).json({
        success: false,
        error: 'Failed to setup billing',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/change-plan
 * Change subscription plan.
 */
router.post(
  '/change-plan',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { planId, interval } = req.body;
      const org = req.organization!;

      if (!planId || !PLANS[planId as keyof typeof PLANS]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan ID',
          requestId: req.requestId,
        });
      }

      // Validate interval if provided
      if (interval && interval !== 'monthly' && interval !== 'annual') {
        return res.status(400).json({
          success: false,
          error: 'Invalid billing interval',
          requestId: req.requestId,
        });
      }

      const subscription = await billingService.changePlan(org.id, planId, interval);

      res.json({
        success: true,
        data: { subscriptionId: subscription.id, planId, interval },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change plan';
      logger.error({ error, requestId: req.requestId }, 'Failed to change plan');

      // Check if this is a limit violation error
      if (errorMessage.includes('Cannot downgrade')) {
        return res.status(400).json({
          success: false,
          error: errorMessage,
          upgradeRequired: false,
          requestId: req.requestId,
        });
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/change-interval
 * Change billing interval (monthly <-> annual).
 */
router.post(
  '/change-interval',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { interval } = req.body;
      const org = req.organization!;

      if (interval !== 'monthly' && interval !== 'annual') {
        return res.status(400).json({
          success: false,
          error: 'Invalid billing interval. Must be "monthly" or "annual".',
          requestId: req.requestId,
        });
      }

      const subscription = await billingService.changeBillingInterval(org.id, interval);

      res.json({
        success: true,
        data: { subscriptionId: subscription.id, interval },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to change billing interval');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change billing interval',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/cancel
 * Cancel subscription.
 */
router.post(
  '/cancel',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { immediately = false } = req.body;
      const org = req.organization!;

      const subscription = await billingService.cancelSubscription(org.id, immediately);

      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to cancel subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/resume
 * Resume cancelled subscription.
 */
router.post(
  '/resume',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const org = req.organization!;

      const subscription = await billingService.resumeSubscription(org.id);

      res.json({
        success: true,
        data: { subscriptionId: subscription.id },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to resume subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to resume subscription',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * POST /api/billing/portal
 * Create a billing portal session.
 */
router.post(
  '/portal',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { returnUrl } = req.body;
      const org = req.organization!;

      if (!returnUrl) {
        return res.status(400).json({
          success: false,
          error: 'Return URL required',
          requestId: req.requestId,
        });
      }

      const session = await billingService.createPortalSession(org.id, returnUrl);

      res.json({
        success: true,
        data: { url: session.url },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to create portal session');
      res.status(500).json({
        success: false,
        error: 'Failed to create portal session',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * GET /api/billing/usage
 * Get current usage for the organization.
 * Returns usage for all metrics defined in the plan's limits (from cursive.json).
 */
router.get('/usage', requireAuth, requireOrgContext, async (req: OrgAuthenticatedRequest, res) => {
  try {
    const org = req.organization!;

    // Get the plan to determine which metrics to report
    const plan = PLANS[org.planId as keyof typeof PLANS];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan',
        requestId: req.requestId,
      });
    }

    // Get all metrics from the plan's limits configuration (from cursive.json)
    const planLimits = plan.limits as Record<string, number>;
    const metrics = Object.keys(planLimits);

    const usage: Record<string, { current: number; limit: number; percentage: number }> = {};

    for (const metric of metrics) {
      const result = await billingService.checkUsageLimit(org.id, metric);
      const limit = result.limit === Infinity ? -1 : result.limit;
      const percentage = limit === -1 ? 0 : Math.round((result.current / result.limit) * 100);

      usage[metric] = {
        current: result.current,
        limit, // -1 for unlimited
        percentage,
      };
    }

    res.json({
      success: true,
      data: { usage },
    });
  } catch (error) {
    logger.error({ error, requestId: req.requestId }, 'Failed to get usage');
    res.status(500).json({
      success: false,
      error: 'Failed to get usage',
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/billing/apply-referral
 * Apply a referral code to the organization.
 * This should be called after org creation if a referral code was present.
 */
router.post(
  '/apply-referral',
  requireAuth,
  requireOrgContext,
  requireRole('owner', 'admin'),
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const { referralCode } = req.body;
      const org = req.organization!;

      if (!referralCode) {
        return res.status(400).json({
          success: false,
          error: 'Referral code is required',
          requestId: req.requestId,
        });
      }

      // Check if org already has a referrer
      if (org.referredBy) {
        return res.status(400).json({
          success: false,
          error: 'Organization already has a referrer',
          requestId: req.requestId,
        });
      }

      // Find the referring organization by referral code
      const { prisma } = await import('@project/db');
      const referrerOrg = await prisma.organization.findFirst({
        where: { referralCode },
      });

      if (!referrerOrg) {
        return res.status(404).json({
          success: false,
          error: 'Invalid referral code',
          requestId: req.requestId,
        });
      }

      // Cannot refer yourself
      if (referrerOrg.id === org.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot use your own referral code',
          requestId: req.requestId,
        });
      }

      // Apply the referral
      await prisma.organization.update({
        where: { id: org.id },
        data: { referredBy: referrerOrg.id },
      });

      logger.info(
        { orgId: org.id, referrerOrgId: referrerOrg.id, requestId: req.requestId },
        'Referral applied'
      );

      res.json({
        success: true,
        data: { referrerOrgId: referrerOrg.id },
        message: 'Referral applied successfully',
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to apply referral');
      res.status(500).json({
        success: false,
        error: 'Failed to apply referral',
        requestId: req.requestId,
      });
    }
  }
);

/**
 * GET /api/billing/referrals
 * Get referral information.
 */
router.get(
  '/referrals',
  requireAuth,
  requireOrgContext,
  async (req: OrgAuthenticatedRequest, res) => {
    try {
      const org = req.organization!;

      // Get referral history
      const { prisma } = await import('@project/db');
      const credits = await prisma.referralCredit.findMany({
        where: { referrerOrgId: org.id },
        orderBy: { createdAt: 'desc' },
      });

      // Get referred org names
      const referredOrgIds = credits.map((c) => c.referredOrgId);
      const referredOrgs = await prisma.organization.findMany({
        where: { id: { in: referredOrgIds } },
        select: { id: true, name: true },
      });

      const referralHistory = credits.map((credit) => ({
        id: credit.id,
        referredOrgName: referredOrgs.find((o) => o.id === credit.referredOrgId)?.name || 'Unknown',
        amount: credit.amount,
        createdAt: credit.createdAt,
      }));

      res.json({
        success: true,
        data: {
          referralCode: org.referralCode,
          referralLink: `${process.env.FRONTEND_URL}/signup?ref=${org.referralCode}`,
          credits: org.referralCredits,
          creditsFormatted: `$${(org.referralCredits / 100).toFixed(2)}`,
          history: referralHistory,
        },
      });
    } catch (error) {
      logger.error({ error, requestId: req.requestId }, 'Failed to get referrals');
      res.status(500).json({
        success: false,
        error: 'Failed to get referrals',
        requestId: req.requestId,
      });
    }
  }
);

export default router;

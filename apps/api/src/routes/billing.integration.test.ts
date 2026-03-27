import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { prisma } from '@project/db';
import billingRouter from './billing.js';
import { errorHandler } from '../middleware/error-handler.js';

// Test IDs - unique per test file to avoid conflicts
const TEST_USER_ID = 'billing-test-user-id';
const TEST_ORG_ID = 'billing-test-org-id';
const REFERRED_ORG_ID = 'billing-referred-org-id';

// Mock auth - use literal strings since vi.mock is hoisted
vi.mock('@project/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: {
          id: 'billing-test-user-id',
          email: 'billing-test@example.com',
          name: 'Billing Test User',
          emailVerified: true,
          image: null,
        },
        session: {
          id: 'billing-test-session-id',
          userId: 'billing-test-user-id',
          expiresAt: new Date(Date.now() + 86400000),
          activeOrganizationId: 'billing-test-org-id',
        },
      }),
    },
  },
  toAuthUser: vi.fn().mockImplementation((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    roles: [],
  })),
  PLANS: {
    starter: {
      name: 'Starter',
      description: 'Perfect for getting started',
      isPublic: true,
      monthlyPrice: 29,
      stripePriceIdMonthly: 'price_starter_monthly',
      stripePriceIdAnnual: 'price_starter_annual',
      features: { apiAccess: true, advancedReports: false, prioritySupport: false },
      limits: { exampleResource: 100 },
    },
    pro: {
      name: 'Pro',
      description: 'For growing teams',
      isPublic: true,
      monthlyPrice: 79,
      stripePriceIdMonthly: 'price_pro_monthly',
      stripePriceIdAnnual: 'price_pro_annual',
      features: { apiAccess: true, advancedReports: true, prioritySupport: true },
      limits: { exampleResource: 1000 },
    },
  },
  TRIAL_CONFIG: {
    durationDays: 14,
    requireCard: true,
  },
  BILLING_CONFIG: {
    annualDiscountPercent: 10,
    allowCustomPlans: true,
  },
  REFERRAL_CONFIG: {
    enabled: true,
    creditAmount: 2000,
  },
  getPublicPlans: vi.fn().mockReturnValue([
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for getting started',
      isPublic: true,
      monthlyPrice: 29,
      features: { apiAccess: true, advancedReports: false, prioritySupport: false },
      limits: { exampleResource: 100 },
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams',
      isPublic: true,
      monthlyPrice: 79,
      features: { apiAccess: true, advancedReports: true, prioritySupport: true },
      limits: { exampleResource: 1000 },
    },
  ]),
  getPlanPrice: vi.fn().mockImplementation((planId: string, interval: string) => {
    if (interval === 'annual') {
      const prices: Record<string, number> = { starter: 313, pro: 853 };
      return prices[planId] ?? null;
    }
    const prices: Record<string, number> = { starter: 29, pro: 79 };
    return prices[planId] ?? null;
  }),
  requireRole: vi
    .fn()
    .mockImplementation(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock billing
vi.mock('@project/billing', () => ({
  billing: {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({
        id: 'sub_test123',
        trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        latest_invoice: null,
      }),
      changePlan: vi.fn().mockResolvedValue({ id: 'sub_test123' }),
      cancel: vi.fn().mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      }),
      cancelImmediately: vi.fn().mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: false,
        current_period_end: null,
      }),
      resume: vi.fn().mockResolvedValue({ id: 'sub_test123' }),
    },
    portal: {
      createSession: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session/test' }),
    },
  },
  initBilling: vi.fn(),
}));

// Mock metrics
vi.mock('@project/metrics', () => ({
  billingEvents: {
    trialStarted: vi.fn(),
    planChanged: vi.fn(),
    subscriptionCancelled: vi.fn(),
  },
}));

// Mock notifications
vi.mock('@project/notifications', () => ({
  notifications: {},
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/billing', billingRouter);
app.use(errorHandler);

// Helper to clean up test data
async function cleanupTestData() {
  // Delete in correct order due to foreign key constraints
  await prisma.referralCredit.deleteMany({
    where: {
      OR: [{ referrerOrgId: TEST_ORG_ID }, { referredOrgId: REFERRED_ORG_ID }],
    },
  });
  await prisma.usageRecord.deleteMany({
    where: { organizationId: TEST_ORG_ID },
  });
  await prisma.invitation.deleteMany({
    where: { organizationId: TEST_ORG_ID },
  });
  await prisma.member.deleteMany({
    where: {
      OR: [{ organizationId: TEST_ORG_ID }, { userId: TEST_USER_ID }],
    },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [TEST_ORG_ID, REFERRED_ORG_ID] } },
  });
  await prisma.session.deleteMany({
    where: { userId: TEST_USER_ID },
  });
  await prisma.account.deleteMany({
    where: { userId: TEST_USER_ID },
  });
  await prisma.user.deleteMany({
    where: { id: TEST_USER_ID },
  });
}

// Helper to setup base test data
async function setupBaseTestData() {
  await cleanupTestData();

  // Create test user
  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'billing-test@example.com',
      name: 'Billing Test User',
      emailVerified: true,
    },
  });

  // Create test organization with referral credits for the referral test
  await prisma.organization.create({
    data: {
      id: TEST_ORG_ID,
      name: 'Billing Test Org',
      slug: 'billing-test-org',
      planId: 'starter',
      referralCode: 'BILLTEST123',
      referralCredits: 4000,
    },
  });

  // Create referred organization for referral test
  await prisma.organization.create({
    data: {
      id: REFERRED_ORG_ID,
      name: 'Referred Org',
      slug: 'referred-org',
      planId: 'starter',
      referralCode: 'REF456',
      referralCredits: 0,
    },
  });

  // Create membership
  await prisma.member.create({
    data: {
      userId: TEST_USER_ID,
      organizationId: TEST_ORG_ID,
      role: 'owner',
    },
  });

  // Create referral credit for referral test
  await prisma.referralCredit.create({
    data: {
      referrerOrgId: TEST_ORG_ID,
      referredOrgId: REFERRED_ORG_ID,
      amount: 2000,
    },
  });
}

// Setup and teardown for all tests
beforeAll(async () => {
  await setupBaseTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Billing Routes', () => {
  describe('GET /api/billing/plans', () => {
    it('returns available plans', async () => {
      const response = await request(app).get('/api/billing/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toBeDefined();
      const planIds = response.body.data.plans.map((p: { id: string }) => p.id);
      expect(planIds).toContain('starter');
      expect(planIds).toContain('pro');
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('returns subscription status', async () => {
      // Debug: check that data exists
      const user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
      const org = await prisma.organization.findUnique({ where: { id: TEST_ORG_ID } });
      const member = await prisma.member.findFirst({
        where: { userId: TEST_USER_ID, organizationId: TEST_ORG_ID },
      });
      console.log('Test data check:', { user: !!user, org: !!org, member: !!member });

      const response = await request(app).get('/api/billing/subscription');
      console.log('Response:', response.status, response.body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBe('starter');
      expect(response.body.data.planName).toBe('Starter');
      expect(response.body.data.referralCode).toBe('BILLTEST123');
    });
  });

  describe('GET /api/billing/usage', () => {
    it('returns usage data', async () => {
      const response = await request(app).get('/api/billing/usage');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.exampleResource).toBeDefined();
      expect(response.body.data.usage.exampleResource.current).toBe(0);
      expect(response.body.data.usage.exampleResource.limit).toBe(100);
    });
  });

  describe('GET /api/billing/referrals', () => {
    it('returns referral data', async () => {
      const response = await request(app).get('/api/billing/referrals');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.referralCode).toBe('BILLTEST123');
      expect(response.body.data.credits).toBe(4000);
      expect(response.body.data.creditsFormatted).toBe('$40.00');
      expect(response.body.data.history).toHaveLength(1);
      expect(response.body.data.history[0].referredOrgName).toBe('Referred Org');
      expect(response.body.data.history[0].amount).toBe(2000);
    });
  });
});

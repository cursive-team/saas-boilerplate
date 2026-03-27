import { Router, type Router as ExpressRouter } from 'express';
// Import config at build time - bundled into compiled JS
import cursiveConfig from '../../../../cursive.json' with { type: 'json' };
import { getPublicPlans, getPlanPrice } from '@project/auth';

const router: ExpressRouter = Router();

interface CursiveConfig {
  name: string;
  slug: string;
  version: string;
  trial: {
    durationDays: number;
    requireCard: boolean;
  };
  billing: {
    annualDiscountPercent: number;
    allowCustomPlans: boolean;
  };
  referrals: {
    enabled: boolean;
    creditAmount: number;
  };
  plans: Record<
    string,
    {
      name: string;
      description: string;
      isPublic: boolean;
      monthlyPrice: number | null;
      stripePriceIdMonthly: string | null;
      stripePriceIdAnnual: string | null;
      features: Record<string, boolean>;
      limits: Record<string, number>;
    }
  >;
}

const config = cursiveConfig as CursiveConfig;

/**
 * GET /api/config
 * Returns public app configuration including plan details (without Stripe price IDs)
 */
router.get('/', (_req, res) => {
  const publicPlans = getPublicPlans();
  const plansWithPricing = publicPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    features: plan.features,
    limits: plan.limits,
    pricing: {
      monthly: plan.monthlyPrice,
      annual: plan.monthlyPrice ? getPlanPrice(plan.id, 'annual') : null,
      annualPerMonth: plan.monthlyPrice
        ? Math.round((getPlanPrice(plan.id, 'annual') || 0) / 12)
        : null,
    },
  }));

  res.json({
    appName: config.name || 'App',
    version: config.version,
    trial: config.trial,
    billing: {
      annualDiscountPercent: config.billing?.annualDiscountPercent ?? 0,
    },
    referrals: {
      enabled: config.referrals?.enabled ?? false,
    },
    plans: plansWithPricing,
  });
});

export default router;

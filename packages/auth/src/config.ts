/**
 * Auth Configuration
 *
 * Loads app configuration from cursive.json
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PlanFeatures {
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  [key: string]: boolean;
}

export interface PlanLimits {
  apiCalls: number; // -1 means unlimited
  storage: number; // GB, -1 means unlimited
  [key: string]: number;
}

export interface Plan {
  name: string;
  description: string;
  isPublic: boolean;
  monthlyPrice: number | null; // null for contact sales
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  features: PlanFeatures;
  limits: PlanLimits;
}

export interface TrialConfig {
  durationDays: number;
  requireCard: boolean;
}

export interface BillingConfig {
  annualDiscountPercent: number;
  allowCustomPlans: boolean;
}

export interface ReferralConfig {
  enabled: boolean;
  creditAmount: number;
}

export interface AppConfig {
  name: string;
  slug: string;
  version: string;
  trial: TrialConfig;
  billing: BillingConfig;
  referrals: ReferralConfig;
  plans: Record<string, Plan>;
}

function loadAppConfig(): AppConfig {
  // Try to find cursive.json by walking up from current directory
  const possiblePaths = [
    resolve(process.cwd(), 'cursive.json'),
    resolve(process.cwd(), '..', 'cursive.json'),
    resolve(process.cwd(), '..', '..', 'cursive.json'),
    resolve(__dirname, '..', '..', '..', '..', 'cursive.json'),
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        return config as AppConfig;
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
        }
        throw error;
      }
    }
  }

  throw new Error(
    'cursive.json not found. Create a cursive.json file at the project root with app configuration.'
  );
}

export const APP_CONFIG: AppConfig = loadAppConfig();
export const APP_NAME = APP_CONFIG.name;
export const APP_SLUG = APP_CONFIG.slug;
export const PLANS = APP_CONFIG.plans;
export const TRIAL_CONFIG = APP_CONFIG.trial;
export const BILLING_CONFIG = APP_CONFIG.billing;
export const REFERRAL_CONFIG = APP_CONFIG.referrals;

export type PlanId = keyof typeof PLANS;

/**
 * Get the price for a plan based on billing interval
 */
export function getPlanPrice(planId: string, interval: 'monthly' | 'annual'): number | null {
  const plan = PLANS[planId];
  if (!plan || plan.monthlyPrice === null) return null;

  if (interval === 'annual') {
    const monthlyTotal = plan.monthlyPrice * 12;
    const discount = monthlyTotal * (BILLING_CONFIG.annualDiscountPercent / 100);
    return monthlyTotal - discount;
  }

  return plan.monthlyPrice;
}

/**
 * Get the Stripe price ID for a plan based on billing interval
 */
export function getStripePriceId(planId: string, interval: 'monthly' | 'annual'): string | null {
  const plan = PLANS[planId];
  if (!plan) return null;

  return interval === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
}

/**
 * Get public plans (for pricing page)
 */
export function getPublicPlans(): Array<Plan & { id: string }> {
  return Object.entries(PLANS)
    .filter(([, plan]) => plan.isPublic)
    .map(([id, plan]) => ({ id, ...plan }));
}

/**
 * App Configuration (Client-Safe)
 *
 * Exports configuration from cursive.json that can be used in both
 * server and client code. Uses static JSON import instead of filesystem
 * APIs for client compatibility.
 *
 * Note: Types prefixed with "Config" to avoid conflicts with API response types in types.ts
 */

// Static JSON import works in both server and client contexts
import cursiveConfig from '../../../cursive.json' with { type: 'json' };

export interface ConfigPlanFeatures {
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  [key: string]: boolean;
}

export interface ConfigPlanLimits {
  // Usage limits are flexible - add any metric you need (e.g., exampleResource, jobs, recordings)
  // Use -1 for unlimited
  [key: string]: number;
}

export interface ConfigPlan {
  name: string;
  description: string;
  isPublic: boolean;
  monthlyPrice: number | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  features: ConfigPlanFeatures;
  limits: ConfigPlanLimits;
}

export interface ConfigTrial {
  durationDays: number;
  requireCard: boolean;
}

export interface ConfigBilling {
  annualDiscountPercent: number;
  allowCustomPlans: boolean;
}

export interface ConfigReferrals {
  enabled: boolean;
  creditAmount: number;
}

export interface CursiveConfig {
  name: string;
  slug: string;
  version: string;
  trial: ConfigTrial;
  billing: ConfigBilling;
  referrals: ConfigReferrals;
  plans: Record<string, ConfigPlan>;
}

export const APP_CONFIG = cursiveConfig as CursiveConfig;
export const APP_NAME = APP_CONFIG.name;
export const APP_SLUG = APP_CONFIG.slug;
export const PLANS = APP_CONFIG.plans;
export const TRIAL_CONFIG = APP_CONFIG.trial;
export const BILLING_CONFIG = APP_CONFIG.billing;
export const REFERRAL_CONFIG = APP_CONFIG.referrals;

export type PlanId = keyof typeof PLANS;

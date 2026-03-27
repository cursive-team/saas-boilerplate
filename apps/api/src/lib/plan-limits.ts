import { PLANS, BILLING_CONFIG } from '@project/auth';

/**
 * Plan limits utility functions.
 *
 * These helpers provide easy access to plan-specific limits configured in cursive.json.
 * The limits are used by middleware to enforce usage restrictions.
 */

/**
 * Check if a plan is a trial plan.
 * Trial plans have strictly enforced limits.
 */
export function isTrialPlan(planId: string): boolean {
  // Plans containing 'trial' or 'free' are considered trial plans
  const lowerPlanId = planId.toLowerCase();
  return lowerPlanId.includes('trial') || lowerPlanId === 'free';
}

/**
 * Check if a plan is an enterprise/custom plan.
 */
export function isEnterprisePlan(planId: string): boolean {
  const lowerPlanId = planId.toLowerCase();
  return lowerPlanId.includes('enterprise') || lowerPlanId.includes('custom');
}

/**
 * Get a specific limit for a plan.
 * Returns -1 for unlimited, undefined if the limit doesn't exist.
 */
export function getPlanLimit(planId: string, limitKey: string): number | undefined {
  const plan = PLANS[planId as keyof typeof PLANS];
  if (!plan) return undefined;
  const limits = plan.limits as Record<string, number>;
  return limits[limitKey];
}

/**
 * Check if a limit is unlimited (-1 means unlimited).
 */
export function isUnlimited(limit: number | undefined): boolean {
  return limit === -1 || limit === undefined;
}

/**
 * Get the API calls limit for a plan.
 */
export function getApiCallsLimit(planId: string): number {
  const limit = getPlanLimit(planId, 'apiCalls');
  return isUnlimited(limit) ? Infinity : limit!;
}

/**
 * Get the storage limit for a plan (in GB).
 */
export function getStorageLimit(planId: string): number {
  const limit = getPlanLimit(planId, 'storage');
  return isUnlimited(limit) ? Infinity : limit!;
}

/**
 * Check if a plan has a specific feature enabled.
 */
export function hasPlanFeature(planId: string, featureKey: string): boolean {
  const plan = PLANS[planId as keyof typeof PLANS];
  if (!plan) return false;
  const features = plan.features as Record<string, boolean>;
  return features[featureKey] ?? false;
}

/**
 * Get the plan rank for comparison (used for downgrade detection).
 * Higher numbers = higher tier plans.
 */
export function getPlanRank(planId: string): number {
  // Define plan hierarchy - customize based on your plans
  const planRanks: Record<string, number> = {
    free: 0,
    trial: 0,
    starter: 1,
    pro: 2,
    enterprise: 3,
  };

  const lowerPlanId = planId.toLowerCase();

  // Check for exact match first
  if (planRanks[lowerPlanId] !== undefined) {
    return planRanks[lowerPlanId];
  }

  // Check for partial matches (e.g., "starter_monthly" should match "starter")
  for (const [key, rank] of Object.entries(planRanks)) {
    if (lowerPlanId.includes(key)) {
      return rank;
    }
  }

  // Default to lowest rank for unknown plans
  return 0;
}

/**
 * Check if changing from one plan to another is a downgrade.
 */
export function isDowngrade(currentPlanId: string, newPlanId: string): boolean {
  return getPlanRank(newPlanId) < getPlanRank(currentPlanId);
}

/**
 * Get the annual discount percentage from config.
 */
export function getAnnualDiscountPercent(): number {
  return BILLING_CONFIG.annualDiscountPercent;
}

/**
 * Calculate the annual price with discount applied.
 */
export function calculateAnnualPrice(monthlyPrice: number): number {
  const yearlyTotal = monthlyPrice * 12;
  const discountAmount = yearlyTotal * (BILLING_CONFIG.annualDiscountPercent / 100);
  return yearlyTotal - discountAmount;
}

/**
 * Get the effective monthly price for annual billing.
 */
export function getEffectiveMonthlyPrice(
  monthlyPrice: number,
  interval: 'monthly' | 'annual'
): number {
  if (interval === 'monthly') return monthlyPrice;
  return calculateAnnualPrice(monthlyPrice) / 12;
}

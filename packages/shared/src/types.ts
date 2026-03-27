// ============================================
// API Response Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

/**
 * Success response with data
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  requestId?: string;
}

/**
 * Trial expired error response (HTTP 402)
 */
export interface TrialExpiredErrorResponse extends ApiErrorResponse {
  trialExpired: true;
  message: string;
}

/**
 * Upgrade required error response (HTTP 402)
 */
export interface UpgradeRequiredErrorResponse extends ApiErrorResponse {
  upgradeRequired: true;
  message: string;
  currentPlan: string;
  limit: number;
  currentCount: number;
}

/**
 * Check if a response is a trial expired error
 */
export function isTrialExpiredError(response: unknown): response is TrialExpiredErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'trialExpired' in response &&
    (response as TrialExpiredErrorResponse).trialExpired === true
  );
}

/**
 * Check if a response is an upgrade required error
 */
export function isUpgradeRequiredError(
  response: unknown
): response is UpgradeRequiredErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'upgradeRequired' in response &&
    (response as UpgradeRequiredErrorResponse).upgradeRequired === true
  );
}

// ============================================
// User Types
// ============================================

/**
 * Public user data returned from API
 */
export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string; // ISO date string when sent over API
}

// ============================================
// Avatar Types
// ============================================

/**
 * Presigned upload URL response
 */
export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
}

// ============================================
// Health Types
// ============================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: 'connected' | 'disconnected';
}

// GET /health
export type HealthCheckResponse = ApiSuccessResponse<HealthStatus>;

// ============================================
// Config Types
// ============================================

export interface PlanPricing {
  monthly: number | null;
  annual: number | null;
  annualPerMonth: number | null;
}

export interface PlanWithPricing {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  features: PlanFeatures;
  limits: PlanLimits;
  pricing: PlanPricing;
}

export interface AppConfig {
  appName: string;
  version: string;
  trial: {
    durationDays: number;
    requireCard: boolean;
  };
  billing: {
    annualDiscountPercent: number;
  };
  referrals: {
    enabled: boolean;
  };
  plans: PlanWithPricing[];
}

// GET /api/config
export type GetConfigResponse = AppConfig;

// ============================================
// Plan Types
// ============================================

export interface PlanFeatures {
  apiAccess?: boolean;
  advancedReports?: boolean;
  [key: string]: boolean | undefined;
}

export interface PlanLimits {
  members?: number;
  [key: string]: number | undefined;
}

export interface Plan {
  name: string;
  stripePriceId: string;
  features: PlanFeatures;
  limits: PlanLimits;
}

export interface PlansMap {
  [planId: string]: Plan;
}

// GET /api/billing/plans
export type GetPlansResponse = ApiSuccessResponse<{ plans: PlansMap }>;

// ============================================
// Billing Types
// ============================================

export interface SubscriptionData {
  planId: string;
  planName: string;
  billingInterval: 'monthly' | 'annual';
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  isTrialing: boolean;
  isCustomPricing: boolean;
  referralCode: string;
  referralCredits: number;
}

// GET /api/billing/subscription
export type GetSubscriptionResponse = ApiSuccessResponse<SubscriptionData>;

export interface BillingSetupData {
  customerId: string;
  subscriptionId: string;
  clientSecret: string | null;
}

// POST /api/billing/setup
export type BillingSetupResponse = ApiSuccessResponse<BillingSetupData>;

export interface ChangePlanData {
  subscriptionId: string;
  planId: string;
}

// POST /api/billing/change-plan
export type ChangePlanResponse = ApiSuccessResponse<ChangePlanData>;

export interface CancelSubscriptionData {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

// POST /api/billing/cancel
export type CancelSubscriptionResponse = ApiSuccessResponse<CancelSubscriptionData>;

export interface ResumeSubscriptionData {
  subscriptionId: string;
}

// POST /api/billing/resume
export type ResumeSubscriptionResponse = ApiSuccessResponse<ResumeSubscriptionData>;

export interface PortalSessionData {
  url: string;
}

// POST /api/billing/portal
export type BillingPortalResponse = ApiSuccessResponse<PortalSessionData>;

export interface UsageMetric {
  current: number;
  limit: number;
  percentage: number;
}

export interface UsageData {
  usage: Record<string, UsageMetric>;
}

// GET /api/billing/usage
export type GetUsageResponse = ApiSuccessResponse<UsageData>;

export interface ReferralHistoryItem {
  id: string;
  referredOrgName: string;
  amount: number;
  createdAt: string;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  credits: number;
  creditsFormatted: string;
  history: ReferralHistoryItem[];
}

// GET /api/billing/referrals
export type GetReferralsResponse = ApiSuccessResponse<ReferralData>;

export interface ApplyReferralData {
  referrerOrgId: string;
}

// POST /api/billing/apply-referral
export type ApplyReferralResponse = ApiSuccessResponse<ApplyReferralData>;

export interface ChangeIntervalData {
  subscriptionId: string;
  interval: 'monthly' | 'annual';
}

// POST /api/billing/change-interval
export type ChangeIntervalResponse = ApiSuccessResponse<ChangeIntervalData>;

// ============================================
// User API Endpoint Types
// ============================================

// GET /api/users/me
export type GetCurrentUserResponse = ApiSuccessResponse<UserPublic>;

// GET /api/users/:id
export type GetUserByIdResponse = ApiSuccessResponse<UserPublic>;

// PATCH /api/users/me
export type UpdateDisplayNameResponse = ApiSuccessResponse<UserPublic>;

// POST /api/users/me/avatar/presigned
export type GetAvatarPresignedUrlResponse = ApiSuccessResponse<PresignedUploadResult>;

// POST /api/users/me/avatar/confirm
export type ConfirmAvatarUploadResponse = ApiSuccessResponse<UserPublic>;

// DELETE /api/users/me/avatar
export type DeleteAvatarResponse = ApiSuccessResponse<UserPublic>;

// ============================================
// API Error Codes
// ============================================

export type ApiErrorCode =
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'no_active_org'
  | 'not_member'
  | 'insufficient_role'
  | 'upgrade_required'
  | 'limit_exceeded'
  | 'trial_expired'
  | 'downgrade_blocked'
  | 'not_found'
  | 'validation_error'
  | 'internal_error'
  | 'billing_not_setup'
  | 'invalid_plan'
  | 'subscription_not_found';

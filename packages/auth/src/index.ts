/**
 * @project/auth - Authentication Package
 *
 * Multi-tenant authentication using Better Auth with:
 * - Email/password with email verification
 * - Google OAuth
 * - Organization plugin for multi-tenancy
 *
 * ## Usage
 *
 * Server:
 * ```typescript
 * import { auth, toAuthUser } from '@project/auth';
 * ```
 *
 * Client:
 * ```typescript
 * import { signIn, signOut, useSession, useMember, organization } from '@project/auth/client';
 * ```
 */

// Export types
export * from './types.js';

// Export role utilities
export * from './roles.js';

// Export configuration
export {
  APP_CONFIG,
  APP_NAME,
  APP_SLUG,
  PLANS,
  TRIAL_CONFIG,
  BILLING_CONFIG,
  REFERRAL_CONFIG,
  getPlanPrice,
  getStripePriceId,
  getPublicPlans,
} from './config.js';
export type {
  AppConfig,
  Plan,
  PlanId,
  PlanFeatures,
  PlanLimits,
  TrialConfig,
  BillingConfig,
  ReferralConfig,
} from './config.js';

// Export server auth
export { auth, toAuthUser } from './server.js';
export type { Auth, Session, User } from './server.js';

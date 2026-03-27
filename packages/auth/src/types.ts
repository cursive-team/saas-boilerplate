/**
 * Authentication types for the multi-tenant SaaS boilerplate.
 */

/**
 * User object available after authentication.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
}

/**
 * Session information
 */
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  activeOrganizationId?: string | null;
}

/**
 * Organization member roles
 */
export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * Organization member record
 */
export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  createdAt: Date;
}

/**
 * Organization record
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  // Billing fields
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planId: string;
  billingEmail?: string | null;
  trialEndsAt?: Date | null;
  // Referral fields
  referralCode?: string | null;
  referredBy?: string | null;
  referralCredits: number;
}

/**
 * Result of session retrieval
 */
export interface SessionResult {
  user: AuthUser;
  session: AuthSession;
}

/**
 * Result of session retrieval with organization context
 */
export interface OrgSessionResult extends SessionResult {
  member: Member;
  organization: Organization;
}

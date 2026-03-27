/**
 * Auth Client
 *
 * React client for authentication with organization support.
 * This module is meant to be imported in browser/React environments.
 */

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { createRoleChecker } from './roles.js';
import type { Member } from './types.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

// Organization methods
export const { useActiveOrganization, useListOrganizations } = authClient;

export const organization = authClient.organization;

/**
 * Sign in with Google OAuth.
 * Note: This function must be called from client-side code.
 */
export function signInGoogle(callbackURL = '/dashboard') {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL,
  });
}

/**
 * Hook to get role checking utilities for the current member in active organization.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { isAdmin } = useMember();
 *   if (!isAdmin()) {
 *     return <div>Access denied</div>;
 *   }
 *   return <div>Admin content</div>;
 * }
 * ```
 */
export function useMember() {
  const { data: activeOrg } = authClient.useActiveOrganization();

  // The active member is included in the organization response
  const member: Member | undefined = activeOrg?.members?.[0]
    ? {
        id: activeOrg.members[0].id,
        userId: activeOrg.members[0].userId,
        organizationId: activeOrg.members[0].organizationId,
        role: activeOrg.members[0].role as Member['role'],
        createdAt: new Date(activeOrg.members[0].createdAt),
      }
    : undefined;

  return {
    member,
    ...createRoleChecker(member),
  };
}

// Re-export types and utilities
export { createRoleChecker } from './roles.js';
export type { AuthUser, AuthSession, Member, Organization, MemberRole } from './types.js';
export { APP_CONFIG, APP_NAME, APP_SLUG, PLANS, TRIAL_CONFIG, REFERRAL_CONFIG } from './config.js';
export type { Plan, PlanId, PlanFeatures, PlanLimits } from './config.js';

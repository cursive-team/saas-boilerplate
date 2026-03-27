/**
 * Auth Server Configuration
 *
 * Multi-tenant authentication using Better Auth with:
 * - Email/password authentication with email verification
 * - Google OAuth
 * - Organization plugin for multi-tenancy
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { prisma } from '@project/db';
import type { AuthUser } from './types.js';
import { APP_SLUG, PLANS } from './config.js';

/**
 * Check if a plan is a trial plan.
 * Trial plans have strictly enforced limits.
 */
function isTrialPlan(planId: string): boolean {
  const lowerPlanId = planId.toLowerCase();
  return lowerPlanId.includes('trial') || lowerPlanId === 'free' || lowerPlanId === 'starter';
}

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  secret: process.env.BETTER_AUTH_SECRET,

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,

    // Password reset
    sendResetPassword: async ({ user, url }) => {
      // Fire and forget - don't await to prevent timing attacks
      void import('@project/notifications').then(({ notifications }) =>
        notifications.sendPasswordReset({ to: user.email, url })
      );
    },
  },

  // Email verification
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Fire and forget - don't await to prevent timing attacks
      void import('@project/notifications').then(({ notifications }) =>
        notifications.sendVerification({ to: user.email, url })
      );
    },
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      prompt: 'select_account',
    },
  },

  // Account linking for OAuth
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  // Session configuration
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Cookie configuration
  advanced: {
    cookiePrefix: APP_SLUG,
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: !isDevelopment,
      httpOnly: true,
      path: '/',
    },
  },

  // CORS configuration
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),

  // Organization plugin for multi-tenancy
  // Note: Billing/referral fields (stripeCustomerId, planId, trialEndsAt, etc.) are defined
  // in the Prisma schema and accessed directly via Prisma. Better Auth handles core org
  // functionality while billing fields are managed by the billing service.
  plugins: [
    organization({
      // Creator becomes owner
      creatorRole: 'owner',

      // Limits
      organizationLimit: 5,
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48, // 48 hours

      // Send invitation emails
      sendInvitationEmail: async ({ email, organization: org, inviter, id }) => {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${id}`;
        // inviter.user contains the user data
        const inviterName = inviter.user?.name || inviter.user?.email || 'A team member';
        void import('@project/notifications').then(({ notifications }) =>
          notifications.sendInvitation({
            to: email,
            inviterName,
            orgName: org.name,
            url: inviteUrl,
          })
        );
      },

      // Organization hooks for member limit enforcement
      organizationHooks: {
        // Check member limit before creating invitation
        beforeCreateInvitation: async ({ invitation, inviter: _inviter, organization: org }) => {
          // Get full organization data including planId and customPlanConfig
          const fullOrg = await prisma.organization.findUnique({
            where: { id: org.id },
            select: {
              planId: true,
              customPlanConfig: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
          });

          if (!fullOrg) {
            throw new APIError('BAD_REQUEST', {
              message: 'Organization not found',
            });
          }

          // Get member limit from plan or custom config
          let memberLimit: number | undefined;
          if (fullOrg.customPlanConfig) {
            try {
              const customConfig = JSON.parse(fullOrg.customPlanConfig);
              if (customConfig.limits?.members !== undefined) {
                memberLimit = customConfig.limits.members;
              }
            } catch {
              // Fall through to standard plan check
            }
          }

          // Fall back to standard plan limit if not in custom config
          if (memberLimit === undefined) {
            const plan = PLANS[fullOrg.planId as keyof typeof PLANS];
            const limits = plan?.limits as Record<string, number> | undefined;
            memberLimit = limits?.members;
          }

          // -1 means unlimited, undefined means no limit configured
          if (memberLimit !== undefined && memberLimit !== -1) {
            const currentMemberCount = fullOrg._count.members;
            const isTrial = isTrialPlan(fullOrg.planId);

            // Check if adding one more member would exceed the limit
            if (currentMemberCount >= memberLimit) {
              // Strict enforcement for trial plans, allow but warn for paid plans
              if (isTrial) {
                throw new APIError('BAD_REQUEST', {
                  message: `Your plan allows ${memberLimit} members. Please upgrade to add more.`,
                  code: 'MEMBER_LIMIT_EXCEEDED',
                });
              } else {
                // For paid plans, log warning but allow (soft limit)
                // Using console.warn since logger is in apps/api and we're in packages/auth
                console.warn(
                  `[Member Limit] Organization ${org.id} exceeded member limit: ${currentMemberCount}/${memberLimit}`
                );
              }
            }
          }

          return { data: invitation };
        },

        // Check member limit before accepting invitation
        beforeAcceptInvitation: async ({
          invitation: _invitation,
          user: _user,
          organization: org,
        }) => {
          // Get full organization data including planId and customPlanConfig
          const fullOrg = await prisma.organization.findUnique({
            where: { id: org.id },
            select: {
              planId: true,
              customPlanConfig: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
          });

          if (!fullOrg) {
            throw new APIError('BAD_REQUEST', {
              message: 'Organization not found',
            });
          }

          // Get member limit from plan or custom config
          let memberLimit: number | undefined;
          if (fullOrg.customPlanConfig) {
            try {
              const customConfig = JSON.parse(fullOrg.customPlanConfig);
              if (customConfig.limits?.members !== undefined) {
                memberLimit = customConfig.limits.members;
              }
            } catch {
              // Fall through to standard plan check
            }
          }

          // Fall back to standard plan limit if not in custom config
          if (memberLimit === undefined) {
            const plan = PLANS[fullOrg.planId as keyof typeof PLANS];
            const limits = plan?.limits as Record<string, number> | undefined;
            memberLimit = limits?.members;
          }

          // -1 means unlimited, undefined means no limit configured
          if (memberLimit !== undefined && memberLimit !== -1) {
            const currentMemberCount = fullOrg._count.members;
            const isTrial = isTrialPlan(fullOrg.planId);

            // Check if adding this member would exceed the limit
            if (currentMemberCount >= memberLimit) {
              // Strict enforcement for trial plans, allow but warn for paid plans
              if (isTrial) {
                throw new APIError('BAD_REQUEST', {
                  message: `This organization has reached its member limit of ${memberLimit}. Please contact the organization owner to upgrade.`,
                  code: 'MEMBER_LIMIT_EXCEEDED',
                });
              } else {
                // For paid plans, log warning but allow (soft limit)
                // Using console.warn since logger is in apps/api and we're in packages/auth
                console.warn(
                  `[Member Limit] Organization ${org.id} exceeded member limit: ${currentMemberCount}/${memberLimit}`
                );
              }
            }
          }
        },
      },
    }),
  ],
});

/**
 * Transform Better Auth session user to AuthUser.
 */
export function toAuthUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    emailVerified: user.emailVerified,
  };
}

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

import { type Request, type Response, type NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, toAuthUser, type AuthUser, type AuthSession } from '@project/auth';
import { prisma } from '@project/db';
import { logger } from '@project/logger';

/**
 * Express request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  session?: AuthSession;
}

/**
 * Express request with organization context
 */
export interface OrgAuthenticatedRequest extends AuthenticatedRequest {
  organizationId?: string;
  member?: {
    id: string;
    userId: string;
    organizationId: string;
    role: 'owner' | 'admin' | 'member';
    createdAt: Date;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    planId: string;
    billingEmail?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    trialEndsAt?: Date | null;
    referralCode?: string | null;
    referredBy?: string | null;
    referralCredits: number;
    customPlanConfig?: string | null;
  };
}

/**
 * Get session from request.
 */
export async function getSessionFromRequest(req: Request): Promise<{
  user: AuthUser;
  session: AuthSession;
} | null> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      return {
        user: toAuthUser(session.user),
        session: {
          id: session.session.id,
          userId: session.session.userId,
          expiresAt: session.session.expiresAt,
          activeOrganizationId: (session.session as { activeOrganizationId?: string })
            .activeOrganizationId,
        },
      };
    }

    return null;
  } catch (error) {
    logger.debug({ requestId: req.requestId, error }, 'Session retrieval failed');
    return null;
  }
}

/**
 * Middleware that requires authentication.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const result = await getSessionFromRequest(req);

  if (!result) {
    logger.warn(
      { requestId: req.requestId, method: req.method, path: req.path },
      'Authentication required but no valid session'
    );
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      requestId: req.requestId,
    });
    return;
  }

  req.user = result.user;
  req.session = result.session;

  logger.debug(
    { requestId: req.requestId, userId: result.user.id, method: req.method, path: req.path },
    'User authenticated'
  );

  next();
}

/**
 * Middleware that optionally authenticates.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const result = await getSessionFromRequest(req);

  if (result) {
    req.user = result.user;
    req.session = result.session;

    logger.debug(
      { requestId: req.requestId, userId: result.user.id },
      'Optional auth: user authenticated'
    );
  } else {
    logger.debug({ requestId: req.requestId }, 'Optional auth: no session');
  }

  next();
}

/**
 * Middleware that requires organization context.
 * Must be used after requireAuth.
 * Gets the active organization from the session and validates membership.
 */
export async function requireOrgContext(
  req: OrgAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.session) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
      requestId: req.requestId,
    });
    return;
  }

  const activeOrgId = req.session.activeOrganizationId;

  if (!activeOrgId) {
    res.status(400).json({
      success: false,
      error: 'NoActiveOrganization',
      message: 'No active organization. Please select or create an organization.',
      requestId: req.requestId,
    });
    return;
  }

  // Get member record
  const member = await prisma.member.findFirst({
    where: {
      userId: req.user.id,
      organizationId: activeOrgId,
    },
    include: {
      organization: true,
    },
  });

  if (!member) {
    res.status(403).json({
      success: false,
      error: 'NotAMember',
      message: 'Not a member of this organization',
      requestId: req.requestId,
    });
    return;
  }

  req.organizationId = activeOrgId;
  req.member = {
    id: member.id,
    userId: member.userId,
    organizationId: member.organizationId,
    role: member.role as 'owner' | 'admin' | 'member',
    createdAt: member.createdAt,
  };
  req.organization = {
    id: member.organization.id,
    name: member.organization.name,
    slug: member.organization.slug,
    planId: member.organization.planId,
    billingEmail: member.organization.billingEmail,
    stripeCustomerId: member.organization.stripeCustomerId,
    stripeSubscriptionId: member.organization.stripeSubscriptionId,
    trialEndsAt: member.organization.trialEndsAt,
    referralCode: member.organization.referralCode,
    referredBy: member.organization.referredBy,
    referralCredits: member.organization.referralCredits,
    customPlanConfig: member.organization.customPlanConfig,
  };

  logger.debug(
    {
      requestId: req.requestId,
      userId: req.user.id,
      organizationId: activeOrgId,
      role: member.role,
    },
    'Organization context established'
  );

  next();
}

/**
 * Middleware factory for role-based access control.
 * Use after requireOrgContext.
 */
export function requireRole(...roles: ('owner' | 'admin' | 'member')[]) {
  return (req: OrgAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.member) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No organization context',
        requestId: req.requestId,
      });
      return;
    }

    if (!roles.includes(req.member.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory for feature gating based on plan.
 * Use after requireOrgContext.
 *
 * Checks customPlanConfig first (for enterprise/custom plans), then falls back to standard plan features.
 */
export function requireFeature(feature: string) {
  return async (req: OrgAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.organization) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No organization context',
        requestId: req.requestId,
      });
      return;
    }

    // Check for custom plan config first (enterprise plans)
    if (req.organization.customPlanConfig) {
      try {
        const customConfig = JSON.parse(req.organization.customPlanConfig);
        if (customConfig.features && typeof customConfig.features[feature] === 'boolean') {
          // Custom config explicitly defines this feature
          if (customConfig.features[feature]) {
            next();
            return;
          } else {
            res.status(403).json({
              success: false,
              error: 'UpgradeRequired',
              message: `Upgrade your plan to access ${feature}`,
              requiredFeature: feature,
              currentPlan: req.organization.planId,
              requestId: req.requestId,
            });
            return;
          }
        }
        // If custom config doesn't define this feature, fall through to standard plan check
      } catch (error) {
        logger.warn(
          { requestId: req.requestId, error, customPlanConfig: req.organization.customPlanConfig },
          'Failed to parse custom plan config, falling back to standard plan'
        );
        // Fall through to standard plan check
      }
    }

    // Import plans from config
    const { PLANS } = await import('@project/auth');
    const plan = PLANS[req.organization.planId as keyof typeof PLANS];

    if (!plan) {
      res.status(500).json({
        success: false,
        error: 'InvalidPlan',
        message: 'Organization has an invalid plan',
        requestId: req.requestId,
      });
      return;
    }

    const features = plan.features as Record<string, boolean>;
    if (!features[feature]) {
      res.status(403).json({
        success: false,
        error: 'UpgradeRequired',
        message: `Upgrade your plan to access ${feature}`,
        requiredFeature: feature,
        currentPlan: req.organization.planId,
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
}

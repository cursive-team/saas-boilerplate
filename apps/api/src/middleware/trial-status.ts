import type { Response, NextFunction } from 'express';
import { prisma } from '@project/db';
import type { OrgAuthenticatedRequest } from './auth.js';
import { logger } from '@project/logger';

// Extend request to include trialExpired flag
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      trialExpired?: boolean;
    }
  }
}

/**
 * Trial status middleware.
 *
 * Checks if the organization's trial has expired and blocks write operations
 * (POST, PUT, PATCH, DELETE) while still allowing read operations (GET, HEAD).
 *
 * This allows users to view their data but prevents modifications until they
 * add a payment method. Billing routes are always allowed through.
 *
 * Must be used after requireAuth and requireOrgContext.
 */
export async function trialStatusMiddleware(
  req: OrgAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const organizationId = req.organizationId;

  if (!organizationId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      requestId: req.requestId,
    });
    return;
  }

  // Always allow billing routes - users need to upgrade
  if (req.path.startsWith('/billing')) {
    next();
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planId: true,
      trialEndsAt: true,
    },
  });

  if (!organization) {
    res.status(404).json({
      success: false,
      error: 'Organization not found',
      requestId: req.requestId,
    });
    return;
  }

  // Check if trial has expired
  // A trial is expired if:
  // 1. The plan looks like a trial plan (contains 'trial' or is 'starter' without subscription)
  // 2. trialEndsAt is set and is in the past
  const isTrialPlan =
    organization.planId.toLowerCase().includes('trial') ||
    organization.planId.toLowerCase() === 'starter';
  const trialExpired =
    isTrialPlan && organization.trialEndsAt && organization.trialEndsAt < new Date();

  if (trialExpired) {
    req.trialExpired = true;
    res.setHeader('x-trial-expired', 'true');

    // Allow read operations
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    // Block write operations
    logger.warn(
      { requestId: req.requestId, organizationId, method: req.method, path: req.path },
      'Trial expired, blocking write operation'
    );

    res.status(402).json({
      success: false,
      error: 'Trial expired',
      message: 'Your trial has expired. Please add a payment method to continue.',
      trialExpired: true,
      requestId: req.requestId,
    });
    return;
  }

  next();
}

export default trialStatusMiddleware;

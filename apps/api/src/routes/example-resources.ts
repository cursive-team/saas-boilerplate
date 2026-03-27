/**
 * Example Resources Route
 *
 * This file demonstrates the usage limits pattern for the boilerplate.
 * It shows how to:
 * 1. Enforce trial status (block writes after trial expires)
 * 2. Track usage of a resource against plan limits
 * 3. Check limits before allowing resource creation
 *
 * CUSTOMIZATION GUIDE:
 * - Replace "exampleResource" with your actual resource name (e.g., "jobs", "recordings", "documents")
 * - Update the limits in cursive.json for each plan
 * - Copy this pattern for each resource type you want to limit
 *
 * The limits in cursive.json control how many resources each plan allows:
 * - starter: 100 (lower limit for trial/basic users)
 * - pro: 1000 (higher limit for paid users)
 * - enterprise: -1 (unlimited)
 */

import { Router, type Router as ExpressRouter, type Response } from 'express';
import type { ApiErrorResponse } from '@project/shared';
import {
  requireAuth,
  requireOrgContext,
  type OrgAuthenticatedRequest,
} from '../middleware/auth.js';
import { trialStatusMiddleware } from '../middleware/trial-status.js';
import * as billingService from '../services/billing.service.js';
import { logger } from '@project/logger';

const router: ExpressRouter = Router();

// The metric name used in UsageRecord - must match the key in cursive.json limits
const RESOURCE_METRIC = 'exampleResource';

/**
 * GET /api/example-resources/usage
 * Get current usage and limit for example resources.
 *
 * This endpoint shows users how much of their quota they've used.
 */
router.get(
  '/usage',
  requireAuth,
  requireOrgContext,
  async (req: OrgAuthenticatedRequest, res: Response, next) => {
    try {
      const { allowed, current, limit } = await billingService.checkUsageLimit(
        req.organizationId!,
        RESOURCE_METRIC
      );

      res.json({
        success: true,
        data: {
          metric: RESOURCE_METRIC,
          current,
          limit: limit === Infinity ? null : limit, // null means unlimited
          remaining: limit === Infinity ? null : Math.max(0, limit - current),
          allowed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/example-resources
 * Create an example resource (demonstrates usage tracking).
 *
 * This endpoint shows the full pattern:
 * 1. requireAuth - user must be logged in
 * 2. requireOrgContext - user must have an active organization
 * 3. trialStatusMiddleware - blocks writes if trial expired
 * 4. Check usage limit before creating
 * 5. Track usage after successful creation
 */
router.post(
  '/',
  requireAuth,
  requireOrgContext,
  trialStatusMiddleware, // Blocks POST/PUT/PATCH/DELETE if trial expired
  async (
    req: OrgAuthenticatedRequest,
    res: Response<{ success: true; data: { id: string; message: string } } | ApiErrorResponse>,
    next
  ) => {
    try {
      const orgId = req.organizationId!;

      // Step 1: Check if the organization has remaining quota
      const { allowed, current, limit } = await billingService.checkUsageLimit(
        orgId,
        RESOURCE_METRIC
      );

      if (!allowed) {
        logger.info(
          { orgId, current, limit, metric: RESOURCE_METRIC },
          'Usage limit reached, blocking resource creation'
        );

        res.status(402).json({
          success: false,
          error: 'Usage limit reached',
          message: `You have reached your plan limit of ${limit} ${RESOURCE_METRIC}. Please upgrade to create more.`,
          upgradeRequired: true,
          currentPlan: req.organization?.planId,
          limit,
          currentCount: current,
        } as ApiErrorResponse);
        return;
      }

      // Step 2: Create the resource (your actual business logic here)
      // In a real app, this would create a database record
      const resourceId = `example_${Date.now()}`;

      // Step 3: Track the usage AFTER successful creation
      await billingService.trackUsage(orgId, RESOURCE_METRIC, 1);

      logger.info(
        { orgId, resourceId, newUsage: current + 1, limit, metric: RESOURCE_METRIC },
        'Example resource created and usage tracked'
      );

      res.status(201).json({
        success: true,
        data: {
          id: resourceId,
          message: `Resource created. Usage: ${current + 1}/${limit === Infinity ? '∞' : limit}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/example-resources/:id
 * Delete an example resource (demonstrates negative usage tracking).
 *
 * If your resources can be deleted and you want to give quota back,
 * you can track negative usage. This is optional - some apps prefer
 * to not give quota back on deletion.
 */
router.delete(
  '/:id',
  requireAuth,
  requireOrgContext,
  trialStatusMiddleware,
  async (req: OrgAuthenticatedRequest, res: Response, next) => {
    try {
      const orgId = req.organizationId!;
      const resourceId = req.params.id;

      // In a real app, delete the resource from the database here
      // const deleted = await prisma.exampleResource.delete({ where: { id: resourceId } });

      // Optional: Track negative usage to give quota back
      // Uncomment if you want deletion to restore quota:
      // await billingService.trackUsage(orgId, RESOURCE_METRIC, -1);

      logger.info({ orgId, resourceId }, 'Example resource deleted');

      res.json({
        success: true,
        data: { id: resourceId, deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

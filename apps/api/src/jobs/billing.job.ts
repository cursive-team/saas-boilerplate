/**
 * Billing Scheduled Jobs
 *
 * Handles periodic billing-related tasks:
 * - Trial ending emails (3 days before, 1 day before)
 * - Sync usage to Stripe
 * - Usage warning emails (80% threshold)
 */

import { prisma } from '@project/db';
import { billing } from '@project/billing';
import { notifications, isInitialized as isNotificationsInitialized } from '@project/notifications';
import { PLANS } from '@project/auth';
import { logger } from '@project/logger';

/**
 * Send trial ending reminder emails.
 * Runs daily, sends emails at 3 days and 1 day before trial ends.
 */
export async function sendTrialEndingEmails(): Promise<void> {
  logger.info('Starting trial ending emails job');

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find orgs with trials ending in 3 days or 1 day
  const orgsEndingSoon = await prisma.organization.findMany({
    where: {
      trialEndsAt: {
        gte: yesterday,
        lte: threeDaysFromNow,
      },
      stripeSubscriptionId: { not: null },
    },
    include: {
      members: {
        where: { role: { in: ['owner', 'admin'] } },
        include: { user: true },
      },
    },
  });

  if (!isNotificationsInitialized()) {
    logger.warn('Notifications not initialized, skipping trial emails');
    return;
  }

  let emailsSent = 0;

  for (const org of orgsEndingSoon) {
    if (!org.trialEndsAt) continue;

    const daysLeft = Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    // Only send at 3 days and 1 day markers
    if (daysLeft !== 3 && daysLeft !== 1) continue;

    for (const member of org.members) {
      await notifications.sendTrialEnding({
        to: member.user.email,
        daysLeft,
      });
      emailsSent++;
    }

    logger.info(
      {
        orgId: org.id,
        daysLeft,
        recipientCount: org.members.length,
      },
      'Trial ending email sent'
    );
  }

  logger.info({ emailsSent }, 'Trial ending emails job complete');
}

/**
 * Sync usage records to Stripe for metered billing.
 * Runs hourly.
 */
export async function syncUsageToStripe(): Promise<void> {
  logger.info('Starting usage sync job');

  // Get unreported usage records
  const unreportedRecords = await prisma.usageRecord.findMany({
    where: {
      reportedToStripe: false,
    },
  });

  if (unreportedRecords.length === 0) {
    logger.info('No unreported usage records');
    return;
  }

  let synced = 0;
  let failed = 0;

  for (const record of unreportedRecords) {
    try {
      // Get the organization
      const org = await prisma.organization.findUnique({
        where: { id: record.organizationId },
      });

      if (!org?.stripeSubscriptionId) continue;

      // Get subscription to find the metered item
      const subscription = await billing.subscriptions.get(org.stripeSubscriptionId);

      // Find metered subscription item (if any)
      const meteredItem = subscription.items.data.find(
        (item) =>
          (item.price?.recurring as { usage_type?: string } | undefined)?.usage_type === 'metered'
      );

      if (!meteredItem) continue;

      // Report usage
      await billing.usage.report(meteredItem.id, Number(record.value));

      // Mark as reported
      await prisma.usageRecord.update({
        where: { id: record.id },
        data: { reportedToStripe: true },
      });

      synced++;
    } catch (error) {
      logger.error(
        {
          recordId: record.id,
          error: error instanceof Error ? error.message : error,
        },
        'Failed to sync usage record'
      );
      failed++;
    }
  }

  logger.info({ synced, failed }, 'Usage sync job complete');
}

/**
 * Send usage warning emails when approaching or exceeding limits.
 * Runs daily.
 *
 * Sends warnings at:
 * - 80% usage (approaching limit)
 * - 100%+ usage (at or over limit)
 *
 * Checks all metrics defined in cursive.json plan limits.
 */
export async function sendUsageWarnings(): Promise<void> {
  logger.info('Starting usage warnings job');

  if (!isNotificationsInitialized()) {
    logger.warn('Notifications not initialized, skipping usage warnings');
    return;
  }

  const orgs = await prisma.organization.findMany({
    include: {
      members: {
        where: { role: { in: ['owner', 'admin'] } },
        include: { user: true },
      },
    },
  });

  let warningsSent = 0;

  // Get current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const org of orgs) {
    const plan = PLANS[org.planId as keyof typeof PLANS];
    if (!plan) continue;

    const limits = plan.limits as Record<string, number>;

    // Check all metrics defined in the plan limits
    for (const [metric, limit] of Object.entries(limits)) {
      // Skip unlimited limits (-1)
      if (limit === -1) continue;

      // Get current usage from UsageRecord
      const usageRecord = await prisma.usageRecord.findFirst({
        where: {
          organizationId: org.id,
          metric,
          periodStart,
        },
      });

      const currentUsage = usageRecord ? Number(usageRecord.value) : 0;
      const percentage = Math.round((currentUsage / limit) * 100);

      // Send warning at 80% (approaching) or 100%+ (at/over limit)
      const shouldWarn = percentage >= 80;
      if (!shouldWarn) continue;

      // Format metric name for display (exampleResource -> Example Resource)
      const metricDisplayName = metric
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      for (const member of org.members) {
        await notifications.sendUsageWarning({
          to: member.user.email,
          metric: metricDisplayName,
          percentage,
        });
        warningsSent++;
      }

      logger.info(
        {
          orgId: org.id,
          metric,
          currentUsage,
          limit,
          percentage,
        },
        'Usage warning sent'
      );
    }
  }

  logger.info({ warningsSent }, 'Usage warnings job complete');
}

/**
 * Clean up expired invitations and old data.
 * Runs daily.
 */
export async function cleanupExpiredData(): Promise<void> {
  logger.info('Starting cleanup job');

  const now = new Date();

  // Delete expired invitations
  const { count: invitationsDeleted } = await prisma.invitation.deleteMany({
    where: {
      expiresAt: { lt: now },
      status: 'pending',
    },
  });

  // Delete expired verifications
  const { count: verificationsDeleted } = await prisma.verification.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  logger.info(
    {
      invitationsDeleted,
      verificationsDeleted,
    },
    'Cleanup job complete'
  );
}

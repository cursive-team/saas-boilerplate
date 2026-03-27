/**
 * Scheduled Jobs
 *
 * Uses node-cron for simple, reliable scheduling.
 * All jobs run in the main process - no separate workers needed.
 */

import cron from 'node-cron';
import { runHealthCheck } from './health.job.js';
import { logger } from '@project/logger';
import {
  sendTrialEndingEmails,
  syncUsageToStripe,
  sendUsageWarnings,
  cleanupExpiredData,
} from './billing.job.js';

/**
 * Initialize all scheduled jobs.
 * Call this once at server startup.
 */
export function initializeJobs(): void {
  logger.info('Initializing scheduled jobs');

  // Health check - daily at midnight
  cron.schedule('0 0 * * *', () => {
    logger.debug('Running scheduled health check');
    runHealthCheck();
  });

  // Trial ending emails - daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendTrialEndingEmails();
    } catch (error) {
      logger.error({ error }, 'Trial ending emails job failed');
    }
  });

  // Usage sync to Stripe - hourly
  cron.schedule('0 * * * *', async () => {
    try {
      await syncUsageToStripe();
    } catch (error) {
      logger.error({ error }, 'Usage sync job failed');
    }
  });

  // Usage warnings - daily at 10 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      await sendUsageWarnings();
    } catch (error) {
      logger.error({ error }, 'Usage warnings job failed');
    }
  });

  // Cleanup expired data - daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await cleanupExpiredData();
    } catch (error) {
      logger.error({ error }, 'Cleanup job failed');
    }
  });

  logger.info(
    {
      jobs: [
        'health-check (daily midnight)',
        'trial-ending-emails (daily 9 AM)',
        'usage-sync (hourly)',
        'usage-warnings (daily 10 AM)',
        'cleanup (daily 3 AM)',
      ],
    },
    'Scheduled jobs initialized'
  );
}

// Export job functions for manual triggering
export { runHealthCheck } from './health.job.js';
export {
  sendTrialEndingEmails,
  syncUsageToStripe,
  sendUsageWarnings,
  cleanupExpiredData,
} from './billing.job.js';

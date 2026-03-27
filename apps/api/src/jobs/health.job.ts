import { logger } from '@project/logger';

/**
 * Health Check Job
 *
 * Runs daily at midnight to verify the server is healthy.
 * This is a simple example job - replace with actual health checks as needed.
 */

export function runHealthCheck(): void {
  logger.info(
    {
      status: 'healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    },
    'Health check completed'
  );
}

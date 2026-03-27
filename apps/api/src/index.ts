import { app } from './app.js';
import { initializeJobs } from './jobs/index.js';
import { logger } from '@project/logger';

const PORT: number = Number(process.env.PORT) || 4000;

// Log startup configuration
logger.info(
  {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'default',
  },
  'Starting API server'
);

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      url: `http://localhost:${PORT}`,
    },
    'API server started successfully'
  );

  // Initialize cron jobs after server starts
  initializeJobs();
  logger.info('Cron jobs initialized');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error({ error: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

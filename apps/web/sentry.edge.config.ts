/**
 * Sentry Edge Configuration
 *
 * This file configures the initialization of Sentry for edge features (Middleware, Edge API routes).
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_WEB,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Reduce in production for better performance.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Disable in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN_WEB,
});

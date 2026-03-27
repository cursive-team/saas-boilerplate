/**
 * Sentry Error Tracking
 *
 * Initializes Sentry for error tracking in the API.
 * Must be called early in app startup, before other imports.
 */

import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initialize Sentry error tracking.
 * Safe to call multiple times - will only initialize once.
 */
export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.SENTRY_DSN_API;

  if (!dsn) {
    console.warn('SENTRY_DSN_API not set. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',
  });

  initialized = true;
  console.log('Sentry initialized for API');
}

/**
 * Capture an exception and send to Sentry.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for error tracking.
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (!initialized) return;

  Sentry.setUser(user);
}

export { Sentry };

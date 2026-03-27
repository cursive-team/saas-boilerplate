/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set on startup.
 * This prevents runtime errors from missing configuration.
 */

import { logger } from '@project/logger';

interface EnvConfig {
  /** Environment variable name */
  name: string;
  /** Whether the variable is required */
  required: boolean;
  /** Description shown in error messages */
  description: string;
  /** Default value if not required */
  defaultValue?: string;
}

/**
 * Environment variable configuration.
 * Add new variables here as needed.
 */
const ENV_CONFIG: EnvConfig[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
  },

  // Authentication
  {
    name: 'BETTER_AUTH_SECRET',
    required: true,
    description: 'Secret for signing auth tokens and cookies',
  },

  // API URLs
  {
    name: 'API_URL',
    required: false,
    description: 'Public API URL',
    defaultValue: 'http://localhost:4000',
  },
  {
    name: 'FRONTEND_URL',
    required: false,
    description: 'Frontend URL for redirects and CORS',
    defaultValue: 'http://localhost:3000',
  },

  // Stripe (required for billing)
  {
    name: 'STRIPE_SECRET_KEY',
    required: false, // Only required if billing is enabled
    description: 'Stripe secret API key',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false, // Only required if webhooks are enabled
    description: 'Stripe webhook signing secret',
  },

  // Google OAuth (optional)
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth client ID',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    description: 'Google OAuth client secret',
  },

  // Email (optional)
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for sending emails',
  },

  // Analytics (optional)
  {
    name: 'POSTHOG_API_KEY',
    required: false,
    description: 'PostHog API key for analytics',
  },

  // Error tracking (optional)
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
  },

  // Blob storage (optional)
  {
    name: 'S3_ENDPOINT',
    required: false,
    description: 'S3-compatible storage endpoint',
  },
  {
    name: 'S3_ACCESS_KEY_ID',
    required: false,
    description: 'S3 access key ID',
  },
  {
    name: 'S3_SECRET_ACCESS_KEY',
    required: false,
    description: 'S3 secret access key',
  },
  {
    name: 'S3_BUCKET',
    required: false,
    description: 'S3 bucket name',
  },
];

/**
 * Validate all required environment variables are set.
 * Logs warnings for missing optional variables.
 * Throws error if required variables are missing.
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_CONFIG) {
    const value = process.env[config.name];

    if (!value) {
      if (config.required) {
        missing.push(`  - ${config.name}: ${config.description}`);
      } else if (config.defaultValue) {
        // Set default value
        process.env[config.name] = config.defaultValue;
      } else {
        warnings.push(`  - ${config.name}: ${config.description}`);
      }
    }
  }

  // Log warnings for missing optional variables
  if (warnings.length > 0) {
    logger.warn(
      { missingOptional: warnings.length },
      `Missing optional environment variables (some features may be disabled):\n${warnings.join('\n')}`
    );
  }

  // Throw error for missing required variables
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.join('\n')}`;
    logger.error({ missingRequired: missing.length }, errorMessage);
    throw new Error(errorMessage);
  }

  logger.info('Environment variables validated successfully');
}

/**
 * Check if a feature is enabled based on environment variables.
 */
export function isFeatureEnabled(
  feature: 'stripe' | 'google' | 'email' | 'analytics' | 'sentry' | 'storage'
): boolean {
  switch (feature) {
    case 'stripe':
      return !!process.env.STRIPE_SECRET_KEY;
    case 'google':
      return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    case 'email':
      return !!process.env.RESEND_API_KEY;
    case 'analytics':
      return !!process.env.POSTHOG_API_KEY;
    case 'sentry':
      return !!process.env.SENTRY_DSN;
    case 'storage':
      return !!process.env.S3_ENDPOINT && !!process.env.S3_ACCESS_KEY_ID;
    default:
      return false;
  }
}

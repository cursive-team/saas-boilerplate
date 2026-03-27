import pino, { type Logger, type LoggerOptions } from 'pino';

/**
 * Shared Pino Logger Package
 *
 * Provides consistent logging across all backend apps and packages.
 *
 * Features:
 * - In development: Pretty-printed output with colors
 * - In production: JSON output for log aggregation
 * - Configurable log level via LOG_LEVEL env var
 * - Child loggers for component-specific context
 */

/**
 * Default logger options for the application.
 */
const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
};

/**
 * Create a logger instance with optional custom options.
 *
 * @param options - Additional pino options to merge with defaults
 * @returns A configured pino logger instance
 *
 * @example
 * ```typescript
 * import { createLogger } from '@project/logger';
 *
 * const logger = createLogger({ name: 'my-service' });
 * logger.info('Service started');
 * ```
 */
export function createLogger(options?: LoggerOptions): Logger {
  return pino({
    ...defaultOptions,
    ...options,
  });
}

/**
 * Default logger instance for general use.
 *
 * @example
 * ```typescript
 * import { logger } from '@project/logger';
 *
 * logger.info('Application started');
 * logger.error({ err }, 'Something went wrong');
 * ```
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context.
 *
 * @param bindings - Additional context to include in all log messages
 * @returns A child logger instance
 *
 * @example
 * ```typescript
 * import { createChildLogger } from '@project/logger';
 *
 * const requestLogger = createChildLogger({ requestId: '123' });
 * requestLogger.info('Processing request');
 * ```
 */
export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export type { Logger, LoggerOptions };
export default logger;

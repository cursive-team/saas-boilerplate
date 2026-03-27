/**
 * Rate Limiting Middleware
 *
 * Protects against brute force attacks, credential stuffing, and API abuse.
 *
 * Different limiters for different endpoint types:
 * - authLimiter: Strict limits for authentication endpoints
 * - apiLimiter: General API rate limiting
 * - strictLimiter: Very strict limits for sensitive operations
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '@project/logger';

/**
 * Normalize IPv6 addresses to prevent bypass attacks.
 * Converts various IPv6 representations to a canonical form.
 */
function normalizeIP(ip: string): string {
  if (!ip) return 'unknown';

  // Handle IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  // For IPv6, convert to lowercase and expand :: notation
  if (ip.includes(':')) {
    return ip.toLowerCase();
  }

  return ip;
}

/**
 * Custom key generator that uses IP + user ID (if authenticated)
 * This prevents a single user from consuming all rate limit capacity.
 */
function keyGenerator(req: Request): string {
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
  const ip = normalizeIP(rawIp);
  const userId = (req as Request & { user?: { id: string } }).user?.id;
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Custom handler for rate limit exceeded
 */
function rateLimitHandler(req: Request, res: Response): void {
  logger.warn(
    {
      ip: req.ip,
      path: req.path,
      method: req.method,
      requestId: (req as Request & { requestId?: string }).requestId,
    },
    'Rate limit exceeded'
  );

  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: res.getHeader('Retry-After'),
  });
}

/**
 * Rate limiter for authentication endpoints.
 * Very strict to prevent brute force attacks.
 *
 * - 5 requests per 15 minutes per IP
 * - Applies to login, signup, password reset
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (allows some retries for typos)
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator,
  handler: rateLimitHandler,
  skip: (_req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
  validate: { keyGeneratorIpFallback: false }, // We handle IPv6 normalization ourselves
});

/**
 * Rate limiter for general API endpoints.
 * Allows reasonable usage while preventing abuse.
 *
 * - 100 requests per minute per IP/user
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
  skip: (_req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
  validate: { keyGeneratorIpFallback: false }, // We handle IPv6 normalization ourselves
});

/**
 * Strict rate limiter for sensitive operations.
 * Used for things like password changes, email changes, etc.
 *
 * - 3 requests per hour per IP/user
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: { error: 'Too many attempts for this operation, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
  skip: (_req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
  validate: { keyGeneratorIpFallback: false }, // We handle IPv6 normalization ourselves
});

/**
 * Rate limiter for webhook endpoints.
 * More permissive since webhooks come from trusted services.
 *
 * - 1000 requests per minute (handles burst webhook deliveries)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // High limit for webhook bursts
  message: { error: 'Webhook rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

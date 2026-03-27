import type { ErrorRequestHandler, Request } from 'express';
import { ZodError } from 'zod';
import { logger } from '@project/logger';

// Error with optional status code
interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central error handling middleware
 * - Logs all errors with context
 * - Handles Zod validation errors
 * - Handles known HTTP errors
 * - Provides safe error responses to clients
 */
export const errorHandler: ErrorRequestHandler = (err: HttpError, req: Request, res, _next) => {
  const requestId = req.requestId;

  // Zod validation errors
  if (err instanceof ZodError) {
    logger.warn(
      {
        requestId,
        method: req.method,
        path: req.path,
        validationErrors: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
      'Validation error'
    );

    res.status(400).json({
      success: false,
      error: 'Validation error',
      requestId,
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known errors with status code
  if (err.statusCode && err.statusCode < 500) {
    logger.warn(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: err.statusCode,
        error: err,
      },
      'Client error'
    );

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId,
    });
    return;
  }

  // Database errors (Prisma)
  if (err.code?.startsWith('P')) {
    logger.error(
      {
        requestId,
        method: req.method,
        path: req.path,
        error: err,
        prismaCode: err.code,
      },
      'Database error'
    );

    res.status(500).json({
      success: false,
      error: 'Database error',
      requestId,
    });
    return;
  }

  // Unknown/server errors
  logger.error(
    {
      requestId,
      method: req.method,
      path: req.path,
      error: err,
    },
    'Unhandled error'
  );

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId,
  });
};

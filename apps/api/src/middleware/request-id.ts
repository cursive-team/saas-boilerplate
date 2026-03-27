import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request to include requestId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID middleware
 *
 * Assigns a unique request ID for tracing. If the client sends an
 * x-request-id header, it will be used; otherwise, a new UUID is generated.
 * The request ID is also set on the response headers for client-side tracing.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.header('x-request-id') ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

export default requestIdMiddleware;

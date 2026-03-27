import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { logger } from '@project/logger';

// Use createRequire for ESM/CJS interop with pino-http
const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http');

/**
 * HTTP request logging middleware using pino-http.
 *
 * Logs all incoming requests and responses with:
 * - Request method, URL, and headers
 * - Response status code and duration
 * - Request ID for tracing
 */
export const requestLogger = pinoHttp({
  logger,
  // Use the request ID from our middleware
  genReqId: (req: IncomingMessage & { requestId?: string }) => req.requestId || 'unknown',
  // Customize what gets logged
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Customize the log message
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  // Don't log health checks at info level (too noisy)
  autoLogging: {
    ignore: (req: IncomingMessage) => req.url === '/health',
  },
});

export default requestLogger;

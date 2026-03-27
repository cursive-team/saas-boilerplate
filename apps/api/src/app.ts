import cors from 'cors';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth, APP_NAME } from '@project/auth';
import { initBilling } from '@project/billing';
import { initNotifications } from '@project/notifications';
import { initMetrics } from '@project/metrics';
import { errorHandler } from './middleware/error-handler.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { authLimiter, apiLimiter, webhookLimiter } from './middleware/rate-limit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import { validateEnv } from './lib/env.js';
import healthRouter from './routes/health.js';
import usersRouter from './routes/users.js';
import configRouter from './routes/config.js';
import billingRouter from './routes/billing.js';
import exampleResourcesRouter from './routes/example-resources.js';
import stripeWebhookRouter from './routes/webhooks/stripe.js';

// ==========================================
// Environment Validation (early, before services)
// ==========================================

validateEnv();

// ==========================================
// Initialize Sentry (early, before other code)
// ==========================================

initSentry();

const app: Express = express();

// ==========================================
// Trust proxy (required for rate limiting behind reverse proxy)
// ==========================================

// Trust first proxy for accurate IP addresses
app.set('trust proxy', 1);

// ==========================================
// Security Headers (helmet)
// ==========================================

app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS filter
    xssFilter: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Don't advertise Express
    hidePoweredBy: true,
  })
);

// ==========================================
// Initialize External Services
// ==========================================

// Initialize Stripe billing
if (process.env.STRIPE_SECRET_KEY) {
  initBilling(process.env.STRIPE_SECRET_KEY);
}

// Initialize Resend notifications
if (process.env.RESEND_API_KEY) {
  initNotifications({
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
    fromName: APP_NAME,
    appName: APP_NAME,
    frontendUrl: process.env.FRONTEND_URL,
  });
}

// Initialize PostHog metrics
if (process.env.POSTHOG_API_KEY) {
  initMetrics({
    posthogApiKey: process.env.POSTHOG_API_KEY,
    posthogHost: process.env.POSTHOG_HOST,
    appId: APP_NAME.toLowerCase().replace(/\s+/g, '-'),
  });
}

// ==========================================
// CORS - must allow credentials for auth cookies
// ==========================================

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ==========================================
// Webhook routes - MUST be before express.json()
// Webhooks need raw body for signature verification
// ==========================================

// Stripe webhooks need raw body
app.use('/webhooks/stripe', webhookLimiter, stripeWebhookRouter);

// ==========================================
// Better Auth handler - MUST be before express.json()
// Auth endpoints have strict rate limiting
// ==========================================

// Rate limit auth endpoints to prevent brute force attacks
app.use('/api/auth', authLimiter);

// Express 5 requires named wildcards: *splat captures the rest of the path
app.all('/api/auth/*splat', toNodeHandler(auth));

// ==========================================
// JSON parsing middleware - after auth handler
// ==========================================

app.use(express.json({ limit: '10mb' }));
app.use(requestIdMiddleware);
app.use(requestLogger);

// ==========================================
// API Rate Limiting (after auth middleware)
// ==========================================

app.use('/api', apiLimiter);

// ==========================================
// API Routes
// ==========================================

app.use('/health', healthRouter);
app.use('/api/config', configRouter);
app.use('/api/users', usersRouter);
app.use('/api/billing', billingRouter);
app.use('/api/example-resources', exampleResourcesRouter);

// ==========================================
// Error handling
// ==========================================

// Sentry error handler must be before other error handlers
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

export { app, auth };

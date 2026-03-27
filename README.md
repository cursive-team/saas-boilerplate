# SaaS Boilerplate

A production-ready monorepo for building multi-tenant SaaS applications.

## What's Already Built

This boilerplate gives you a fully working foundation:

- **Multi-tenancy** – Organizations with role-based access control (owner/admin/member)
- **Authentication** – Email/password + Google OAuth via Better Auth
- **Billing** – Stripe subscriptions, trials, referral credits, and usage limits
- **Notifications** – Email via Resend
- **Analytics** – Event tracking via PostHog
- **Error tracking** – Sentry for frontend and backend
- **Background jobs** – Scheduled tasks via node-cron
- **File storage** – S3-compatible blob storage with presigned URLs
- **Testing** – Unit and integration tests with Vitest + Testcontainers
- **CI/CD** – GitHub Actions with lint, typecheck, and test jobs

## Tech Stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Frontend  | Next.js, React, Tailwind CSS           |
| Backend   | Express.js, TypeScript                 |
| Database  | PostgreSQL, Prisma                     |
| Storage   | S3-compatible (Railway/MinIO)          |
| Auth      | Better Auth (with Organization plugin) |
| Billing   | Stripe                                 |
| Email     | Resend                                 |
| Analytics | PostHog                                |
| Errors    | Sentry                                 |
| Testing   | Vitest, Testcontainers                 |
| Build     | Turborepo, pnpm                        |

## Project Structure

```
├── apps/
│   ├── web/                          # Next.js frontend (Vercel)
│   │   └── src/
│   │       ├── app/                  # Pages (App Router)
│   │       ├── components/           # Feature components (stateful)
│   │       │   └── ui/               # UI primitives (stateless, reusable)
│   │       └── lib/
│   │           ├── api.ts            # Typed API client (fetch wrapper)
│   │           ├── api-errors.ts     # Error handling utilities
│   │           ├── auth-client.ts    # Better Auth React hooks
│   │           └── session.ts        # Server-side session utilities
│   │
│   └── api/                          # Express backend (Railway)
│       └── src/
│           ├── app.ts                # Express config + route registration
│           ├── routes/               # HTTP handlers (one file per resource)
│           ├── services/             # Business logic (one file per domain)
│           ├── jobs/                 # Scheduled tasks (cron)
│           ├── middleware/           # Auth, error handling, logging
│           │   └── auth.ts           # requireAuth, requireOrgContext, requireRole, requireFeature
│           └── lib/                  # Utilities (logger, plan-limits)
│
├── packages/
│   ├── db/                           # @project/db – Prisma schema + client
│   │   └── prisma/schema.prisma      # Database models
│   ├── auth/                         # @project/auth – Better Auth server config
│   ├── billing/                      # @project/billing – Stripe helpers
│   ├── notifications/                # @project/notifications – Resend email
│   ├── metrics/                      # @project/metrics – PostHog analytics
│   ├── blob/                         # @project/blob – S3 storage utilities
│   └── shared/                       # @project/shared – Shared types + Zod schemas
│       └── src/
│           ├── types.ts              # API response types (ApiResponse<T>, error types)
│           └── validation.ts         # Zod schemas for all API contracts
│
├── cursive.json                      # App configuration (plans, features, limits, trial)
├── spec.md                           # Product specification (what you're building)
└── .env.example                      # Environment variables template
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

### Setup

1. Clone the repository
2. `pnpm install`
3. Copy `.env.example` to `.env`
4. Set `APP_SLUG` in `.env` to match `cursive.json` slug
5. `docker compose up -d` (starts PostgreSQL + MinIO)
6. `pnpm db:migrate:deploy`
7. `pnpm dev`

### Local URLs

| Service       | URL                                           |
| ------------- | --------------------------------------------- |
| Frontend      | http://localhost:3000                         |
| API           | http://localhost:4000                         |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |

## How the Backend Works

### Separation of Concerns

- **Routes** (`apps/api/src/routes/`) handle HTTP: parse requests, send responses, call services
- **Services** (`apps/api/src/services/`) handle business logic: database queries, external APIs, data transformation
- Routes call services, never the reverse

### Auth Middleware Chain

Every protected route uses a middleware chain. Apply them in order:

```typescript
// Just authentication
router.get('/profile', requireAuth, handler);

// Auth + organization context (sets req.organizationId, req.member, req.organization)
router.get('/data', requireAuth, requireOrgContext, handler);

// Auth + org + role check
router.delete('/org', requireAuth, requireOrgContext, requireRole('owner'), handler);

// Auth + org + feature gate (checks plan in cursive.json)
router.get('/reports', requireAuth, requireOrgContext, requireFeature('advancedReports'), handler);
```

### Adding a New API Endpoint

1. **Define validation** in `packages/shared/src/validation.ts` (Zod schema)
2. **Define response type** in `packages/shared/src/types.ts`
3. **Create service** in `apps/api/src/services/{feature}.service.ts`
4. **Create route** in `apps/api/src/routes/{feature}.ts` with middleware chain
5. **Register route** in `apps/api/src/app.ts`
6. **Add client method** in `apps/web/src/lib/api.ts`

### Example Resource (Reference Implementation)

`apps/api/src/routes/example-resources.ts` is a complete working example of a resource with usage limits. Study it. The pattern is:

```typescript
// 1. Check usage limit BEFORE creating
const { allowed, current, limit } = await billingService.checkUsageLimit(orgId, 'exampleResource');
if (!allowed) {
  return res.status(402).json({ error: 'Usage limit reached', upgradeRequired: true });
}

// 2. Create resource (your business logic)

// 3. Track usage AFTER successful creation
await billingService.trackUsage(orgId, 'exampleResource', 1);
```

The metric name (`exampleResource`) must match a key in `cursive.json` under `plans.*.limits`.

### Adding a New Database Model

1. Add model to `packages/db/prisma/schema.prisma`
2. Add relation to `Organization` model (for multi-tenant scoping)
3. Run `pnpm db:migrate`

Always scope queries by `organizationId`. Never trust client-supplied org IDs — use `req.organizationId` from middleware.

## How the Frontend Works

### Data Fetching

The frontend is client-side only — no Next.js API routes, no direct database access. All data comes from the Express API via the typed client in `apps/web/src/lib/api.ts`:

```typescript
import { api } from '@/lib/api';

const { data } = await api.users.me();
const { data: plans } = await api.billing.getPlans();
```

### Auth Hooks

```typescript
import { useSession, useActiveOrganization, useActiveMember } from '@/lib/auth-client';

const { data: session } = useSession(); // Current user
const { data: org } = useActiveOrganization(); // Current organization
const { data: member } = useActiveMember(); // Current membership + role
```

### Feature and Role Gating

```tsx
import { FeatureGate, RoleGate } from '@/components/gates';

// Show component only if plan has this feature
<FeatureGate feature="advancedReports" fallback={<UpgradePrompt feature="Advanced Reports" />}>
  <ReportsPanel />
</FeatureGate>

// Show component only if user has required role
<RoleGate roles={['owner', 'admin']} fallback={<AccessDenied />}>
  <AdminSettings />
</RoleGate>
```

### Upgrade Modal

When an API call returns a 402 with `upgradeRequired: true`:

```typescript
import { useUpgradeModal } from '@/components/upgrade-required-modal';
import { isUpgradeRequiredError } from '@/lib/api-errors';

const { showUpgradeModal } = useUpgradeModal();

try {
  await api.someAction();
} catch (error) {
  if (isUpgradeRequiredError(error)) {
    showUpgradeModal({ feature: 'members', ...error });
  }
}
```

### Components

| Location                   | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `src/components/ui/`       | Stateless primitives (Button, Input, Card) — always reuse these |
| `src/components/`          | Feature components — stateful, handle API calls                 |
| `src/components/gates.tsx` | FeatureGate, RoleGate, UpgradePrompt, AccessDenied              |

## Plans and Limits Configuration

All plan definitions live in `cursive.json`:

```json
{
  "plans": {
    "starter": {
      "features": { "advancedReports": false, "apiAccess": true },
      "limits": { "exampleResource": 100 }
    },
    "pro": {
      "features": { "advancedReports": true, "apiAccess": true },
      "limits": { "exampleResource": 1000 }
    },
    "enterprise": {
      "limits": { "exampleResource": -1 } // -1 = unlimited
    }
  }
}
```

To add a new limited resource, add its key to `limits` in each plan, then use `checkUsageLimit` / `trackUsage` in your route handler.

To add a new gated feature, add its key to `features` in each plan, then use `requireFeature()` on the backend and `<FeatureGate>` on the frontend.

## Commands

| Command                  | Description                         |
| ------------------------ | ----------------------------------- |
| `pnpm dev`               | Start all services                  |
| `pnpm build`             | Build for production                |
| `pnpm test:unit`         | Run unit tests                      |
| `pnpm test:integration`  | Run integration tests (Docker req.) |
| `pnpm typecheck`         | TypeScript type checking            |
| `pnpm lint`              | Run ESLint                          |
| `pnpm format`            | Format code with Prettier           |
| `pnpm db:migrate`        | Create new migration                |
| `pnpm db:migrate:deploy` | Run migrations                      |
| `pnpm db:studio`         | Open Prisma Studio                  |
| `pnpm db:generate`       | Regenerate Prisma client            |

## Environment Variables

Copy `.env.example` to `.env`. See the file for detailed setup instructions for each variable.

### Required

| Variable              | Purpose                      |
| --------------------- | ---------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Express API URL              |
| `FRONTEND_URL`        | Frontend URL (CORS, emails)  |
| `BETTER_AUTH_SECRET`  | Session signing secret       |

### Optional (enable as needed)

| Variable                | Purpose                       |
| ----------------------- | ----------------------------- |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID        |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret    |
| `STRIPE_SECRET_KEY`     | Stripe API key                |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY`        | Resend email API key          |
| `POSTHOG_API_KEY`       | PostHog analytics API key     |
| `SENTRY_DSN_WEB`        | Sentry DSN for frontend       |
| `SENTRY_DSN_API`        | Sentry DSN for backend        |

## Troubleshooting

| Issue                            | Solution                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| Prisma client not found          | Run `pnpm db:generate`                                      |
| Type errors after schema changes | Run `pnpm db:generate` then `pnpm typecheck`                |
| Auth not working                 | Check CORS settings and `NEXT_PUBLIC_API_URL`               |
| Google OAuth failing             | Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`         |
| Stripe webhooks failing          | Check `STRIPE_WEBHOOK_SECRET`, use Stripe CLI for local dev |
| Emails not sending               | Check `RESEND_API_KEY` and verified domain                  |
| Blob storage failing             | Ensure Docker is running, check MinIO at localhost:9001     |

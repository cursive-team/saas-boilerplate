# Product Specification

TODO: Add your product spec here. This file should describe what you're building on top of this boilerplate.

## What to Include

- **Overview** – What the product does and who it's for
- **Data Model** – New database models and relationships (beyond the boilerplate's built-in User/Organization/Member models)
- **Features** – Core features to implement, with acceptance criteria
- **API Routes** – New endpoints with request/response shapes
- **Pages** – New frontend pages and their behavior
- **Feature Gating** – Which features are available on which plans (if applicable)
- **Validation Rules** – Input constraints for new fields

## What's Already Built

The boilerplate includes the following out of the box (see README.md for details):

- Multi-tenant auth (email/password + Google OAuth)
- Organization management with role-based access (owner/admin/member)
- Stripe billing with subscriptions, trials, and referral credits
- Email notifications via Resend
- Analytics via PostHog
- Error tracking via Sentry
- Background jobs (usage sync, trial emails, cleanup)
- File storage via S3-compatible presigned URLs
- Example resource with usage limit enforcement pattern

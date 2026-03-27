/**
 * Stripe Webhook Handler
 *
 * Handles incoming Stripe webhook events with idempotency protection.
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import express from 'express';
import { prisma } from '@project/db';
import { billing, type Stripe } from '@project/billing';
import * as billingService from '../../services/billing.service.js';
import { logger } from '@project/logger';

const router: ExpressRouter = Router();

// Stripe webhooks need raw body
router.use(express.raw({ type: 'application/json' }));

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events.
 */
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    event = billing.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : err },
      'Webhook signature verification failed'
    );
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : err}`);
  }

  // Check for duplicate event (idempotency)
  const existingEvent = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
  });

  if (existingEvent) {
    logger.info({ eventId: event.id }, 'Skipping duplicate Stripe webhook');
    return res.status(200).json({ received: true, duplicate: true });
  }

  logger.info({ type: event.type, id: event.id }, 'Stripe webhook received');

  try {
    switch (event.type) {
      case 'invoice.paid':
        await billingService.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await billingService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await billingService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await billingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'checkout.session.completed':
        await billingService.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        logger.debug({ type: event.type }, 'Unhandled webhook event type');
    }

    // Mark event as processed (for idempotency)
    await prisma.processedStripeEvent.create({
      data: { id: event.id },
    });
  } catch (error) {
    logger.error(
      {
        type: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : error,
      },
      'Error processing webhook'
    );
    // Return 200 to prevent Stripe from retrying
    // The event will be reprocessed if it comes again since we didn't mark it
  }

  res.json({ received: true });
});

export default router;

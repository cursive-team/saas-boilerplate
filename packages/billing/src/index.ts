/**
 * @project/billing - Stripe Billing Package
 *
 * Typed helpers for Stripe operations.
 *
 * ## Usage
 *
 * ```typescript
 * import { initBilling, billing } from '@project/billing';
 *
 * // Initialize once at app startup
 * initBilling(process.env.STRIPE_SECRET_KEY!);
 *
 * // Use billing helpers
 * const customer = await billing.customers.create({
 *   email: user.email,
 *   name: org.name,
 *   orgId: org.id,
 * });
 * ```
 */

import Stripe from 'stripe';

let stripe: Stripe;

/**
 * Initialize the billing module with Stripe API key.
 * Must be called once at app startup.
 */
export function initBilling(secretKey: string): void {
  stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

/**
 * Get the Stripe instance (for advanced use cases).
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Billing not initialized. Call initBilling() first.');
  }
  return stripe;
}

/**
 * Billing helpers for common Stripe operations.
 */
export const billing = {
  /**
   * Customer operations
   */
  customers: {
    /**
     * Create a new Stripe customer for an organization.
     */
    async create(params: {
      email: string;
      name: string;
      orgId: string;
      metadata?: Record<string, string>;
    }): Promise<Stripe.Customer> {
      return stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          orgId: params.orgId,
          ...params.metadata,
        },
      });
    },

    /**
     * Get a customer by ID.
     */
    async get(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
      return stripe.customers.retrieve(customerId);
    },

    /**
     * Update a customer.
     */
    async update(
      customerId: string,
      params: Stripe.CustomerUpdateParams
    ): Promise<Stripe.Customer> {
      return stripe.customers.update(customerId, params);
    },
  },

  /**
   * Subscription operations
   */
  subscriptions: {
    /**
     * Create a subscription with optional trial.
     */
    async create(params: {
      customerId: string;
      priceId: string;
      trialDays?: number;
      metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription> {
      return stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialDays,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: params.metadata,
      });
    },

    /**
     * Get a subscription by ID.
     */
    async get(subscriptionId: string): Promise<Stripe.Subscription> {
      return stripe.subscriptions.retrieve(subscriptionId);
    },

    /**
     * Cancel a subscription (at period end by default).
     */
    async cancel(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Stripe.Subscription> {
      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    },

    /**
     * Cancel a subscription immediately.
     */
    async cancelImmediately(subscriptionId: string): Promise<Stripe.Subscription> {
      return stripe.subscriptions.cancel(subscriptionId);
    },

    /**
     * Resume a cancelled subscription.
     */
    async resume(subscriptionId: string): Promise<Stripe.Subscription> {
      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    },

    /**
     * Update subscription to a different plan.
     */
    async changePlan(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription> {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    },
  },

  /**
   * Setup Intent operations (for collecting payment methods)
   */
  setupIntents: {
    /**
     * Create a SetupIntent for collecting payment details.
     */
    async create(customerId: string): Promise<Stripe.SetupIntent> {
      return stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
    },
  },

  /**
   * Payment Method operations
   */
  paymentMethods: {
    /**
     * List payment methods for a customer.
     */
    async list(customerId: string): Promise<Stripe.PaymentMethod[]> {
      const result = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return result.data;
    },

    /**
     * Set default payment method for a customer.
     */
    async setDefault(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
      return stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    },

    /**
     * Detach a payment method from a customer.
     */
    async detach(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
      return stripe.paymentMethods.detach(paymentMethodId);
    },
  },

  /**
   * Invoice operations
   */
  invoices: {
    /**
     * List invoices for a customer.
     */
    async list(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
      const result = await stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return result.data;
    },

    /**
     * Get upcoming invoice for a customer.
     */
    async getUpcoming(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
      try {
        return await stripe.invoices.retrieveUpcoming({
          customer: customerId,
        });
      } catch {
        return null;
      }
    },
  },

  /**
   * Portal operations
   */
  portal: {
    /**
     * Create a customer portal session for self-service billing management.
     */
    async createSession(
      customerId: string,
      returnUrl: string
    ): Promise<Stripe.BillingPortal.Session> {
      return stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    },
  },

  /**
   * Webhook operations
   */
  webhooks: {
    /**
     * Construct and verify a webhook event.
     */
    constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    },
  },

  /**
   * Usage-based billing operations
   */
  usage: {
    /**
     * Report usage for a metered subscription item.
     */
    async report(
      subscriptionItemId: string,
      quantity: number,
      timestamp?: number
    ): Promise<Stripe.UsageRecord> {
      return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      });
    },

    /**
     * Get usage summary for a subscription item.
     */
    async getSummary(subscriptionItemId: string): Promise<Stripe.UsageRecordSummary[]> {
      const result = await stripe.subscriptionItems.listUsageRecordSummaries(subscriptionItemId);
      return result.data;
    },
  },
};

// Re-export Stripe types for convenience
export type { Stripe };
export type StripeCustomer = Stripe.Customer;
export type StripeSubscription = Stripe.Subscription;
export type StripeInvoice = Stripe.Invoice;
export type StripePaymentMethod = Stripe.PaymentMethod;
export type StripeEvent = Stripe.Event;

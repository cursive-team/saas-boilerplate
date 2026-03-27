/**
 * @project/notifications - Email Notifications Package
 *
 * Typed helpers for sending transactional emails via Resend.
 *
 * ## Usage
 *
 * ```typescript
 * import { initNotifications, notifications } from '@project/notifications';
 *
 * // Initialize once at app startup
 * initNotifications({
 *   resendApiKey: process.env.RESEND_API_KEY!,
 *   fromEmail: 'noreply@yourapp.com',
 *   fromName: 'YourApp',
 *   appName: 'YourApp',
 * });
 *
 * // Send emails
 * await notifications.sendVerification({ to: user.email, url });
 * ```
 */

import { Resend } from 'resend';
import pino from 'pino';
import * as templates from './templates.js';

let resend: Resend;
let config: {
  fromEmail: string;
  fromName: string;
  appName: string;
  frontendUrl: string;
};
let logger: pino.Logger;

export interface NotificationConfig {
  resendApiKey: string;
  fromEmail: string;
  fromName: string;
  appName: string;
  frontendUrl?: string;
}

/**
 * Initialize the notifications module.
 * Must be called once at app startup.
 */
export function initNotifications(options: NotificationConfig): void {
  resend = new Resend(options.resendApiKey);
  config = {
    fromEmail: options.fromEmail,
    fromName: options.fromName,
    appName: options.appName,
    frontendUrl: options.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
  };
  // Initialize structured logger
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
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
  });
}

/**
 * Check if notifications are initialized.
 */
export function isInitialized(): boolean {
  return !!resend && !!config && !!logger;
}

/**
 * Get the from address in "Name <email>" format.
 */
function getFromAddress(): string {
  return `${config.fromName} <${config.fromEmail}>`;
}

/**
 * Send result type
 */
export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Notification helpers for common email types.
 */
export const notifications = {
  /**
   * Send email verification link.
   */
  async sendVerification(params: { to: string; url: string }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendVerification');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `Verify your ${config.appName} account`,
        html: templates.verificationEmail({
          appName: config.appName,
          url: params.url,
        }),
      });

      if (result.error) {
        logger.error({ error: result.error, to: params.to }, 'Failed to send verification email');
        return { success: false, error: result.error.message };
      }

      logger.info({ emailId: result.data?.id, to: params.to }, 'Verification email sent');
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error({ error, to: params.to }, 'Failed to send verification email');
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send password reset link.
   */
  async sendPasswordReset(params: { to: string; url: string }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendPasswordReset');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `Reset your ${config.appName} password`,
        html: templates.passwordResetEmail({
          appName: config.appName,
          url: params.url,
        }),
      });

      if (result.error) {
        logger.error({ error: result.error, to: params.to }, 'Failed to send password reset email');
        return { success: false, error: result.error.message };
      }

      logger.info({ emailId: result.data?.id, to: params.to }, 'Password reset email sent');
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error({ error, to: params.to }, 'Failed to send password reset email');
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send organization invitation.
   */
  async sendInvitation(params: {
    to: string;
    inviterName: string;
    orgName: string;
    url: string;
  }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendInvitation');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `${params.inviterName} invited you to ${params.orgName}`,
        html: templates.invitationEmail({
          appName: config.appName,
          inviterName: params.inviterName,
          orgName: params.orgName,
          url: params.url,
        }),
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, orgName: params.orgName },
          'Failed to send invitation email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        { emailId: result.data?.id, to: params.to, orgName: params.orgName },
        'Invitation email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, orgName: params.orgName },
        'Failed to send invitation email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send trial ending warning.
   */
  async sendTrialEnding(params: { to: string; daysLeft: number }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendTrialEnding');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `Your ${config.appName} trial ends in ${params.daysLeft} days`,
        html: templates.trialEndingEmail({
          appName: config.appName,
          daysLeft: params.daysLeft,
          billingUrl: `${config.frontendUrl}/settings/billing`,
        }),
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, daysLeft: params.daysLeft },
          'Failed to send trial ending email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        { emailId: result.data?.id, to: params.to, daysLeft: params.daysLeft },
        'Trial ending email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, daysLeft: params.daysLeft },
        'Failed to send trial ending email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send payment failed notification.
   */
  async sendPaymentFailed(params: { to: string; invoiceUrl: string }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendPaymentFailed');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `Payment failed for ${config.appName}`,
        html: templates.paymentFailedEmail({
          appName: config.appName,
          invoiceUrl: params.invoiceUrl,
        }),
      });

      if (result.error) {
        logger.error({ error: result.error, to: params.to }, 'Failed to send payment failed email');
        return { success: false, error: result.error.message };
      }

      logger.info({ emailId: result.data?.id, to: params.to }, 'Payment failed email sent');
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error({ error, to: params.to }, 'Failed to send payment failed email');
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send usage warning notification.
   */
  async sendUsageWarning(params: {
    to: string;
    metric: string;
    percentage: number;
  }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendUsageWarning');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `${config.appName}: ${params.metric} usage at ${params.percentage}%`,
        html: templates.usageWarningEmail({
          appName: config.appName,
          metric: params.metric,
          percentage: params.percentage,
          upgradeUrl: `${config.frontendUrl}/settings/billing`,
        }),
      });

      if (result.error) {
        logger.error(
          {
            error: result.error,
            to: params.to,
            metric: params.metric,
            percentage: params.percentage,
          },
          'Failed to send usage warning email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        {
          emailId: result.data?.id,
          to: params.to,
          metric: params.metric,
          percentage: params.percentage,
        },
        'Usage warning email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, metric: params.metric, percentage: params.percentage },
        'Failed to send usage warning email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send referral credit notification.
   */
  async sendReferralCredit(params: {
    to: string;
    creditAmount: number;
    referredOrgName: string;
  }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendReferralCredit');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `You earned $${params.creditAmount} in referral credits!`,
        html: templates.referralCreditEmail({
          appName: config.appName,
          creditAmount: params.creditAmount,
          referredOrgName: params.referredOrgName,
          billingUrl: `${config.frontendUrl}/settings/billing`,
        }),
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, creditAmount: params.creditAmount },
          'Failed to send referral credit email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        { emailId: result.data?.id, to: params.to, creditAmount: params.creditAmount },
        'Referral credit email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, creditAmount: params.creditAmount },
        'Failed to send referral credit email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send member removed notification.
   */
  async sendMemberRemoved(params: { to: string; orgName: string }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendMemberRemoved');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `You have been removed from ${params.orgName}`,
        html: templates.memberRemovedEmail({
          appName: config.appName,
          orgName: params.orgName,
        }),
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, orgName: params.orgName },
          'Failed to send member removed email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        { emailId: result.data?.id, to: params.to, orgName: params.orgName },
        'Member removed email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, orgName: params.orgName },
        'Failed to send member removed email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send role changed notification.
   */
  async sendRoleChanged(params: {
    to: string;
    orgName: string;
    newRole: string;
  }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendRoleChanged');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: `Your role in ${params.orgName} has been updated`,
        html: templates.roleChangedEmail({
          appName: config.appName,
          orgName: params.orgName,
          newRole: params.newRole,
        }),
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, orgName: params.orgName, newRole: params.newRole },
          'Failed to send role changed email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        {
          emailId: result.data?.id,
          to: params.to,
          orgName: params.orgName,
          newRole: params.newRole,
        },
        'Role changed email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, orgName: params.orgName, newRole: params.newRole },
        'Failed to send role changed email'
      );
      return { success: false, error: String(error) };
    }
  },

  /**
   * Send a custom email with arbitrary subject and HTML content.
   */
  async sendCustomEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendResult> {
    if (!resend || !logger) {
      logger?.warn('Notifications not initialized, skipping sendCustomEmail');
      return { success: false, error: 'Not initialized' };
    }

    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (result.error) {
        logger.error(
          { error: result.error, to: params.to, subject: params.subject },
          'Failed to send custom email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        { emailId: result.data?.id, to: params.to, subject: params.subject },
        'Custom email sent'
      );
      return { success: true, id: result.data?.id };
    } catch (error) {
      logger.error(
        { error, to: params.to, subject: params.subject },
        'Failed to send custom email'
      );
      return { success: false, error: String(error) };
    }
  },
};

// Export template functions for testing/customization
export * as templates from './templates.js';

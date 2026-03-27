/**
 * Email HTML templates
 *
 * Simple, clean email templates for transactional emails.
 */

interface BaseTemplateParams {
  appName: string;
}

interface ButtonParams {
  url: string;
  text: string;
}

function baseTemplate(params: BaseTemplateParams & { content: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.appName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #000;
      color: #fff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #333;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
    .highlight {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  ${params.content}
  <div class="footer">
    <p>This email was sent by ${params.appName}. If you didn't expect this email, you can safely ignore it.</p>
  </div>
</body>
</html>
`.trim();
}

function button(params: ButtonParams): string {
  return `<a href="${params.url}" class="button">${params.text}</a>`;
}

// ==========================================
// Email Templates
// ==========================================

export function verificationEmail(params: { appName: string; url: string }): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Verify your email</h1>
      <p>Thanks for signing up for ${params.appName}! Please verify your email address by clicking the button below:</p>
      ${button({ url: params.url, text: 'Verify Email' })}
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

export function passwordResetEmail(params: { appName: string; url: string }): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Reset your password</h1>
      <p>We received a request to reset your password for your ${params.appName} account.</p>
      ${button({ url: params.url, text: 'Reset Password' })}
      <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
      <p>This link will expire in 1 hour.</p>
    `,
  });
}

export function invitationEmail(params: {
  appName: string;
  inviterName: string;
  orgName: string;
  url: string;
}): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>You're invited!</h1>
      <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.orgName}</strong> on ${params.appName}.</p>
      ${button({ url: params.url, text: 'Accept Invitation' })}
      <p>This invitation will expire in 48 hours.</p>
    `,
  });
}

export function trialEndingEmail(params: {
  appName: string;
  daysLeft: number;
  billingUrl: string;
}): string {
  const urgency = params.daysLeft <= 1 ? 'tomorrow' : `in ${params.daysLeft} days`;
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Your trial ends ${urgency}</h1>
      <p>Your free trial of ${params.appName} is ending soon. To continue using all features without interruption, please add a payment method.</p>
      <div class="highlight">
        <p><strong>What happens when your trial ends?</strong></p>
        <p>Your subscription will automatically start, and you'll be billed according to your selected plan.</p>
      </div>
      ${button({ url: params.billingUrl, text: 'Manage Subscription' })}
      <p>If you have any questions, just reply to this email.</p>
    `,
  });
}

export function paymentFailedEmail(params: { appName: string; invoiceUrl: string }): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Payment failed</h1>
      <p>We were unable to process your payment for ${params.appName}. Please update your payment method to avoid any interruption to your service.</p>
      ${button({ url: params.invoiceUrl, text: 'Update Payment Method' })}
      <p>If you believe this is an error, please contact our support team.</p>
    `,
  });
}

export function usageWarningEmail(params: {
  appName: string;
  metric: string;
  percentage: number;
  upgradeUrl: string;
}): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Usage limit approaching</h1>
      <p>Your ${params.metric} usage has reached <strong>${params.percentage}%</strong> of your plan limit.</p>
      <div class="highlight">
        <p>Consider upgrading your plan to avoid any disruption to your service.</p>
      </div>
      ${button({ url: params.upgradeUrl, text: 'Upgrade Plan' })}
    `,
  });
}

export function referralCreditEmail(params: {
  appName: string;
  creditAmount: number;
  referredOrgName: string;
  billingUrl: string;
}): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>You earned $${params.creditAmount} in referral credits!</h1>
      <p>Great news! <strong>${params.referredOrgName}</strong> just became a paying customer, and you've earned <strong>$${params.creditAmount}</strong> in credits.</p>
      <div class="highlight">
        <p>Your credits will be automatically applied to your next invoice.</p>
      </div>
      ${button({ url: params.billingUrl, text: 'View Billing' })}
      <p>Keep sharing your referral link to earn more credits!</p>
    `,
  });
}

export function memberRemovedEmail(params: { appName: string; orgName: string }): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Membership removed</h1>
      <p>You have been removed from <strong>${params.orgName}</strong> on ${params.appName}.</p>
      <p>If you believe this was a mistake, please contact the organization's administrator.</p>
    `,
  });
}

export function roleChangedEmail(params: {
  appName: string;
  orgName: string;
  newRole: string;
}): string {
  return baseTemplate({
    appName: params.appName,
    content: `
      <h1>Your role has been updated</h1>
      <p>Your role in <strong>${params.orgName}</strong> has been changed to <strong>${params.newRole}</strong>.</p>
      <p>If you have any questions about your new permissions, please contact your organization's administrator.</p>
    `,
  });
}

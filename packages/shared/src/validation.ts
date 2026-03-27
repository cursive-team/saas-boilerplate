import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

// ============================================
// User Schemas
// ============================================

export const updateDisplayNameSchema = z.object({
  name: nameSchema,
});

export const avatarPresignedUrlSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/, 'Invalid image type'),
  extension: z.string().regex(/^(jpg|jpeg|png|gif|webp)$/, 'Invalid file extension'),
});

export const avatarConfirmSchema = z.object({
  key: z.string().min(1, 'Key is required'),
});

// ============================================
// Billing Schemas
// ============================================

export const changePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().optional().default(false),
});

export const billingPortalSchema = z.object({
  returnUrl: z.string().url('Return URL must be a valid URL'),
});

// ============================================
// Organization Schemas
// ============================================

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member']).default('member'),
});

// ============================================
// Auth Schemas
// ============================================

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ============================================
// API Response Schemas
// ============================================

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// ============================================
// Type Exports
// ============================================

// User
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
export type AvatarPresignedUrlInput = z.infer<typeof avatarPresignedUrlSchema>;
export type AvatarConfirmInput = z.infer<typeof avatarConfirmSchema>;

// Billing
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type BillingPortalInput = z.infer<typeof billingPortalSchema>;

// Organization
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

// Auth
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

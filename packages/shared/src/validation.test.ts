import { describe, it, expect } from 'vitest';
import {
  updateDisplayNameSchema,
  avatarPresignedUrlSchema,
  avatarConfirmSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
  billingPortalSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
} from './validation.js';

// ============================================
// Common Schema Tests
// ============================================

describe('nameSchema', () => {
  it('accepts valid name', () => {
    const result = nameSchema.safeParse('John Doe');
    expect(result.success).toBe(true);
  });

  it('trims whitespace', () => {
    const result = nameSchema.safeParse('  John Doe  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('John Doe');
    }
  });

  it('rejects empty name', () => {
    const result = nameSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 characters', () => {
    const result = nameSchema.safeParse('a'.repeat(101));
    expect(result.success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid email', () => {
    const result = emailSchema.safeParse('test@example.com');
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = emailSchema.safeParse('not-an-email');
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts valid password', () => {
    const result = passwordSchema.safeParse('password123');
    expect(result.success).toBe(true);
  });

  it('rejects password under 8 characters', () => {
    const result = passwordSchema.safeParse('short');
    expect(result.success).toBe(false);
  });

  it('rejects password over 128 characters', () => {
    const result = passwordSchema.safeParse('a'.repeat(129));
    expect(result.success).toBe(false);
  });
});

// ============================================
// User Schema Tests
// ============================================

describe('updateDisplayNameSchema', () => {
  it('accepts valid name', () => {
    const result = updateDisplayNameSchema.safeParse({ name: 'John Doe' });
    expect(result.success).toBe(true);
  });

  it('trims whitespace', () => {
    const result = updateDisplayNameSchema.safeParse({ name: '  John Doe  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
    }
  });

  it('rejects empty name', () => {
    const result = updateDisplayNameSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 characters', () => {
    const result = updateDisplayNameSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('avatarPresignedUrlSchema', () => {
  it('accepts valid image types', () => {
    const validTypes = [
      { contentType: 'image/jpeg', extension: 'jpg' },
      { contentType: 'image/jpeg', extension: 'jpeg' },
      { contentType: 'image/png', extension: 'png' },
      { contentType: 'image/gif', extension: 'gif' },
      { contentType: 'image/webp', extension: 'webp' },
    ];

    for (const type of validTypes) {
      const result = avatarPresignedUrlSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid content types', () => {
    const result = avatarPresignedUrlSchema.safeParse({
      contentType: 'text/plain',
      extension: 'txt',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid extensions', () => {
    const result = avatarPresignedUrlSchema.safeParse({
      contentType: 'image/jpeg',
      extension: 'txt',
    });
    expect(result.success).toBe(false);
  });
});

describe('avatarConfirmSchema', () => {
  it('accepts valid key', () => {
    const result = avatarConfirmSchema.safeParse({
      key: 'avatars/user123/1234567890.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty key', () => {
    const result = avatarConfirmSchema.safeParse({ key: '' });
    expect(result.success).toBe(false);
  });
});

// ============================================
// Billing Schema Tests
// ============================================

describe('changePlanSchema', () => {
  it('accepts valid plan ID', () => {
    const result = changePlanSchema.safeParse({ planId: 'pro' });
    expect(result.success).toBe(true);
  });

  it('rejects empty plan ID', () => {
    const result = changePlanSchema.safeParse({ planId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing plan ID', () => {
    const result = changePlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('cancelSubscriptionSchema', () => {
  it('accepts immediately: true', () => {
    const result = cancelSubscriptionSchema.safeParse({ immediately: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.immediately).toBe(true);
    }
  });

  it('accepts immediately: false', () => {
    const result = cancelSubscriptionSchema.safeParse({ immediately: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.immediately).toBe(false);
    }
  });

  it('defaults to false when not provided', () => {
    const result = cancelSubscriptionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.immediately).toBe(false);
    }
  });
});

describe('billingPortalSchema', () => {
  it('accepts valid return URL', () => {
    const result = billingPortalSchema.safeParse({
      returnUrl: 'https://app.example.com/settings/billing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = billingPortalSchema.safeParse({
      returnUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing URL', () => {
    const result = billingPortalSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================
// Organization Schema Tests
// ============================================

describe('createOrganizationSchema', () => {
  it('accepts valid organization', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Company',
    });
    expect(result.success).toBe(true);
  });

  it('accepts organization with slug', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Company',
      slug: 'my-company',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name too short', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug format', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Company',
      slug: 'My Company',
    });
    expect(result.success).toBe(false);
  });

  it('accepts lowercase alphanumeric slug with hyphens', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Company',
      slug: 'my-company-123',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateOrganizationSchema', () => {
  it('accepts name update', () => {
    const result = updateOrganizationSchema.safeParse({
      name: 'New Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts slug update', () => {
    const result = updateOrganizationSchema.safeParse({
      slug: 'new-slug',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateOrganizationSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('inviteMemberSchema', () => {
  it('accepts valid invitation', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'new@example.com',
      role: 'member',
    });
    expect(result.success).toBe(true);
  });

  it('accepts admin role', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('defaults role to member', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'new@example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('member');
    }
  });

  it('rejects invalid role', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'new@example.com',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'not-an-email',
      role: 'member',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// Auth Schema Tests
// ============================================

describe('signUpSchema', () => {
  it('accepts valid signup data', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signUpSchema.safeParse({
      email: 'invalid',
      password: 'password123',
      name: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      name: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts valid signin data', () => {
    const result = signInSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'invalid',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid reset data', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      newPassword: 'newpassword123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('verifyEmailSchema', () => {
  it('accepts valid token', () => {
    const result = verifyEmailSchema.safeParse({
      token: 'verification-token-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = verifyEmailSchema.safeParse({
      token: '',
    });
    expect(result.success).toBe(false);
  });
});

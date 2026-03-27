/**
 * Typed API Client
 *
 * A fetch-based API client with automatic error handling, authentication,
 * and type safety for all API endpoints.
 */

import type {
  ApiErrorResponse,
  GetCurrentUserResponse,
  UpdateDisplayNameResponse,
  GetAvatarPresignedUrlResponse,
  ConfirmAvatarUploadResponse,
  DeleteAvatarResponse,
  GetConfigResponse,
  GetPlansResponse,
  GetSubscriptionResponse,
  BillingSetupResponse,
  ChangePlanResponse,
  ChangeIntervalResponse,
  CancelSubscriptionResponse,
  ResumeSubscriptionResponse,
  BillingPortalResponse,
  GetUsageResponse,
  GetReferralsResponse,
  ApplyReferralResponse,
  HealthCheckResponse,
} from '@project/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * API Error class for typed error handling
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly requestId?: string;
  public readonly trialExpired?: boolean;
  public readonly upgradeRequired?: boolean;
  public readonly currentPlan?: string;
  public readonly limit?: number;
  public readonly currentCount?: number;

  constructor(
    message: string,
    status: number,
    options?: {
      code?: string;
      requestId?: string;
      trialExpired?: boolean;
      upgradeRequired?: boolean;
      currentPlan?: string;
      limit?: number;
      currentCount?: number;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.requestId = options?.requestId;
    this.trialExpired = options?.trialExpired;
    this.upgradeRequired = options?.upgradeRequired;
    this.currentPlan = options?.currentPlan;
    this.limit = options?.limit;
    this.currentCount = options?.currentCount;
  }
}

/**
 * Check if an error indicates trial expiration
 */
export function isTrialExpiredError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.trialExpired === true;
}

/**
 * Check if an error indicates upgrade is required
 */
export function isUpgradeRequiredError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.upgradeRequired === true;
}

/**
 * Core fetch wrapper with error handling and credentials
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Check for trial expired header
  const trialExpired = response.headers.get('x-trial-expired') === 'true';

  // Handle non-OK responses
  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    throw new ApiError(errorData.error || 'Unknown error', response.status, {
      requestId: errorData.requestId,
      trialExpired:
        trialExpired || (errorData as unknown as { trialExpired?: boolean }).trialExpired,
      upgradeRequired: (errorData as unknown as { upgradeRequired?: boolean }).upgradeRequired,
      currentPlan: (errorData as unknown as { currentPlan?: string }).currentPlan,
      limit: (errorData as unknown as { limit?: number }).limit,
      currentCount: (errorData as unknown as { currentCount?: number }).currentCount,
    });
  }

  return response.json();
}

/**
 * GET request helper
 */
function get<T>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
function post<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
function patch<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
function del<T>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
}

// ============================================
// API Client
// ============================================

export const api = {
  // Health
  health: {
    check: () => get<HealthCheckResponse>('/health'),
  },

  // Config
  config: {
    get: () => get<GetConfigResponse>('/api/config'),
  },

  // Users
  users: {
    me: () => get<GetCurrentUserResponse>('/api/users/me'),
    updateDisplayName: (name: string) =>
      patch<UpdateDisplayNameResponse>('/api/users/me', { name }),
    getAvatarPresignedUrl: (contentType: string, extension: string) =>
      post<GetAvatarPresignedUrlResponse>('/api/users/me/avatar/presigned', {
        contentType,
        extension,
      }),
    confirmAvatarUpload: (key: string) =>
      post<ConfirmAvatarUploadResponse>('/api/users/me/avatar/confirm', { key }),
    deleteAvatar: () => del<DeleteAvatarResponse>('/api/users/me/avatar'),
  },

  // Billing
  billing: {
    getPlans: () => get<GetPlansResponse>('/api/billing/plans'),
    getSubscription: () => get<GetSubscriptionResponse>('/api/billing/subscription'),
    setup: (planId = 'starter', interval: 'monthly' | 'annual' = 'monthly') =>
      post<BillingSetupResponse>('/api/billing/setup', { planId, interval }),
    changePlan: (planId: string, interval?: 'monthly' | 'annual') =>
      post<ChangePlanResponse>('/api/billing/change-plan', { planId, interval }),
    changeInterval: (interval: 'monthly' | 'annual') =>
      post<ChangeIntervalResponse>('/api/billing/change-interval', { interval }),
    cancel: (immediately = false) =>
      post<CancelSubscriptionResponse>('/api/billing/cancel', { immediately }),
    resume: () => post<ResumeSubscriptionResponse>('/api/billing/resume'),
    portal: (returnUrl: string) =>
      post<BillingPortalResponse>('/api/billing/portal', { returnUrl }),
    getUsage: () => get<GetUsageResponse>('/api/billing/usage'),
    getReferrals: () => get<GetReferralsResponse>('/api/billing/referrals'),
    applyReferral: (referralCode: string) =>
      post<ApplyReferralResponse>('/api/billing/apply-referral', { referralCode }),
  },
};

// ============================================
// React Query helpers (optional)
// ============================================

/**
 * Create query key for React Query
 */
export const queryKeys = {
  user: ['user'] as const,
  config: ['config'] as const,
  plans: ['plans'] as const,
  subscription: ['subscription'] as const,
  usage: ['usage'] as const,
  referrals: ['referrals'] as const,
};

export default api;

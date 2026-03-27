/**
 * API Error Handling Utilities
 *
 * Centralized error handling for API responses including
 * trial expiration, upgrade requirements, and other common errors.
 */

import { ApiError } from './api';

/**
 * Error handling result with actionable information
 */
export interface ErrorHandlingResult {
  /** User-friendly error message to display */
  message: string;
  /** Whether the trial has expired */
  trialExpired: boolean;
  /** Whether an upgrade is required */
  upgradeRequired: boolean;
  /** Current plan (if upgrade required) */
  currentPlan?: string;
  /** The limit that was exceeded (if upgrade required) */
  limit?: number;
  /** The current count that exceeded the limit */
  currentCount?: number;
  /** Whether this is a network error */
  isNetworkError: boolean;
  /** Whether the user is unauthorized */
  isUnauthorized: boolean;
  /** Whether the resource was not found */
  isNotFound: boolean;
  /** The original error */
  originalError: unknown;
}

/**
 * Handle an API error and return structured information for UI
 */
export function handleApiError(error: unknown): ErrorHandlingResult {
  // Default result
  const result: ErrorHandlingResult = {
    message: 'An unexpected error occurred. Please try again.',
    trialExpired: false,
    upgradeRequired: false,
    isNetworkError: false,
    isUnauthorized: false,
    isNotFound: false,
    originalError: error,
  };

  // Handle network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    result.message = 'Unable to connect to the server. Please check your internet connection.';
    result.isNetworkError = true;
    return result;
  }

  // Handle API errors
  if (error instanceof ApiError) {
    const apiError = error;
    result.message = apiError.message;

    // Trial expired
    if (apiError.trialExpired) {
      result.trialExpired = true;
      result.message = 'Your trial has expired. Please add a payment method to continue.';
      return result;
    }

    // Upgrade required
    if (apiError.upgradeRequired) {
      result.upgradeRequired = true;
      result.currentPlan = apiError.currentPlan;
      result.limit = apiError.limit;
      result.currentCount = apiError.currentCount;
      return result;
    }

    // Unauthorized
    if (apiError.status === 401) {
      result.isUnauthorized = true;
      result.message = 'Your session has expired. Please sign in again.';
      return result;
    }

    // Not found
    if (apiError.status === 404) {
      result.isNotFound = true;
      result.message = 'The requested resource was not found.';
      return result;
    }

    // Validation errors (400)
    if (apiError.status === 400) {
      result.message = apiError.message || 'Invalid request. Please check your input.';
      return result;
    }

    // Server errors (500+)
    if (apiError.status >= 500) {
      result.message = 'A server error occurred. Please try again later.';
      return result;
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    result.message = error.message;
  }

  return result;
}

/**
 * Get a toast-friendly message from an error
 */
export function getErrorToastMessage(error: unknown): string {
  const result = handleApiError(error);
  return result.message;
}

/**
 * Check if error requires user to sign in
 */
export function requiresSignIn(error: unknown): boolean {
  return handleApiError(error).isUnauthorized;
}

/**
 * Check if error requires trial upgrade
 */
export function requiresTrialUpgrade(error: unknown): boolean {
  return handleApiError(error).trialExpired;
}

/**
 * Check if error requires plan upgrade
 */
export function requiresPlanUpgrade(error: unknown): boolean {
  return handleApiError(error).upgradeRequired;
}

/**
 * React hook-friendly error handler
 * Returns a function that handles errors and calls appropriate callbacks
 */
export function createErrorHandler(options: {
  onTrialExpired?: () => void;
  onUpgradeRequired?: (info: {
    currentPlan?: string;
    limit?: number;
    currentCount?: number;
  }) => void;
  onUnauthorized?: () => void;
  onError?: (message: string) => void;
}) {
  return (error: unknown) => {
    const result = handleApiError(error);

    if (result.trialExpired && options.onTrialExpired) {
      options.onTrialExpired();
      return result;
    }

    if (result.upgradeRequired && options.onUpgradeRequired) {
      options.onUpgradeRequired({
        currentPlan: result.currentPlan,
        limit: result.limit,
        currentCount: result.currentCount,
      });
      return result;
    }

    if (result.isUnauthorized && options.onUnauthorized) {
      options.onUnauthorized();
      return result;
    }

    if (options.onError) {
      options.onError(result.message);
    }

    return result;
  };
}

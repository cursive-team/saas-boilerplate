'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useSession } from '@/lib/auth-client';

/**
 * PostHog Analytics Provider with Session Replay
 *
 * Initializes PostHog client-side analytics with:
 * - Automatic page view tracking
 * - Session replay recording
 * - User identification when logged in
 *
 * Configure via environment variables:
 * - NEXT_PUBLIC_POSTHOG_KEY: PostHog project API key
 * - NEXT_PUBLIC_POSTHOG_HOST: PostHog instance URL (defaults to cloud)
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

/**
 * Initialize PostHog client.
 * Call this once at app startup.
 */
function initPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) {
    return false;
  }

  // Check if already initialized
  if (posthog.__loaded) {
    return true;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Session replay configuration
    session_recording: {
      // Record sessions
      recordCrossOriginIframes: true,
    },
    // Capture page views automatically
    capture_pageview: true,
    // Capture page leaves for better session data
    capture_pageleave: true,
    // Privacy settings
    mask_all_text: false, // Set to true to mask all text content
    mask_all_element_attributes: false, // Set to true to mask attributes
    // Performance
    loaded: (posthog) => {
      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development') {
        posthog.debug();
      }
    },
  });

  return true;
}

/**
 * PostHog Provider Component
 *
 * Wraps the app with PostHog context and handles initialization.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const enabled = initPostHog();
    setIsEnabled(enabled);
  }, []);

  // If PostHog is not configured, render children without provider
  if (!isEnabled || !POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/**
 * Component to identify the user when they log in.
 * Place this inside your app where auth context is available.
 */
export function PostHogUserIdentifier() {
  const { data: session } = useSession();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (!posthogClient) return;

    if (session?.user) {
      // Identify the user
      posthogClient.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    } else {
      // Reset identity on logout
      posthogClient.reset();
    }
  }, [session, posthogClient]);

  return null;
}

/**
 * Hook to access PostHog client.
 * Returns null if PostHog is not configured.
 */
export { usePostHog };

/**
 * Direct access to PostHog client for programmatic usage.
 * Will be undefined if not initialized.
 */
export { posthog };

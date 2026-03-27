import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [organizationClient()],
});

// Auth methods
export const { signIn, signUp, signOut, useSession } = authClient;

// Organization methods
export const { useActiveOrganization, useListOrganizations, useActiveMember } = authClient;
export const organization = authClient.organization;

/**
 * Sign in with Google OAuth
 */
export const signInGoogle = (callbackURL = '/dashboard') => {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL,
  });
};

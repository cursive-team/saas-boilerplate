/**
 * Server-Side Session Utilities
 *
 * Utilities for fetching session data on the server side in Next.js.
 * These are used in Server Components and API routes.
 */

import { cookies, headers } from 'next/headers';
import { prisma } from '@project/db';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Session data returned from the API
 */
export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
  };
  session: {
    id: string;
    activeOrganizationId: string | null;
    expiresAt: string;
  };
}

/**
 * Organization data returned from the API
 */
export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  planId: string;
  trialEndsAt: string | null;
}

/**
 * Member data returned from the API
 */
export interface MemberData {
  id: string;
  role: string;
  userId: string;
  organizationId: string;
}

/**
 * Full session with organization context
 */
export interface FullSession {
  user: SessionData['user'];
  session: SessionData['session'];
  organization: OrganizationData | null;
  member: MemberData | null;
}

/**
 * Get the session cookie value for forwarding to API
 */
async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  return sessionCookie?.value ?? null;
}

/**
 * Build headers for server-side API requests
 */
async function buildHeaders(): Promise<Record<string, string>> {
  const reqHeaders = await headers();
  const sessionCookie = await getSessionCookie();

  const headersObj: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward the session cookie
  if (sessionCookie) {
    headersObj['Cookie'] = `better-auth.session_token=${sessionCookie}`;
  }

  // Forward x-forwarded-for for proper IP logging
  const forwardedFor = reqHeaders.get('x-forwarded-for');
  if (forwardedFor) {
    headersObj['x-forwarded-for'] = forwardedFor;
  }

  return headersObj;
}

/**
 * Get the current session from the API (server-side)
 * Returns null if not authenticated
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const headers = await buildHeaders();
    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as SessionData;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Get the active organization for the current session (server-side)
 * Returns null if no organization is active
 */
export async function getActiveOrganization(): Promise<OrganizationData | null> {
  try {
    const headers = await buildHeaders();
    const response = await fetch(`${API_URL}/api/auth/organization/get-full-organization`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as OrganizationData;
  } catch (error) {
    console.error('Error fetching active organization:', error);
    return null;
  }
}

/**
 * Get member data for the current user in the active organization (server-side)
 */
async function getMemberData(
  userId: string,
  organizationId: string | null
): Promise<MemberData | null> {
  if (!organizationId) {
    return null;
  }

  try {
    const member = await prisma.member.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
      },
    });

    if (!member) {
      return null;
    }

    return {
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      role: member.role,
    };
  } catch (error) {
    console.error('Error fetching member data:', error);
    return null;
  }
}

/**
 * Get full session with organization context (server-side)
 * Combines session, user, organization, and member data
 */
export async function getFullSession(): Promise<FullSession | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const organization = await getActiveOrganization();
  const member = organization ? await getMemberData(session.user.id, organization.id) : null;

  return {
    user: session.user,
    session: session.session,
    organization,
    member,
  };
}

/**
 * Check if the current session's trial has expired (server-side)
 */
export async function isTrialExpired(): Promise<boolean> {
  const org = await getActiveOrganization();
  if (!org || !org.trialEndsAt) {
    return false;
  }

  const trialEnd = new Date(org.trialEndsAt);
  const now = new Date();

  // Check if trial plan and expired
  const isTrialPlan =
    org.planId.toLowerCase().includes('trial') || org.planId.toLowerCase() === 'starter';

  return isTrialPlan && trialEnd < now;
}

/**
 * Server-side redirect helper for unauthenticated users
 * Use in Server Components to redirect if not authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    // In Next.js App Router, we'd typically use redirect() here
    // but we'll throw to let the caller handle it
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}

/**
 * Server-side redirect helper for users without organization
 * Use in Server Components to redirect if no active organization
 */
export async function requireOrganization(): Promise<{
  session: SessionData;
  organization: OrganizationData;
}> {
  const session = await requireAuth();
  const organization = await getActiveOrganization();

  if (!organization) {
    throw new Error('NO_ORGANIZATION');
  }

  return { session, organization };
}

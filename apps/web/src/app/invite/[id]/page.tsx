'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, organization } from '@/lib/auth-client';
import { Button, Card, Alert, Spinner, useToast } from '@/components/ui';

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  organizationId: string;
  organizationName?: string;
  inviterName?: string;
  expiresAt: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const invitationId = params.id as string;
  const { data: session, isPending: sessionPending } = useSession();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    if (!invitationId) return;
    fetchInvitation();
  }, [invitationId]);

  async function fetchInvitation() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/organization/get-invitation?id=${invitationId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Invitation not found');
      }

      const data = await response.json();
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!invitation) return;

    setAccepting(true);
    setError(null);

    try {
      const result = await organization.acceptInvitation({
        invitationId: invitation.id,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to accept invitation');
      }

      setSuccess(true);
      toast('Invitation accepted! Welcome to the team.', 'success');

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!invitation) return;

    setAccepting(true);
    setError(null);

    try {
      const result = await organization.rejectInvitation({
        invitationId: invitation.id,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to reject invitation');
      }

      toast('Invitation declined.', 'info');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject invitation');
    } finally {
      setAccepting(false);
    }
  }

  // Loading state
  if (loading || sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Welcome to the team!</h2>
            <p className="mb-4 text-gray-600">
              You&apos;ve successfully joined {invitation?.organizationName || 'the organization'}.
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state (invitation not found or expired)
  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Invalid Invitation</h2>
            <p className="mb-6 text-gray-600">
              {error || 'This invitation link is invalid, has expired, or has already been used.'}
            </p>
            <Link href="/">
              <Button className="w-full">Go to Homepage</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Check if invitation is already accepted or expired
  if (invitation?.status !== 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Invitation {invitation?.status === 'accepted' ? 'Already Accepted' : 'Unavailable'}
            </h2>
            <p className="mb-6 text-gray-600">
              {invitation?.status === 'accepted'
                ? 'This invitation has already been accepted.'
                : 'This invitation is no longer available.'}
            </p>
            <Link href={session?.user ? '/dashboard' : '/'}>
              <Button className="w-full">
                {session?.user ? 'Go to Dashboard' : 'Go to Homepage'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  if (invitation && new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Invitation Expired</h2>
            <p className="mb-6 text-gray-600">
              This invitation has expired. Please contact the organization administrator for a new
              invitation.
            </p>
            <Link href="/">
              <Button className="w-full">Go to Homepage</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Not logged in - prompt to sign in or sign up
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">You&apos;re Invited!</h2>
            {invitation?.inviterName && (
              <p className="mb-2 text-gray-600">{invitation.inviterName} has invited you to join</p>
            )}
            <p className="mb-2 text-lg font-semibold text-primary-600">
              {invitation?.organizationName || 'an organization'}
            </p>
            <p className="mb-6 text-sm text-gray-500">
              as a <span className="font-medium">{invitation?.role}</span>
            </p>

            <p className="mb-6 text-gray-600">
              Please sign in or create an account to accept this invitation.
            </p>

            <div className="space-y-3">
              <Link href={`/login?redirect=/invite/${invitationId}`}>
                <Button className="w-full">Sign In</Button>
              </Link>
              <Link href={`/signup?redirect=/invite/${invitationId}`}>
                <Button variant="secondary" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Logged in - show invitation details and accept/reject buttons
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">You&apos;re Invited!</h2>
          {invitation?.inviterName && (
            <p className="mb-2 text-gray-600">{invitation.inviterName} has invited you to join</p>
          )}
          <p className="mb-2 text-lg font-semibold text-primary-600">
            {invitation?.organizationName || 'an organization'}
          </p>
          <p className="mb-6 text-sm text-gray-500">
            as a <span className="font-medium">{invitation?.role}</span>
          </p>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="space-y-3">
            <Button onClick={handleAccept} disabled={accepting} className="w-full">
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={accepting}
              variant="secondary"
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <p className="mt-6 text-xs text-gray-500">Signed in as {session.user.email}</p>
        </div>
      </Card>
    </div>
  );
}

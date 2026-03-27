'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, useActiveOrganization } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { AvatarUpload } from '@/components/avatar-upload';
import { DisplayNameEditor } from '@/components/display-name-editor';
import { Navbar } from '@/components/navbar';
import { Card, CardTitle } from '@/components/ui';
import type { UserPublic, GetCurrentUserResponse } from '@project/shared';

export default function DashboardPage(): React.ReactNode {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: activeOrg, isPending: orgPending } = useActiveOrganization();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingBilling, setCheckingBilling] = useState<boolean>(true);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
      return;
    }

    if (session?.user) {
      fetchUserData();
    }
  }, [session, isPending, router]);

  // Check if user needs to complete onboarding
  useEffect(() => {
    async function checkOnboarding() {
      if (orgPending) return;

      // If no organization, redirect to onboarding
      if (!activeOrg) {
        router.push('/onboarding');
        return;
      }

      // Check if billing is setup
      try {
        const response = await api.billing.getSubscription();
        if (!response.data?.stripeSubscriptionId) {
          // No subscription, redirect to onboarding
          router.push('/onboarding');
          return;
        }
      } catch {
        // If billing endpoint fails (no org context), redirect to onboarding
        router.push('/onboarding');
        return;
      }

      setCheckingBilling(false);
    }

    if (session?.user && !isPending) {
      checkOnboarding();
    }
  }, [session, isPending, activeOrg, orgPending, router]);

  async function fetchUserData(): Promise<void> {
    try {
      const apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res: Response = await fetch(`${apiUrl}/api/users/me`, {
        credentials: 'include',
      });

      if (res.ok) {
        const json: GetCurrentUserResponse = await res.json();
        setUser(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (isPending || loading || checkingBilling) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!session?.user || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user.name || user.email}!</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info Card */}
          <Card>
            <CardTitle className="mb-4">Account Information</CardTitle>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member since</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Profile Picture */}
          <AvatarUpload currentImage={user.image} userId={user.id} onUpdate={fetchUserData} />

          {/* Display Name Editor */}
          <DisplayNameEditor currentName={user.name} onUpdate={fetchUserData} />
        </div>
      </main>
    </div>
  );
}

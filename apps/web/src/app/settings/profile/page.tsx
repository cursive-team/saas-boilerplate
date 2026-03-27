'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { AvatarUpload } from '@/components/avatar-upload';
import { DisplayNameEditor } from '@/components/display-name-editor';
import { Card, CardTitle, CardDescription, Spinner } from '@/components/ui';
import type { UserPublic, GetCurrentUserResponse } from '@project/shared';

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  async function fetchUserData() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/users/me`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <p className="text-gray-600">Failed to load profile data.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
        <p className="mt-1 text-sm text-gray-600">Manage your personal account information</p>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardTitle className="mb-2">Account Information</CardTitle>
        <CardDescription className="mb-4">Basic information about your account</CardDescription>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
            <dd className="mt-1">
              {user.emailVerified ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  Not Verified
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Member Since</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Display Name Editor */}
      <DisplayNameEditor currentName={user.name} onUpdate={fetchUserData} />

      {/* Avatar Upload */}
      <AvatarUpload currentImage={user.image} userId={user.id} onUpdate={fetchUserData} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useActiveOrganization, useListOrganizations, organization } from '@/lib/auth-client';
import { Button, Input, Label, Card, Spinner, useToast } from '@/components/ui';

interface OrgSwitcherProps {
  onOrgChange?: () => void;
}

export function OrgSwitcher({ onOrgChange }: OrgSwitcherProps) {
  const { data: activeOrg, isPending: activeLoading } = useActiveOrganization();
  const { data: orgs, isPending: listLoading } = useListOrganizations();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const loading = activeLoading || listLoading;

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrg?.id) return;

    setSwitching(orgId);
    try {
      await organization.setActive({ organizationId: orgId });
      toast('Switched organization', 'success');
      onOrgChange?.();
    } catch {
      toast('Failed to switch organization', 'error');
    } finally {
      setSwitching(null);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    // Get referral code from session storage if present
    const referralCode = sessionStorage.getItem('referralCode');

    try {
      const result = await organization.create({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      });

      if (result.error) {
        toast(result.error.message || 'Failed to create organization', 'error');
        setCreating(false);
        return;
      }

      // If there's a referral code, apply it via the API
      if (referralCode && result.data?.id) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          await fetch(`${apiUrl}/api/billing/apply-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ referralCode }),
          });
        } catch {
          // Silently fail - referral is not critical
          console.warn('Failed to apply referral code');
        }
      }

      // Clear referral code
      sessionStorage.removeItem('referralCode');

      toast('Organization created!', 'success');
      setShowCreate(false);
      onOrgChange?.();
    } catch {
      toast('Failed to create organization', 'error');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (showCreate) {
    return (
      <Card className="w-full max-w-sm">
        <h3 className="mb-4 text-lg font-semibold">Create Organization</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="org-name" className="mb-1">
              Organization Name
            </Label>
            <Input
              id="org-name"
              name="name"
              type="text"
              required
              placeholder="My Company"
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {activeOrg && (
        <div className="mb-4 rounded-lg bg-primary-50 p-3">
          <p className="text-xs font-medium uppercase text-primary-600">Current Organization</p>
          <p className="text-lg font-semibold text-gray-900">{activeOrg.name}</p>
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Your Organizations</p>
          <div className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                disabled={switching === org.id || org.id === activeOrg?.id}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  org.id === activeOrg?.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{org.name}</span>
                  {switching === org.id && <Spinner size="sm" />}
                  {org.id === activeOrg?.id && (
                    <span className="text-xs font-medium text-primary-600">Active</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button onClick={() => setShowCreate(true)} variant="secondary" className="w-full">
        + Create New Organization
      </Button>
    </div>
  );
}

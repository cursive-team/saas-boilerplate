'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveOrganization, organization } from '@/lib/auth-client';
import {
  Card,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Alert,
  Spinner,
  useToast,
} from '@/components/ui';
import { RoleGate, AccessDenied } from '@/components/gates';

export default function OrganizationSettingsPage() {
  return (
    <RoleGate
      roles={['owner', 'admin']}
      fallback={<AccessDenied message="Only admins can manage organization settings." />}
    >
      <OrganizationSettingsContent />
    </RoleGate>
  );
}

function OrganizationSettingsContent() {
  const router = useRouter();
  const { data: activeOrg, isPending, refetch } = useActiveOrganization();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Type the org data loosely to avoid Better Auth type issues
  const orgId = activeOrg?.id;
  const orgName = activeOrg?.name;
  const orgSlug = activeOrg?.slug;
  const orgCreatedAt = activeOrg?.createdAt;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (activeOrg as any)?.members;
  const currentMember = members?.[0];
  const isOwner = currentMember?.role === 'owner';

  useEffect(() => {
    if (activeOrg) {
      setName(orgName || '');
      setSlug(orgSlug || '');
    }
  }, [activeOrg, orgName, orgSlug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await organization.update({
        data: {
          name: name.trim(),
          slug: slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-'),
        },
      });

      if (result.error) {
        toast(result.error.message || 'Failed to update organization', 'error');
        return;
      }

      toast('Organization updated!', 'success');
      refetch();
    } catch {
      toast('Failed to update organization', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== orgName) {
      toast('Please type the organization name to confirm', 'error');
      return;
    }

    if (!orgId) return;

    setDeleting(true);

    try {
      const result = await organization.delete({
        organizationId: orgId,
      });

      if (result.error) {
        toast(result.error.message || 'Failed to delete organization', 'error');
        setDeleting(false);
        return;
      }

      toast('Organization deleted', 'success');
      router.push('/dashboard');
    } catch {
      toast('Failed to delete organization', 'error');
      setDeleting(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <Card>
        <p className="text-gray-600">No organization selected.</p>
      </Card>
    );
  }

  const createdAtDate =
    orgCreatedAt instanceof Date ? orgCreatedAt : new Date(orgCreatedAt || Date.now());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Organization Settings</h2>
        <p className="mt-1 text-sm text-gray-600">Manage your organization details</p>
      </div>

      {/* Organization Details */}
      <Card>
        <CardTitle className="mb-2">Organization Details</CardTitle>
        <CardDescription className="mb-4">
          Basic information about your organization
        </CardDescription>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-1">
              Organization Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="slug" className="mb-1">
              Organization Slug
            </Label>
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="my-organization"
              required
              minLength={2}
              maxLength={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <Label className="mb-1">Created</Label>
            <p className="text-sm text-gray-900">
              {createdAtDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <Button type="submit" disabled={saving || (name === orgName && slug === orgSlug)}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      {/* Danger Zone - Only for Owners */}
      {isOwner && (
        <Card className="border-red-200">
          <CardTitle className="mb-2 text-red-600">Danger Zone</CardTitle>
          <CardDescription className="mb-4">
            Irreversible actions that affect your entire organization
          </CardDescription>

          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Deleting your organization will permanently remove all data, including team members,
                billing information, and any associated content. This action cannot be undone.
              </p>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Organization
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="error">
                This will permanently delete your organization and all associated data. This action
                cannot be undone.
              </Alert>

              <div>
                <Label htmlFor="confirm" className="mb-1">
                  Type <strong>{orgName}</strong> to confirm
                </Label>
                <Input
                  id="confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={orgName || ''}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmText !== orgName}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting...' : 'Delete Organization'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

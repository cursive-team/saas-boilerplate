'use client';

import { useState, useEffect } from 'react';
import { useActiveOrganization, organization } from '@/lib/auth-client';
import {
  Card,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Spinner,
  useToast,
} from '@/components/ui';
import { RoleGate, AccessDenied } from '@/components/gates';

export default function TeamSettingsPage() {
  return (
    <RoleGate
      roles={['owner', 'admin']}
      fallback={<AccessDenied message="Only admins can manage team members." />}
    >
      <TeamSettingsContent />
    </RoleGate>
  );
}

function TeamSettingsContent() {
  const { data: activeOrg, isPending } = useActiveOrganization();
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgMembers = (activeOrg as any)?.members;
  const currentMember = orgMembers?.[0];
  const isOwner = currentMember?.role === 'owner';

  useEffect(() => {
    if (activeOrg) {
      fetchTeamData();
    }
  }, [activeOrg]);

  async function fetchTeamData() {
    setLoading(true);
    try {
      // Fetch members
      const membersResult = await organization.listMembers();
      if (membersResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberData = membersResult.data as any;
        setMembers(memberData.members || []);
      }

      // Fetch pending invitations
      const invitationsResult = await organization.listInvitations();
      if (invitationsResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invData = invitationsResult.data as any[];
        setInvitations(invData.filter((i) => i.status === 'pending'));
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as 'admin' | 'member';

    try {
      const result = await organization.inviteMember({ email, role });

      if (result.error) {
        toast(result.error.message || 'Failed to send invitation', 'error');
        return;
      }

      toast('Invitation sent!', 'success');
      setShowInviteForm(false);
      fetchTeamData();
      (e.target as HTMLFormElement).reset();
    } catch {
      toast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: 'admin' | 'member') {
    try {
      const result = await organization.updateMemberRole({
        memberId,
        role: newRole,
      });

      if (result.error) {
        toast(result.error.message || 'Failed to update role', 'error');
        return;
      }

      toast('Role updated', 'success');
      fetchTeamData();
    } catch {
      toast('Failed to update role', 'error');
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const result = await organization.removeMember({ memberIdOrEmail: memberId });

      if (result.error) {
        toast(result.error.message || 'Failed to remove member', 'error');
        return;
      }

      toast('Member removed', 'success');
      fetchTeamData();
    } catch {
      toast('Failed to remove member', 'error');
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      const result = await organization.cancelInvitation({ invitationId });

      if (result.error) {
        toast(result.error.message || 'Failed to cancel invitation', 'error');
        return;
      }

      toast('Invitation canceled', 'success');
      fetchTeamData();
    } catch {
      toast('Failed to cancel invitation', 'error');
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="mt-1 text-sm text-gray-600">Manage who has access to your organization</p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          {showInviteForm ? 'Cancel' : 'Invite Member'}
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardTitle className="mb-4">Invite New Member</CardTitle>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <Label htmlFor="role" className="mb-1">
                Role
              </Label>
              <select
                id="role"
                name="role"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                defaultValue="member"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardTitle className="mb-2">Current Members</CardTitle>
        <CardDescription className="mb-4">
          {members.length} member{members.length !== 1 ? 's' : ''} in this organization
        </CardDescription>

        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {member.user?.image ? (
                    <img
                      src={member.user.image}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {(member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.user?.name || member.user?.email || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {member.role === 'owner' ? (
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
                    Owner
                  </span>
                ) : isOwner && member.userId !== currentMember?.userId ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as 'admin' | 'member')
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 capitalize">
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardTitle className="mb-2">Pending Invitations</CardTitle>
          <CardDescription className="mb-4">
            {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
          </CardDescription>

          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => {
              const expiresAt =
                invitation.expiresAt instanceof Date
                  ? invitation.expiresAt
                  : new Date(invitation.expiresAt);

              return (
                <div key={invitation.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited as {invitation.role} • Expires {expiresAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

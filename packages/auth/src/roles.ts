import type { Request, Response, NextFunction } from 'express';
import type { Member, MemberRole } from './types.js';

/**
 * Role checking utilities for authorization.
 *
 * Roles are tied to organization memberships, not users.
 * A user can have different roles in different organizations.
 */

/**
 * Check if member has a specific role
 */
export function hasRole(member: Member | null | undefined, role: MemberRole): boolean {
  return member?.role === role;
}

/**
 * Check if member has ANY of the specified roles
 */
export function hasAnyRole(member: Member | null | undefined, roles: MemberRole[]): boolean {
  if (!member || roles.length === 0) return false;
  return roles.includes(member.role);
}

/**
 * Check if member is an owner
 */
export function isOwner(member: Member | null | undefined): boolean {
  return hasRole(member, 'owner');
}

/**
 * Check if member is an admin (owner or admin role)
 */
export function isAdmin(member: Member | null | undefined): boolean {
  return hasAnyRole(member, ['owner', 'admin']);
}

/**
 * Express request with authenticated user and organization context
 */
interface OrgAuthenticatedRequest extends Request {
  member?: Member;
  organizationId?: string;
  requestId?: string;
}

/**
 * Express middleware factory for role-based access control.
 *
 * Use after requireOrgContext middleware to enforce role requirements.
 *
 * @example
 * ```typescript
 * router.get('/admin', requireOrgContext, requireRole('admin'), (req, res) => {
 *   res.json({ message: 'Admin only' });
 * });
 *
 * // Allow multiple roles (OR logic)
 * router.delete('/org', requireOrgContext, requireRole('owner'), (req, res) => {
 *   // Only owner can delete
 * });
 * ```
 */
export function requireRole(...roles: MemberRole[]) {
  return (req: OrgAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.member) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No organization context',
        requestId: req.requestId,
      });
      return;
    }

    if (!hasAnyRole(req.member, roles)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
}

/**
 * Create a role checker object for a member.
 * Useful in React components.
 *
 * @example
 * ```typescript
 * const roles = createRoleChecker(member);
 * if (roles.isAdmin()) {
 *   // show admin UI
 * }
 * ```
 */
export function createRoleChecker(member: Member | null | undefined) {
  return {
    role: member?.role ?? null,
    hasRole: (role: MemberRole) => hasRole(member, role),
    hasAnyRole: (roles: MemberRole[]) => hasAnyRole(member, roles),
    isOwner: () => isOwner(member),
    isAdmin: () => isAdmin(member),
    isMember: () => hasRole(member, 'member'),
  };
}

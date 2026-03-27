import type { AuthPayload } from '@/types';

/**
 * role-guards.ts
 * Centralized role-check helpers for the sub_admin feature.
 * Import these in API routes to keep role logic consistent.
 * DO NOT modify existing auth logic - only ADD new checks here.
 */

/** Returns true if the user is a full admin */
export function isAdmin(user: AuthPayload): boolean {
  return user.role === 'admin';
}

/** Returns true if the user is a sub_admin */
export function isSubAdmin(user: AuthPayload): boolean {
  return user.role === 'sub_admin' || user.role === 'manager';
}

/** Returns true if the user has elevated access (admin, sub_admin, or manager) */
export function isElevated(user: AuthPayload): boolean {
  return ['admin', 'sub_admin', 'manager'].includes(user.role);
}

/**
 * Builds a MongoDB employee filter scoped to the caller's role.
 *
 * - admin             => returns base filter (sees everyone)
 * - manager           => adds managerId constraint (team only)
 * - sub_admin         => adds officeZoneId constraint (team only)
 * - employee          => returns null (not allowed to query employees)
 *
 * @param user   Decoded JWT payload
 * @param base   Any extra filter conditions to merge in
 * @returns A filter object or null if the caller is not permitted
 */
export function buildEmployeeFilter(
  user: AuthPayload,
  base: Record<string, unknown> = {}
): Record<string, unknown> | null {
  if (user.role === 'employee') return null;

  if (user.role === 'manager') {
    return { ...base, managerId: user.id };
  }

  if (user.role === 'sub_admin') {
    if (!user.assignedTeamId) return null; // misconfigured sub_admin
    return { ...base, officeZoneId: user.assignedTeamId };
  }

  // admin - unrestricted
  return base;
}

/**
 * Verifies that a given employee (by their officeZoneId string)
 * belongs to the sub_admin's assigned team.
 * Always returns true for admin.
 */
export function canAccessEmployee(
  user: AuthPayload,
  employeeZoneId: string | null | undefined
): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return true; // enforced by managerId in queries
  if (!isSubAdmin(user)) return false;
  if (!user.assignedTeamId) return false;
  return String(employeeZoneId) === String(user.assignedTeamId);
}

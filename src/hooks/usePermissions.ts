/**
 * GemGym — RBAC Permissions Hook
 *
 * Provides a `hasPermission(name)` function derived from the current session.
 * Used throughout the app to conditionally render UI and guard actions.
 *
 * Usage:
 *   const { hasPermission } = usePermissions();
 *   if (hasPermission("members.create")) { ... }
 */

import { useMemo } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { PermissionName } from "@/types";

interface UsePermissionsReturn {
  /** Check if the current user has a specific permission */
  hasPermission: (name: PermissionName) => boolean;
  /** Check if the current user has ALL of the given permissions */
  hasAll: (names: PermissionName[]) => boolean;
  /** Check if the current user has ANY of the given permissions */
  hasAny: (names: PermissionName[]) => boolean;
  /** Full list of permission names for the current user */
  permissions: PermissionName[];
  /** True if the current user is an Admin */
  isAdmin: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { session } = useAuth();

  const permissions = useMemo<PermissionName[]>(() => {
    if (!session?.user.role?.permissions) return [];
    return session.user.role.permissions.map((p) => p.name as PermissionName);
  }, [session]);

  const permSet = useMemo(() => new Set(permissions), [permissions]);

  const isAdmin = session?.user.role?.name === "Admin";

  function hasPermission(name: PermissionName): boolean {
    // Admins have all permissions
    if (isAdmin) return true;
    return permSet.has(name);
  }

  function hasAll(names: PermissionName[]): boolean {
    return names.every((n) => hasPermission(n));
  }

  function hasAny(names: PermissionName[]): boolean {
    return names.some((n) => hasPermission(n));
  }

  return { hasPermission, hasAll, hasAny, permissions, isAdmin };
}

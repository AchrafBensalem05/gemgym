/**
 * GemGym — Users Management Tauri Commands (TypeScript layer)
 *
 * Typed wrappers around the Tauri IPC bridge for user/role management.
 * These functions are consumed by React Query hooks.
 */

import { tauriInvoke, Commands } from "@/lib/tauri";
import type { User, Role } from "@/types";

/* ── Users ── */

export interface CreateUserPayload {
  username: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserPayload {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

export const usersService = {
  list: () =>
    tauriInvoke<User[]>(Commands.USERS_LIST),

  create: (payload: CreateUserPayload) =>
    tauriInvoke<User>(Commands.USERS_CREATE, { payload }),

  update: (payload: UpdateUserPayload) =>
    tauriInvoke<User>(Commands.USERS_UPDATE, { payload }),
};

/* ── Roles ── */

export const rolesService = {
  list: () =>
    tauriInvoke<Role[]>(Commands.ROLES_LIST),
};

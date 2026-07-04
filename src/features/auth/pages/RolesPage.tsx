/**
 * GemGym — Roles & Permissions Page
 *
 * Displays all system roles with their permission counts.
 * Shows a permission matrix for each role on expansion.
 * Guarded: only Admins can access this page.
 */

import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { useState } from "react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface RoleRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  permissionCount: number;
}

/* ── Permission category groupings ── */

const PERM_GROUPS: Record<string, string[]> = {
  Members:       ["members.view", "members.create", "members.edit", "members.delete"],
  Subscriptions: ["subscriptions.view", "subscriptions.create", "subscriptions.edit"],
  Attendance:    ["attendance.view", "attendance.checkin"],
  Finance:       ["payments.view", "payments.create", "expenses.view", "expenses.create"],
  Commerce:      ["inventory.view", "inventory.manage", "pos.access"],
  Reports:       ["reports.view"],
  System:        ["settings.view", "settings.edit", "audit.view", "hardware.manage", "backup.manage", "license.manage", "roles.manage", "users.manage"],
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: Object.values(PERM_GROUPS).flat(),
  Manager: [
    "members.view", "members.create", "members.edit",
    "subscriptions.view", "subscriptions.create", "subscriptions.edit",
    "attendance.view", "attendance.checkin",
    "payments.view", "payments.create",
    "expenses.view", "expenses.create",
    "inventory.view", "inventory.manage", "pos.access",
    "reports.view", "settings.view",
  ],
  Staff: [
    "members.view", "subscriptions.view",
    "attendance.view", "attendance.checkin",
    "payments.view", "payments.create", "pos.access",
  ],
};

const ROLE_COLORS: Record<string, string> = {
  Admin:   "badge-primary",
  Manager: "badge-info",
  Staff:   "badge-neutral",
};

/* ── Component ── */

export function RolesPage() {
  const { isAdmin } = usePermissions();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => tauriInvoke<RoleRow[]>(Commands.ROLES_LIST),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
        <Lock size={32} className="opacity-40" />
        <p className="text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-[oklch(0.57_0.28_270)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
          <Shield size={18} className="text-[oklch(0.77_0.19_270)]" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Roles & Permissions</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{roles.length} roles defined</p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="space-y-3">
        {roles.map((role) => {
          const isOpen = expanded === role.id;
          const rolePerms = ROLE_PERMISSIONS[role.name] ?? [];

          return (
            <Card key={role.id} variant="default">
              {/* Role Header Row */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isOpen ? null : role.id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("badge", ROLE_COLORS[role.name] ?? "badge-neutral")}>
                    {role.name}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {role.description}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {role.permissionCount} permissions
                  </span>
                  {isOpen
                    ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
                    : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                  }
                </div>
              </button>

              {/* Permission Matrix */}
              {isOpen && (
                <div className="border-t border-[var(--color-border-subtle)] px-5 pb-5 pt-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(PERM_GROUPS).map(([group, perms]) => (
                      <div key={group}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                          {group}
                        </p>
                        <div className="space-y-1">
                          {perms.map((perm) => {
                            const granted = rolePerms.includes(perm);
                            return (
                              <div key={perm} className="flex items-center gap-2">
                                <div className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center text-[9px] shrink-0",
                                  granted
                                    ? "bg-[oklch(0.70_0.18_148)/0.15] text-[oklch(0.70_0.18_148)]"
                                    : "bg-white/[0.04] text-[var(--color-text-muted)]"
                                )}>
                                  {granted ? "✓" : "✗"}
                                </div>
                                <span className={cn(
                                  "text-xs",
                                  granted ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)] line-through opacity-50"
                                )}>
                                  {perm.split(".")[1]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

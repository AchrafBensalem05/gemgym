/**
 * GemGym — Users Management Page
 *
 * Full CRUD for system users:
 * - DataTable with role filter and search
 * - Create user dialog (React Hook Form + Zod)
 * - Edit user dialog
 * - Guarded: requires users.manage permission
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, Lock } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/Dialog";
import { createUserSchema, type CreateUserFormData } from "@/features/auth/validation/schemas";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface UserRow {
  id: string;
  username: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  createdAt: string;
  updatedAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

const ROLE_BADGE: Record<string, string> = {
  Admin:   "badge-primary",
  Manager: "badge-info",
  Staff:   "badge-neutral",
};

/* ── Create User Dialog ── */

function CreateUserDialog({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: RoleOption[];
}) {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreateUserFormData) =>
      tauriInvoke<UserRow>(Commands.USERS_CREATE, { payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", name: "", email: "", password: "", roleId: "" },
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(async (data) => {
            await mutateAsync(data);
          })}
          noValidate
        >
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register("name")}
                label="Full Name"
                placeholder="John Smith"
                error={errors.name?.message}
              />
              <Input
                {...register("username")}
                label="Username"
                placeholder="jsmith"
                error={errors.username?.message}
              />
            </div>
            <Input
              {...register("email")}
              label="Email"
              type="email"
              placeholder="john@gym.com"
              error={errors.email?.message}
              helperText="Optional"
            />
            <Input
              {...register("password")}
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
            />
            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Role
              </label>
              <select
                {...register("roleId")}
                className="input-base"
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.roleId && (
                <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.roleId.message}</p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export function UsersPage() {
  const { hasPermission } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const canManage = hasPermission("users.manage");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => tauriInvoke<UserRow[]>(Commands.USERS_LIST),
    enabled: canManage,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const list = await tauriInvoke<Array<{ id: string; name: string }>>(Commands.ROLES_LIST);
      return list;
    },
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
        <Lock size={32} className="opacity-40" />
        <p className="text-sm">You don't have permission to manage users.</p>
      </div>
    );
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{row.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (val) => (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {String(val) || "—"}
        </span>
      ),
    },
    {
      key: "roleName",
      header: "Role",
      sortable: true,
      render: (val) => {
        const role = String(val);
        return (
          <span className={cn("badge", ROLE_BADGE[role] ?? "badge-neutral")}>
            {role}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(String(val)).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
            <Users size={18} className="text-[oklch(0.77_0.19_270)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Users</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{users.length} system users</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          New User
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={users as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search users..."
        page={page}
        pageSize={15}
        onPageChange={setPage}
        emptyMessage="No users found"
        emptyIcon={<Users />}
      />

      {/* Create Dialog */}
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
      />
    </div>
  );
}

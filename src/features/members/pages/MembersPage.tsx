/**
 * GemGym — Members Page
 *
 * Full member management:
 * - Server-side paginated & searchable DataTable
 * - Status filter tabs (All / Active / Inactive / Expired)
 * - Create member dialog
 * - Edit member dialog
 * - Soft-delete with confirmation
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, Camera } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MemberStatusBadge } from "@/components/ui/Badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import type { MemberStatus } from "@/types";
import { FaceRegistrationDialog } from "@/features/hardware/components/FaceRegistrationDialog";

/* ── Types ── */

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  joinedDate: string;
  status: MemberStatus;
  planName: string | null;
  subscriptionEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemberListResult {
  data: MemberRow[];
  total: number;
}

/* ── Validation ── */

const memberSchema = z.object({
  firstName:   z.string().min(2, "Required"),
  lastName:    z.string().min(2, "Required"),
  email:       z.string().email("Invalid email").or(z.literal("")).optional(),
  phone:       z.string().optional(),
  dateOfBirth: z.string().optional(),
  status:      z.string().optional(),
});
type MemberFormData = z.infer<typeof memberSchema>;

/* ── Status Tabs ── */

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All",      value: "all" },
  { label: "Active",   value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended",value: "suspended" },
  { label: "Expired",  value: "expired" },
];

/* ── Member Form Dialog ── */

function MemberDialog({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: MemberRow;
}) {
  const qc = useQueryClient();
  const isEdit = Boolean(member);

  const createMutation = useMutation({
    mutationFn: (payload: MemberFormData) =>
      tauriInvoke<MemberRow>(Commands.MEMBERS_CREATE, { payload: {
        firstName: payload.firstName,
        lastName:  payload.lastName,
        email:     payload.email || null,
        phone:     payload.phone || null,
        dateOfBirth: payload.dateOfBirth || null,
      }}),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["members"] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: MemberFormData) =>
      tauriInvoke<MemberRow>(Commands.MEMBERS_UPDATE, { payload: {
        id:          member!.id,
        firstName:   payload.firstName,
        lastName:    payload.lastName,
        email:       payload.email || null,
        phone:       payload.phone || null,
        dateOfBirth: payload.dateOfBirth || null,
        status:      payload.status ?? member!.status,
      }}),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["members"] }); onClose(); },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? { firstName: member.firstName, lastName: member.lastName,
          email: member.email ?? "", phone: member.phone ?? "",
          dateOfBirth: member.dateOfBirth ?? "", status: member.status }
      : { firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "" },
  });

  function handleClose() { reset(); onClose(); }

  const error = mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "New Member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => void mutation.mutateAsync(d))} noValidate>
          <DialogBody className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[oklch(0.55_0.24_22)/0.3]">
                <p className="text-xs text-[oklch(0.65_0.24_22)]">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input {...register("firstName")} label="First Name" placeholder="John" error={errors.firstName?.message} />
              <Input {...register("lastName")}  label="Last Name"  placeholder="Smith" error={errors.lastName?.message} />
            </div>
            <Input {...register("email")}       label="Email"         type="email" placeholder="john@example.com" error={errors.email?.message} helperText="Optional" />
            <Input {...register("phone")}       label="Phone"         placeholder="+1 234 567 8900" helperText="Optional" />
            <Input {...register("dateOfBirth")} label="Date of Birth" type="date" helperText="Optional" />

            {/* Status selector — only shown when editing */}
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Status</label>
                <select {...register("status")} className="input-base">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" type="submit" isLoading={mutation.isPending}>
              {isEdit ? "Save Changes" : "Create Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete Confirmation ── */

function DeleteDialog({ open, onClose, member, onConfirm, isLoading }: {
  open: boolean; onClose: () => void; member?: MemberRow; onConfirm: () => void; isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Remove Member</DialogTitle></DialogHeader>
        <DialogBody>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to deactivate <span className="font-semibold text-[var(--color-text-primary)]">
              {member?.firstName} {member?.lastName}
            </span>? This will set their status to inactive.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} isLoading={isLoading}>Deactivate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export function MembersPage() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editMember, setEditMember] = useState<MemberRow | undefined>();
  const [deleteMember, setDeleteMember] = useState<MemberRow | undefined>();
  const [faceRegisterMember, setFaceRegisterMember] = useState<MemberRow | undefined>();

  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["members", page, search, status],
    queryFn: () =>
      tauriInvoke<MemberListResult>(Commands.MEMBERS_LIST, {
        params: { page, pageSize: PAGE_SIZE, search: search || null, status },
      }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tauriInvoke<void>(Commands.MEMBERS_DELETE, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members"] });
      setDeleteMember(undefined);
    },
  });

  const columns: Column<MemberRow>[] = [
    {
      key: "firstName",
      header: "Member",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
            {row.firstName.charAt(0)}{row.lastName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{row.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (val) => <span className="text-sm text-[var(--color-text-secondary)]">{String(val ?? "—")}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (val) => <MemberStatusBadge status={val as MemberStatus} />,
    },
    {
      key: "planName",
      header: "Plan",
      render: (val, row) => (
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">{String(val ?? "No plan")}</p>
          {row.subscriptionEnd && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Exp: {new Date(row.subscriptionEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "joinedDate",
      header: "Joined",
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(String(val)).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      cellClassName: "w-20",
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => setFaceRegisterMember(row)} aria-label="Register Face"
            className="text-[oklch(0.50_0.27_270)] hover:bg-[oklch(0.50_0.27_270)/0.08]">
            <Camera size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditMember(row)} aria-label="Edit">
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteMember(row)} aria-label="Remove"
            className="text-[oklch(0.65_0.24_22)] hover:bg-[rgba(239,68,68,0.08)]">
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
            <Users size={18} className="text-[oklch(0.77_0.19_270)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Members</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {data?.total ?? 0} total members
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          New Member
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg-elevated)] w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              status === tab.value
                ? "bg-[oklch(0.50_0.27_270)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search by name or email..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        total={data?.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyMessage={search ? `No members matching "${search}"` : "No members yet — add your first member!"}
        emptyIcon={<Users />}
      />

      {/* Dialogs */}
      <MemberDialog open={createOpen}            onClose={() => setCreateOpen(false)} />
      <MemberDialog open={Boolean(editMember)}   onClose={() => setEditMember(undefined)} member={editMember} />
      <DeleteDialog
        open={Boolean(deleteMember)}
        onClose={() => setDeleteMember(undefined)}
        member={deleteMember}
        onConfirm={() => deleteMutation.mutate(deleteMember!.id)}
        isLoading={deleteMutation.isPending}
      />
      {faceRegisterMember && (
        <FaceRegistrationDialog
          memberId={faceRegisterMember.id}
          open={Boolean(faceRegisterMember)}
          onClose={() => setFaceRegisterMember(undefined)}
          onSuccess={() => void qc.invalidateQueries({ queryKey: ["members"] })}
        />
      )}
    </div>
  );
}

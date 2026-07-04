/**
 * GemGym — Subscriptions Page
 *
 * Full CRUD for subscriptions:
 * - DataTable with status filtering
 * - Assign subscription dialog (select member, plan, start date)
 * - Cancel subscription action
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CreditCard, Ban } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/Dialog";
import { SubscriptionStatusBadge } from "@/components/ui/Badge";
import type { SubscriptionStatus } from "@/types";

/* ── Types & Validation ── */

interface SubscriptionRow {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  pricePaid: number;
  createdAt: string;
}

const createSubSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  planId: z.string().min(1, "Please select a plan"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "other"]),
});

type CreateSubFormData = z.infer<typeof createSubSchema>;

/* ── Assign Subscription Dialog ── */

function AssignSubDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Fetch lookups
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await tauriInvoke<{ data: Array<{ id: string; firstName: string; lastName: string; status: string }> }>(Commands.MEMBERS_LIST, { params: { pageSize: 1000 } });
      return res.data;
    },
    enabled: open,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => tauriInvoke<Array<{ id: string; name: string; price: number; durationMonths: number; isActive: boolean }>>(Commands.PLANS_LIST),
    enabled: open,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreateSubFormData) => tauriInvoke<SubscriptionRow>(Commands.SUBSCRIPTIONS_CREATE, { payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // Refresh revenue stats
      onClose();
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSubFormData>({
    resolver: zodResolver(createSubSchema) as any,
    defaultValues: { 
      startDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const activePlans = plans.filter(p => p.isActive);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Assign Subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutateAsync(data as CreateSubFormData))} noValidate>
          <DialogBody className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Member
              </label>
              <select {...register("memberId")} className="input-base">
                <option value="">Select a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} {m.status !== 'active' ? `(${m.status})` : ""}
                  </option>
                ))}
              </select>
              {errors.memberId && <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.memberId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Membership Plan
              </label>
              <select {...register("planId")} className="input-base">
                <option value="">Select a plan...</option>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price} ({p.durationMonths} Months)
                  </option>
                ))}
              </select>
              {errors.planId && <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.planId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register("startDate")}
                label="Start Date"
                type="date"
                error={errors.startDate?.message}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Payment Method
                </label>
                <select {...register("paymentMethod")} className="input-base">
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
                {errors.paymentMethod && <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.paymentMethod.message}</p>}
              </div>
            </div>

          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
              Assign Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export function SubscriptionsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => tauriInvoke<SubscriptionRow[]>(Commands.SUBSCRIPTIONS_LIST),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => tauriInvoke(Commands.SUBSCRIPTIONS_CANCEL, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
    }
  });

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this subscription? The member will lose access.")) {
      await cancelMutation.mutateAsync(id);
    }
  };

  const columns: Column<SubscriptionRow>[] = [
    {
      key: "memberName",
      header: "Member",
      sortable: true,
      render: (_, row) => (
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {row.memberName}
        </span>
      ),
    },
    {
      key: "planName",
      header: "Plan",
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {row.planName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (val) => <SubscriptionStatusBadge status={val as SubscriptionStatus} />,
    },
    {
      key: "startDate",
      header: "Duration",
      render: (_, row) => (
        <div className="text-xs text-[var(--color-text-secondary)]">
          <p>{row.startDate} <span className="text-[var(--color-text-muted)] opacity-50">to</span></p>
          <p className="font-medium text-[var(--color-text-primary)]">{row.endDate}</p>
        </div>
      ),
    },
    {
      key: "pricePaid",
      header: "Price",
      sortable: true,
      render: (val) => (
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          ${Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          {row.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Ban size={14} />}
              onClick={() => void handleCancel(row.id)}
              className="hover:bg-[rgba(239,68,68,0.1)] hover:text-[oklch(0.65_0.24_22)] hover:border-[oklch(0.65_0.24_22)/0.3]"
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
            <CreditCard size={18} className="text-[oklch(0.77_0.19_270)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Subscriptions</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{subscriptions.length} active assignments</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          Assign Plan
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={subscriptions as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search members or plans..."
        page={page}
        pageSize={15}
        onPageChange={setPage}
        emptyMessage="No subscriptions found"
        emptyIcon={<CreditCard />}
      />

      {/* Dialog */}
      <AssignSubDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

/**
 * GemGym — Payments Page
 *
 * View and record manual payments for members.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, Plus } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/Dialog";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import type { PaymentStatus } from "@/types";

/* ── Types & Validation ── */

interface PaymentRow {
  id: string;
  memberId: string;
  memberName: string;
  subscriptionId?: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

const createPaymentSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  amount: z.coerce.number().min(0.01, "Must be greater than 0"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "other"]),
  transactionId: z.string().optional(),
});

type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;

/* ── Record Payment Dialog ── */

function RecordPaymentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Fetch members for lookup
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await tauriInvoke<{ data: Array<{ id: string; firstName: string; lastName: string }> }>(Commands.MEMBERS_LIST, { params: { pageSize: 1000 } });
      return res.data;
    },
    enabled: open,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreatePaymentFormData) => tauriInvoke<PaymentRow>(Commands.PAYMENTS_CREATE, { payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // Refresh revenue stats
      onClose();
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePaymentFormData>({
    resolver: zodResolver(createPaymentSchema) as any,
    defaultValues: { paymentMethod: "cash", amount: 0 },
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutateAsync(data as CreatePaymentFormData))} noValidate>
          <DialogBody className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Member
              </label>
              <select {...register("memberId")} className="input-base">
                <option value="">Select a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
              {errors.memberId && <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.memberId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register("amount")}
                label="Amount ($)"
                type="number"
                step="0.01"
                min={0}
                error={errors.amount?.message}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Method
                </label>
                <select {...register("paymentMethod")} className="input-base">
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <Input
              {...register("transactionId")}
              label="Transaction ID (Optional)"
              placeholder="e.g. Card receipt number"
              error={errors.transactionId?.message}
            />

          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export function PaymentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => tauriInvoke<PaymentRow[]>(Commands.PAYMENTS_LIST),
  });

  const columns: Column<PaymentRow>[] = [
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
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (val) => (
        <span className="text-sm font-bold text-[oklch(0.70_0.18_148)]">
          ${Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (val) => (
        <span className="text-sm text-[var(--color-text-secondary)] capitalize">
          {String(val).replace("_", " ")}
        </span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Status",
      render: (val) => <PaymentStatusBadge status={val as PaymentStatus} />,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {new Date(String(val)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "transactionId",
      header: "Ref",
      render: (val) => (
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
          {val ? String(val) : "—"}
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
            <DollarSign size={18} className="text-[oklch(0.70_0.18_148)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Payments</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{payments.length} transactions recorded</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          Record Payment
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={payments as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search payments or references..."
        page={page}
        pageSize={15}
        onPageChange={setPage}
        emptyMessage="No payments found"
        emptyIcon={<DollarSign />}
      />

      {/* Dialog */}
      <RecordPaymentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

/**
 * GemGym — Membership Plans Page
 *
 * Full CRUD for membership plans:
 * - Pricing cards layout (vibrant aesthetics)
 * - Create plan dialog (React Hook Form + Zod)
 * - Edit plan dialog
 * - Guarded: requires plans.manage permission
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, LayoutGrid, Lock, Edit2, CheckCircle2, Clock } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/Dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

/* ── Types & Validation ── */

interface PlanRow {
  id: string;
  name: string;
  description: string;
  durationMonths: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  durationMonths: z.coerce.number().min(1, "Must be at least 1 month"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  isActive: z.boolean().default(true),
});

type PlanFormData = z.infer<typeof planSchema>;

/* ── Create / Edit Dialog ── */

function PlanDialog({
  open,
  onClose,
  planToEdit,
}: {
  open: boolean;
  onClose: () => void;
  planToEdit?: PlanRow | null;
}) {
  const qc = useQueryClient();
  const isEditing = !!planToEdit;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: PlanFormData) =>
      isEditing
        ? tauriInvoke<PlanRow>(Commands.PLANS_UPDATE, { payload: { id: planToEdit.id, ...payload } })
        : tauriInvoke<PlanRow>(Commands.PLANS_CREATE, { payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: { 
      name: "", 
      description: "", 
      durationMonths: 1, 
      price: 0, 
      isActive: true 
    },
    values: planToEdit ? {
      name: planToEdit.name,
      description: planToEdit.description,
      durationMonths: planToEdit.durationMonths,
      price: planToEdit.price,
      isActive: planToEdit.isActive,
    } : undefined,
  });

  function handleClose() {
    if (!isEditing) reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutateAsync(data as PlanFormData))} noValidate>
          <DialogBody className="space-y-4">
            <Input
              {...register("name")}
              label="Plan Name"
              placeholder="e.g. Annual Premium"
              error={errors.name?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register("durationMonths")}
                label="Duration (Months)"
                type="number"
                min={1}
                error={errors.durationMonths?.message}
              />
              <Input
                {...register("price")}
                label="Price ($)"
                type="number"
                step="0.01"
                min={0}
                error={errors.price?.message}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Description
              </label>
              <textarea
                {...register("description")}
                className="input-base min-h-[80px] py-2 resize-none"
                placeholder="Features included in this plan..."
              />
              {errors.description && (
                <p className="text-xs text-[oklch(0.65_0.24_22)]">{errors.description.message}</p>
              )}
            </div>
            {isEditing && (
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" {...register("isActive")} className="accent-[oklch(0.77_0.19_270)] w-4 h-4" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Active (Available for sale)</span>
              </label>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
              {isEditing ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export function PlansPage() {
  const { isAdmin } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);

  // Allow admins for now. We can add a generic "manage.plans" permission later.
  const canManage = isAdmin;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => tauriInvoke<PlanRow[]>(Commands.PLANS_LIST),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
        <Lock size={32} className="opacity-40" />
        <p className="text-sm">You don't have permission to manage plans.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
            <LayoutGrid size={18} className="text-[oklch(0.77_0.19_270)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Membership Plans</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{plans.length} total plans</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => {
            setEditingPlan(null);
            setCreateOpen(true);
          }}
        >
          New Plan
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--color-border-subtle)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative group p-6 rounded-2xl border transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-xl",
              plan.isActive 
                ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] hover:border-[oklch(0.77_0.19_270)/0.5]" 
                : "bg-transparent border-[var(--color-border-subtle)] border-dashed opacity-75 grayscale"
            )}
          >
            {/* Action button */}
            <button
              onClick={() => {
                setEditingPlan(plan);
                setCreateOpen(true);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-[oklch(0.77_0.19_270)/0.2] hover:text-[oklch(0.77_0.19_270)] transition-all"
            >
              <Edit2 size={14} />
            </button>

            {/* Price */}
            <div className="mb-6">
              {!plan.isActive && <Badge className="mb-3">INACTIVE</Badge>}
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
                  ${plan.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Clock size={16} className="text-[oklch(0.77_0.19_270)]" />
                <span>Duration: <strong className="text-[var(--color-text-primary)]">{plan.durationMonths} Months</strong></span>
              </div>
              {plan.description && (
                <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle2 size={16} className="text-[oklch(0.70_0.18_148)] shrink-0 mt-0.5" />
                  <span className="line-clamp-3 leading-relaxed">{plan.description}</span>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      {plans.length === 0 && !isLoading && (
        <div className="text-center py-20 border border-[var(--color-border-subtle)] border-dashed rounded-xl bg-black/10">
          <LayoutGrid size={48} className="mx-auto text-[var(--color-text-muted)] opacity-50 mb-4" />
          <p className="text-[var(--color-text-primary)] font-medium">No plans created yet</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Create your first membership plan to start selling.</p>
        </div>
      )}

      {/* Dialog */}
      <PlanDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        planToEdit={editingPlan}
      />
    </div>
  );
}

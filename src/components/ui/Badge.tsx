/**
 * GemGym — Badge Component
 *
 * Status/category labels. Variants match the global CSS badge classes.
 */

import { cn } from "@/lib/utils";
import type { MemberStatus, SubscriptionStatus, PaymentStatus, HardwareStatus } from "@/types";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "primary" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot = false }: BadgeProps) {
  return (
    <span className={cn("badge", `badge-${variant}`, className)}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/* ── Domain-specific badge helpers ── */

const memberStatusVariant: Record<MemberStatus, BadgeVariant> = {
  active:    "success",
  inactive:  "neutral",
  suspended: "warning",
  expired:   "danger",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant={memberStatusVariant[status]} dot>
      {status}
    </Badge>
  );
}

const subscriptionStatusVariant: Record<SubscriptionStatus, BadgeVariant> = {
  active:    "success",
  expired:   "danger",
  cancelled: "neutral",
  pending:   "warning",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant={subscriptionStatusVariant[status]} dot>
      {status}
    </Badge>
  );
}

const paymentStatusVariant: Record<PaymentStatus, BadgeVariant> = {
  completed: "success",
  pending:   "warning",
  failed:    "danger",
  refunded:  "info",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={paymentStatusVariant[status]} dot>
      {status}
    </Badge>
  );
}

const hardwareStatusVariant: Record<HardwareStatus, BadgeVariant> = {
  connected:    "success",
  disconnected: "neutral",
  error:        "danger",
  unknown:      "warning",
};

export function HardwareStatusBadge({ status }: { status: HardwareStatus }) {
  return (
    <Badge variant={hardwareStatusVariant[status]} dot>
      {status}
    </Badge>
  );
}

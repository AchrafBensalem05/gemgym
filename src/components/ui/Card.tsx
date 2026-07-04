/**
 * GemGym — Card Component
 *
 * Glassmorphism surface for grouping content.
 * Variants: default | elevated | bordered
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "bordered" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default:  "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]",
  elevated: "bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)]",
  bordered: "bg-[var(--color-bg-card)] border border-[var(--color-border-strong)]",
  glass:    "glass-card",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl overflow-hidden", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";

/* ── Sub-components ── */

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-[var(--color-text-primary)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center px-5 py-3 border-t border-[var(--color-border-subtle)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * GemGym — Dialog Component
 *
 * Built on Radix UI Dialog for accessible modal behavior.
 * Supports: title, description, footer actions.
 */

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Root Re-exports ── */
export const Dialog        = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose   = RadixDialog.Close;

/* ── Overlay ── */

function DialogOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-fade-in data-[state=closed]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

/* ── Content ── */

interface DialogContentProps extends RadixDialog.DialogContentProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100vw-2rem)] rounded-xl",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]",
          "shadow-[var(--shadow-xl)]",
          "animate-scale-in",
          "focus:outline-none",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}

        {/* Close button */}
        <RadixDialog.Close
          className={cn(
            "absolute right-4 top-4 rounded-md p-1",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-white/8 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.57_0.28_270)]"
          )}
          aria-label="Close dialog"
        >
          <X size={16} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/* ── Sub-components ── */

export function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pt-6 pb-4 border-b border-[var(--color-border-subtle)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }: RadixDialog.DialogTitleProps) {
  return (
    <RadixDialog.Title
      className={cn("text-base font-semibold text-[var(--color-text-primary)]", className)}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ className, children, ...props }: RadixDialog.DialogDescriptionProps) {
  return (
    <RadixDialog.Description
      className={cn("mt-1 text-sm text-[var(--color-text-secondary)]", className)}
      {...props}
    >
      {children}
    </RadixDialog.Description>
  );
}

export function DialogBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-6 pb-5 pt-3",
        "border-t border-[var(--color-border-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

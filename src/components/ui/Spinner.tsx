/**
 * GemGym — Spinner Component
 *
 * Animated loading indicator used throughout the app.
 */

import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg" | "xl";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "w-3.5 h-3.5 border-[2px]",
  md: "w-5   h-5   border-[2px]",
  lg: "w-8   h-8   border-[3px]",
  xl: "w-12  h-12  border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-current border-b-transparent animate-spin",
        sizeStyles[size],
        className
      )}
    />
  );
}

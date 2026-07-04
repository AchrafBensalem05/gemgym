/**
 * GemGym — Button Component
 *
 * Variants: primary | secondary | ghost | danger | outline
 * Sizes: sm | md | lg
 * Supports: loading state, icons, disabled state
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[oklch(0.50_0.27_270)] hover:bg-[oklch(0.57_0.28_270)] text-white " +
    "shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_28px_rgba(124,58,237,0.4)] " +
    "border border-[oklch(0.57_0.28_270)/0.3]",
  secondary:
    "bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] " +
    "text-[var(--color-text-primary)] border border-[var(--color-border-default)] " +
    "hover:border-[var(--color-border-strong)]",
  ghost:
    "bg-transparent hover:bg-white/5 text-[var(--color-text-secondary)] " +
    "hover:text-[var(--color-text-primary)] border border-transparent",
  danger:
    "bg-[oklch(0.45_0.24_22)] hover:bg-[oklch(0.52_0.24_22)] text-white " +
    "border border-[oklch(0.55_0.24_22)/0.4] " +
    "shadow-[0_0_16px_rgba(239,68,68,0.2)] hover:shadow-[0_0_24px_rgba(239,68,68,0.35)]",
  outline:
    "bg-transparent hover:bg-[oklch(0.50_0.27_270)/0.08] " +
    "text-[oklch(0.77_0.19_270)] border border-[oklch(0.57_0.28_270)/0.5] " +
    "hover:border-[oklch(0.57_0.28_270)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm:   "h-7  px-3   text-xs  gap-1.5 rounded-md",
  md:   "h-9  px-4   text-sm  gap-2   rounded-lg",
  lg:   "h-11 px-6   text-sm  gap-2   rounded-lg",
  icon: "h-9  w-9    text-sm  rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "cursor-pointer select-none outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          "active:scale-[0.97]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-current" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

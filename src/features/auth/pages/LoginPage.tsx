/**
 * GemGym — Login Page
 *
 * Handles user authentication:
 * - React Hook Form + Zod validation
 * - Show/hide password toggle
 * - Error feedback from Tauri
 * - Disabled state during login
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginSchema, type LoginFormData } from "@/features/auth/validation/schemas";

export function LoginPage() {
  const { login, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    clearError();
    try {
      await login(data);
    } catch {
      // Error is stored in AuthContext and displayed below
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Sign in to your GemGym account
        </p>
      </div>

      {/* Global error from Tauri */}
      {error && error.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[oklch(0.55_0.24_22)/0.3]">
          <p className="text-sm text-[oklch(0.65_0.24_22)]">
            {error.replace("[Tauri:auth_login] ", "")}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          {...register("username")}
          id="login-username"
          label="Username"
          placeholder="Enter your username"
          leftIcon={<User size={14} />}
          error={errors.username?.message}
          autoComplete="username"
          autoFocus
        />

        <Input
          {...register("password")}
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          leftIcon={<Lock size={14} />}
          error={errors.password?.message}
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-6"
          isLoading={isSubmitting}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        GemGym v0.1.0 — Offline Mode
      </p>
    </div>
  );
}

/**
 * GemGym — Auth Layout
 *
 * Centered layout for login and onboarding screens.
 * Features a gradient background, branding panel on the left,
 * and the auth form on the right.
 */

import { Outlet, Navigate } from "react-router-dom";
import { Dumbbell, Zap, Shield, BarChart3 } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Spinner } from "@/components/ui/Spinner";

const features = [
  { icon: Users,      label: "Member Management" },
  { icon: Zap,        label: "RFID & Face Recognition" },
  { icon: Shield,     label: "Role-Based Access Control" },
  { icon: BarChart3,  label: "Real-Time Analytics" },
];

// Import Users from lucide
import { Users } from "lucide-react";

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loader while session is restored
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <Spinner size="lg" className="text-[oklch(0.57_0.28_270)]" />
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg-base)] overflow-hidden">

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.34_0.20_270)] via-[var(--color-bg-base)] to-[var(--color-bg-base)]" />

        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[oklch(0.50_0.27_270)/0.15] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[oklch(0.67_0.19_195)/0.10] blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Dumbbell size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">GemGym</span>
          </div>

          {/* Headline */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold text-[var(--color-text-primary)] leading-tight">
                The complete gym<br />
                <span className="gradient-text">management system</span>
              </h2>
              <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
                Manage members, track attendance, process payments, and grow your fitness business — all offline, all secure.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[oklch(0.50_0.27_270)/0.2] flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-[oklch(0.77_0.19_270)]" />
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} GemGym. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dumbbell size={16} className="text-white" />
            </div>
            <span className="font-bold gradient-text">GemGym</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}

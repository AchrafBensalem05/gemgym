/**
 * GemGym — "Coming Soon" placeholder page
 * Used for routes that aren't fully built yet.
 * Shows the feature name and a progress indicator.
 */

import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-[oklch(0.78_0.18_65)/0.1] flex items-center justify-center">
        <Construction size={28} className="text-[oklch(0.78_0.18_65)]" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-sm">
          {description ?? "This module is being built and will be available soon."}
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="w-2 h-2 rounded-full bg-[oklch(0.78_0.18_65)] animate-pulse" />
        <span className="text-xs text-[var(--color-text-muted)]">In development</span>
      </div>
    </div>
  );
}

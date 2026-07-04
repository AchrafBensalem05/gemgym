/**
 * GemGym — Top Navbar Component
 *
 * Sticky top bar with:
 * - Page title / breadcrumb
 * - Notification bell with unread count
 * - User avatar dropdown
 * - Global search trigger
 */

import { Bell, Search, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/ui/Button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

/* ── Page title map ── */

const pageTitles: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/members":      "Members",
  "/subscriptions":"Subscriptions",
  "/attendance":   "Attendance",
  "/payments":     "Payments",
  "/expenses":     "Expenses",
  "/pos":          "Point of Sale",
  "/inventory":    "Inventory",
  "/face-rfid":    "Face & RFID",
  "/hardware":     "Hardware",
  "/reports":      "Reports",
  "/roles":        "Roles & Permissions",
  "/settings":     "Settings",
};

interface NavbarProps {
  /** Unread notification count */
  notificationCount?: number;
}

export function Navbar({ notificationCount = 0 }: NavbarProps) {
  const location = useLocation();
  const { session, logout } = useAuth();
  const pageTitle = pageTitles[location.pathname] ?? "GemGym";

  return (
    <header className={cn(
      "h-14 flex items-center justify-between",
      "px-6 border-b border-[var(--color-border-subtle)]",
      "bg-[var(--color-bg-surface)] shrink-0"
    )}>
      {/* Left — Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {pageTitle}
        </h1>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {/* Global Search trigger */}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Search size={14} />}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] gap-2 hidden md:inline-flex"
          aria-label="Open search"
        >
          <span className="text-xs hidden lg:inline">Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono
            bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] rounded text-[var(--color-text-muted)]">
            ⌘K
          </kbd>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${notificationCount > 0 ? ` — ${notificationCount} unread` : ""}`}
          >
            <Bell size={16} />
          </Button>
          {notificationCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5",
              "min-w-[16px] h-4 px-1 rounded-full",
              "bg-[oklch(0.57_0.28_270)] text-white text-[10px] font-bold",
              "flex items-center justify-center",
              "animate-scale-in"
            )}>
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </div>

        {/* User Avatar Dropdown */}
        {session && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={cn(
                "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg",
                "hover:bg-white/5 transition-colors text-left",
                "border border-transparent hover:border-[var(--color-border-subtle)]"
              )}>
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {session.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] leading-tight">
                    {session.user.name}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">
                    {session.user.role?.name}
                  </p>
                </div>
                <ChevronDown size={12} className="text-[var(--color-text-muted)] hidden md:block" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  "z-50 min-w-[180px] rounded-xl p-1.5",
                  "bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]",
                  "shadow-[var(--shadow-lg)] animate-scale-in"
                )}
                align="end"
                sideOffset={8}
              >
                <DropdownMenu.Item
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "hover:bg-white/6 outline-none transition-colors"
                  )}
                  onSelect={() => void logout()}
                >
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  );
}

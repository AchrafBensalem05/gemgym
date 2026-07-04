/**
 * GemGym — Sidebar Component
 *
 * Collapsible navigation sidebar with:
 * - Grouped navigation items with icons
 * - Active route highlighting
 * - Collapse/expand toggle
 * - User profile at bottom
 */

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  CreditCard,
  CalendarCheck,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Dumbbell,
  DollarSign,
  Scan,
  Cpu,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";

/* ── Navigation Config ── */

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",    path: "/dashboard",    icon: LayoutDashboard },
    ],
  },
  {
    label: "Gym",
    items: [
      { label: "Members",      path: "/members",      icon: Users },
      { label: "Plans",        path: "/plans",        icon: LayoutGrid },
      { label: "Subscriptions",path: "/subscriptions",icon: CreditCard },
      { label: "Attendance",   path: "/attendance",   icon: CalendarCheck },
      { label: "Payments",     path: "/payments",     icon: DollarSign },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "POS",          path: "/pos",          icon: ShoppingCart },
      { label: "Inventory",    path: "/inventory",    icon: Package },
      { label: "Expenses",     path: "/expenses",     icon: ClipboardList },
    ],
  },
  {
    label: "Hardware",
    items: [
      { label: "Face & RFID",  path: "/face-rfid",    icon: Scan },
      { label: "Hardware",     path: "/hardware",     icon: Cpu },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Reports",      path: "/reports",      icon: BarChart3 },
      { label: "License",      path: "/license",      icon: Key },
      { label: "Roles",        path: "/roles",        icon: Shield },
      { label: "Settings",     path: "/settings",     icon: Settings },
    ],
  },
];

/* ── Component ── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r border-[var(--color-border-subtle)]",
        "bg-[var(--color-bg-surface)] transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-[var(--color-border-subtle)] shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-2.5"
      )}>
        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shrink-0 glow-primary">
          <Dumbbell size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm gradient-text tracking-wide">GemGym</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "sidebar-item",
                      collapsed ? "justify-center px-0 w-full" : "",
                      isActive && "active"
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — User info + logout */}
      <div className="border-t border-[var(--color-border-subtle)] p-2 shrink-0 space-y-1">
        {/* Logout */}
        <button
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "sidebar-item w-full text-[oklch(0.65_0.24_22)] hover:text-[oklch(0.70_0.24_22)]",
            "hover:bg-[rgba(239,68,68,0.08)]",
            collapsed ? "justify-center px-0" : ""
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* User info */}
        {!collapsed && session && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{session.user.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">{session.user.role?.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle — pinned at bottom corner */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute bottom-20 -right-3 z-10",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]",
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          "shadow-sm transition-colors cursor-pointer"
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

/**
 * GemGym — Dashboard Layout
 *
 * The main shell for all authenticated pages:
 * ┌──────────────┬─────────────────────────────────┐
 * │              │         Top Navbar               │
 * │   Sidebar    ├─────────────────────────────────┤
 * │              │                                  │
 * │              │      <Outlet />                  │
 * │              │    (Page Content)                │
 * └──────────────┴──────────────────────────────────┘
 */

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-base)] relative">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar notificationCount={0} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

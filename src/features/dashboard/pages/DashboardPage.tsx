/**
 * GemGym — Dashboard Page
 *
 * Overview page with LIVE stats from Tauri + static chart examples.
 */

import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, CalendarCheck, TrendingUp, TrendingDown, AlertTriangle, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface DashboardStats {
  activeMembers: number;
  newMembersMonth: number;
  checkInsToday: number;
  revenueMonth: number;
  expensesMonth: number;
  expiringSoon: number;
  lowStock: number;
}

/* ── Static chart data (will be replaced with real data in M3) ── */

const revenueData = [
  { month: "Jan", revenue: 9400,  expenses: 3800 },
  { month: "Feb", revenue: 10200, expenses: 3900 },
  { month: "Mar", revenue: 9800,  expenses: 4100 },
  { month: "Apr", revenue: 11300, expenses: 3700 },
  { month: "May", revenue: 12100, expenses: 4300 },
  { month: "Jun", revenue: 11900, expenses: 3900 },
  { month: "Jul", revenue: 12840, expenses: 4210 },
];

const attendanceData = [
  { day: "Mon", checkIns: 45 },
  { day: "Tue", checkIns: 58 },
  { day: "Wed", checkIns: 63 },
  { day: "Thu", checkIns: 49 },
  { day: "Fri", checkIns: 71 },
  { day: "Sat", checkIns: 88 },
  { day: "Sun", checkIns: 34 },
];

/* ── Chart Tooltip ── */

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--color-text-primary)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">
            {["revenue", "expenses"].includes(p.name) ? `$${p.value.toLocaleString()}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── KPI Card ── */

interface KpiCardProps {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "warn" | "neutral";
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function KpiCard({ id, label, value, delta, trend, icon: Icon, iconColor, iconBg }: KpiCardProps) {
  return (
    <Card key={id} variant="default" className="hover:border-[var(--color-border-default)] transition-all duration-200">
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
            <Icon size={15} className={iconColor} />
          </div>
          {trend === "up"   && <TrendingUp  size={12} className="text-[oklch(0.70_0.18_148)] opacity-60" />}
          {trend === "down" && <TrendingDown size={12} className="text-[oklch(0.65_0.24_22)] opacity-60" />}
        </div>
        <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
        <p className="text-[10px] font-medium text-[var(--color-text-secondary)] mt-0.5 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{delta}</p>
      </CardContent>
    </Card>
  );
}

/* ── Dashboard Page ── */

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => tauriInvoke<DashboardStats>(Commands.DASHBOARD_STATS),
    refetchInterval: 30_000, // refresh every 30s
  });

  const kpiCards: KpiCardProps[] = [
    {
      id:        "active-members",
      label:     "Active Members",
      value:     isLoading ? "—" : String(stats?.activeMembers ?? 0),
      delta:     `+${stats?.newMembersMonth ?? 0} this month`,
      trend:     "up",
      icon:      Users,
      iconColor: "text-[oklch(0.77_0.19_270)]",
      iconBg:    "bg-[oklch(0.50_0.27_270)/0.1]",
    },
    {
      id:        "monthly-revenue",
      label:     "Monthly Revenue",
      value:     isLoading ? "—" : `$${(stats?.revenueMonth ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      delta:     "This month",
      trend:     "up",
      icon:      DollarSign,
      iconColor: "text-[oklch(0.70_0.18_148)]",
      iconBg:    "bg-[oklch(0.70_0.18_148)/0.1]",
    },
    {
      id:        "todays-checkins",
      label:     "Today's Check-ins",
      value:     isLoading ? "—" : String(stats?.checkInsToday ?? 0),
      delta:     "Verified entries today",
      trend:     "neutral",
      icon:      CalendarCheck,
      iconColor: "text-[oklch(0.76_0.18_195)]",
      iconBg:    "bg-[oklch(0.76_0.18_195)/0.1]",
    },
    {
      id:        "expiring-soon",
      label:     "Expiring Soon",
      value:     isLoading ? "—" : String(stats?.expiringSoon ?? 0),
      delta:     "Next 7 days",
      trend:     "warn",
      icon:      AlertTriangle,
      iconColor: "text-[oklch(0.78_0.18_65)]",
      iconBg:    "bg-[oklch(0.78_0.18_65)/0.1]",
    },
    {
      id:        "monthly-expenses",
      label:     "Monthly Expenses",
      value:     isLoading ? "—" : `$${(stats?.expensesMonth ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      delta:     "This month",
      trend:     "down",
      icon:      TrendingDown,
      iconColor: "text-[oklch(0.65_0.24_22)]",
      iconBg:    "bg-[oklch(0.65_0.24_22)/0.1]",
    },
    {
      id:        "low-stock",
      label:     "Low Stock Items",
      value:     isLoading ? "—" : String(stats?.lowStock ?? 0),
      delta:     "Below reorder threshold",
      trend:     stats?.lowStock ? "warn" : "neutral",
      icon:      Package,
      iconColor: "text-[oklch(0.78_0.18_65)]",
      iconBg:    "bg-[oklch(0.78_0.18_65)/0.1]",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((card) => <KpiCard key={card.id} {...card} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Revenue vs Expenses */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <span className="text-xs text-[var(--color-text-muted)]">Last 7 months</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="revenue"  fill="oklch(0.50 0.27 270)" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="expenses" fill="rgba(239,68,68,0.55)"  radius={[4, 4, 0, 0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.50_0.27_270)]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[rgba(239,68,68,0.55)]" /> Expenses
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Attendance */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Weekly Attendance</CardTitle>
            <span className="text-xs text-[var(--color-text-muted)]">This week</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="oklch(0.67 0.19 195)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.67 0.19 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
                <Area type="monotone" dataKey="checkIns" stroke="oklch(0.67 0.19 195)" strokeWidth={2}
                  fill="url(#attendGrad)" name="checkIns" dot={false}
                  activeDot={{ r: 4, fill: "oklch(0.67 0.19 195)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom info row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Getting started tip when DB is empty */}
        {!isLoading && (stats?.activeMembers ?? 0) === 0 && (
          <Card variant="default">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Welcome to GemGym!
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                    Your database is set up and ready. Start by adding your first member —
                    click <strong>Members</strong> in the sidebar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expiry alerts */}
        {(stats?.expiringSoon ?? 0) > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Action Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-[oklch(0.78_0.18_65)/0.1] flex items-center justify-center">
                  <AlertTriangle size={15} className="text-[oklch(0.78_0.18_65)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {stats?.expiringSoon} subscription{(stats?.expiringSoon ?? 0) > 1 ? "s" : ""} expiring within 7 days
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Visit Subscriptions to renew them
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

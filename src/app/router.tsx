/**
 * GemGym — Application Router
 *
 * All routes with lazy-loading, protected guard, and layout wrapping.
 */

import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AuthLayout }      from "@/layouts/AuthLayout";
import { ProtectedRoute }  from "@/components/routing/ProtectedRoute";
import { Spinner }         from "@/components/ui/Spinner";
import { ComingSoon }      from "@/components/ui/ComingSoon";

/* ── Lazy Pages ── */
const LoginPage     = lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const MembersPage   = lazy(() => import("@/features/members/pages/MembersPage").then(m => ({ default: m.MembersPage })));
const PlansPage     = lazy(() => import("@/features/subscriptions/pages/PlansPage").then(m => ({ default: m.PlansPage })));
const SubscriptionsPage = lazy(() => import("@/features/subscriptions/pages/SubscriptionsPage").then(m => ({ default: m.SubscriptionsPage })));
const PaymentsPage  = lazy(() => import("@/features/subscriptions/pages/PaymentsPage").then(m => ({ default: m.PaymentsPage })));
const RolesPage     = lazy(() => import("@/features/auth/pages/RolesPage").then(m => ({ default: m.RolesPage })));
const UsersPage     = lazy(() => import("@/features/auth/pages/UsersPage").then(m => ({ default: m.UsersPage })));
const FaceRfidPage  = lazy(() => import("@/features/hardware/pages/FaceRfidPage").then(m => ({ default: m.FaceRfidPage })));
const LicensePage   = lazy(() => import("@/features/hardware/pages/LicensePage").then(m => ({ default: m.LicensePage })));
const NotFoundPage  = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFoundPage })));

/* ── Full-screen Suspense Fallback ── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <Spinner size="md" className="text-[oklch(0.57_0.28_270)]" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/* ── Router ── */
export const router = createBrowserRouter([
  /* ── Auth Routes ── */
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: "login",
        element: <Lazy><LoginPage /></Lazy>,
      },
    ],
  },

  /* ── Protected App Routes ── */
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <Lazy><DashboardPage /></Lazy> },

      /* Members */
      { path: "members", element: <Lazy><MembersPage /></Lazy> },

      /* Plans */
      { path: "plans", element: <Lazy><PlansPage /></Lazy> },

      /* Subscriptions */
      {
        path: "subscriptions",
        element: <Lazy><SubscriptionsPage /></Lazy>,
      },

      /* Attendance */
      {
        path: "attendance",
        element: <ComingSoon title="Attendance" description="View check-in/check-out history and daily attendance logs." />,
      },

      /* Payments */
      {
        path: "payments",
        element: <Lazy><PaymentsPage /></Lazy>,
      },

      /* Expenses */
      {
        path: "expenses",
        element: <ComingSoon title="Expenses" description="Track gym operating expenses by category." />,
      },

      /* POS */
      {
        path: "pos",
        element: <ComingSoon title="Point of Sale" description="Sell products and services directly to members with a fast checkout interface." />,
      },

      /* Inventory */
      {
        path: "inventory",
        element: <ComingSoon title="Inventory" description="Manage products, track stock levels, and set reorder alerts." />,
      },

      /* Face & RFID */
      {
        path: "face-rfid",
        element: <Lazy><FaceRfidPage /></Lazy>,
      },

      /* Hardware */
      {
        path: "hardware",
        element: <ComingSoon title="Hardware Management" description="Configure door controllers, RFID readers, cameras, and printers." />,
      },

      /* Reports */
      {
        path: "reports",
        element: <ComingSoon title="Reports & Analytics" description="Revenue, attendance, membership, and expense reports with export support." />,
      },

      /* License */
      { path: "license",  element: <Lazy><LicensePage /></Lazy> },

      /* Roles */
      { path: "roles",    element: <Lazy><RolesPage /></Lazy> },

      /* Users (under settings) */
      { path: "settings", element: <Lazy><UsersPage /></Lazy> },

      /* Catch-all */
      { path: "*", element: <Lazy><NotFoundPage /></Lazy> },
    ],
  },
]);

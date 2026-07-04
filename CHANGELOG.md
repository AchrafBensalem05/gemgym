# CHANGELOG

All notable changes will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-07-03

### Added — Milestone 1: Foundation

#### Infrastructure
- Tauri 2 + React 19 + TypeScript project initialized
- TailwindCSS v4 configured with CSS-first `@theme` design tokens
- Path aliases (`@/*` → `src/*`) configured in both Vite and TypeScript
- React Query v5 client with offline-first defaults (no focus refetch, 5min stale)
- React Router v7 with lazy-loaded pages

#### Design System (`src/index.css`)
- Dark mode color palette using OKLCH color space
- Glassmorphism utilities (`.glass`, `.glass-card`)
- Custom animations (`fadeIn`, `slideIn`, `scaleIn`, `shimmer`, `pulse-glow`)
- Skeleton loader utility
- Sidebar, table, input, badge global CSS classes
- Custom scrollbar styling

#### Global Components (`src/components/ui/`)
- `Button` — 5 variants, 4 sizes, loading state, icon slots
- `Input` — label, error, helper text, left icon, right element, ARIA
- `Card` — 4 variants with Header/Title/Content/Footer
- `Badge` — 6 variants + domain-specific badges (Member, Subscription, Payment, Hardware)
- `Dialog` — Radix UI powered with overlay, close button, Header/Body/Footer
- `DataTable` — sortable columns, search, pagination, skeleton loading, empty state
- `Spinner` — 4 sizes, CSS border animation

#### Layout (`src/components/layout/`, `src/layouts/`)
- `Sidebar` — collapsible, grouped nav items, active route, user info, logout
- `Navbar` — page title, notification bell with badge, user avatar dropdown
- `DashboardLayout` — sidebar + navbar + scrollable main content
- `AuthLayout` — branded left panel + right form panel

#### Features
- `AuthContext` — session management, login/logout, error state
- `ProtectedRoute` — branded loading screen, redirect to /login
- `LoginPage` — React Hook Form + Zod validation, show/hide password
- `DashboardPage` — 6 KPI cards, bar chart, area chart, check-ins feed, membership breakdown

#### Rust Backend (`src-tauri/src/`)
- `services/crypto.rs` — Argon2id hashing, AES-256-GCM encryption, unit tests
- `services/database.rs` — SQLite initialization, WAL mode, complete schema migration (18 entities)
- `commands/auth.rs` — `auth_login`, `auth_logout`, `auth_get_session` Tauri commands
- `lib.rs` — Tauri builder with plugins and managed state wired up

#### Python Service (`src-python/`)
- `main.py` — WebSocket server, OpenCV camera capture, Haar cascade detection, embedding store
- `requirements.txt` — pinned dependencies

#### Documentation
- `README.md` — overview, tech stack, structure, quick start
- `DECISIONS.md` — 5 Architecture Decision Records
- `CHANGELOG.md` — this file
- `PROJECT_TASKS.md` — milestone task tracker
- `DATABASE.md` — database schema reference (entity list)

# GemGym — Project Tasks

## Milestone 1: Project Setup & Base Architecture
- `[x]` Project initialization (Tauri 2 + React + TS + TailwindCSS)
- `[x]` Install dependencies (Drizzle, React Query, React Router, Zod, Radix UI, etc.)
- `[x]` Configure Tailwind CSS v4 & global styling (dark mode, glassmorphism, animations)
- `[x]` Configure Drizzle SQLite schema (all 18 entities)
- `[x]` Implement Tauri Rust security services (Argon2, AES-256-GCM with unit tests)
- `[x]` Implement SQLite initialization & full schema migration (Rust)
- `[x]` Build global UI components (Button, Input, Card, Badge, Dialog, DataTable, Spinner)
- `[x]` Build layout components (Sidebar, Navbar, DashboardLayout, AuthLayout)
- `[x]` Implement Auth context, ProtectedRoute, React Router setup
- `[x]` Implement Login Page (React Hook Form + Zod)
- `[x]` Implement Dashboard Page (KPI cards, charts, check-in feed)
- `[x]` Create Tauri auth commands (auth_login, auth_logout, auth_get_session)
- `[x]` Set up Python face recognition service skeleton (WebSocket + OpenCV)
- `[x]` Initialize project documentation (README, DECISIONS, CHANGELOG)

## Milestone 2: Authentication, RBAC & Database (Next)
- `[ ]` Connect Rust SQLite database on app startup (managed state)
- `[ ]` Seed default roles (Admin, Manager, Staff) and permissions on first run
- `[ ]` Create default admin user with Argon2 hashed password
- `[ ]` Replace mock auth_login with real DB lookup + Argon2 verification
- `[ ]` Implement hardware fingerprint collection (sysinfo)
- `[ ]` Implement OS keychain key storage (keyring crate)
- `[ ]` Implement AES encryption for sensitive columns (email, phone)
- `[ ]` Implement RBAC permission checks in Tauri commands
- `[ ]` Build Roles & Users management page (UI)
- `[ ]` Build Users management page (UI)
- `[ ]` Implement audit log write on every mutating Tauri command

## Milestone 3: Member & Subscription Management
- `[ ]` Member list/create/edit/delete Tauri commands
- `[ ]` Members page (DataTable with filters, status, avatar)
- `[ ]` Member detail modal/page
- `[ ]` Membership plans CRUD (Tauri commands + UI)
- `[ ]` Subscriptions CRUD (Tauri commands + UI)
- `[ ]` RFID card assignment UI
- `[ ]` Payments list + create payment Tauri commands + UI

## Milestone 4: Attendance & Hardware Integration
- `[ ]` Python service — real face_recognition library integration (dlib)
- `[ ]` Tauri subprocess manager (start/stop/monitor Python service)
- `[ ]` Face check-in live monitor page (WebSocket canvas streaming)
- `[ ]` RFID check-in handler (global keyboard listener + serial reader)
- `[ ]` Attendance log Tauri commands + UI
- `[ ]` Door controller Rust service (Serial/TCP)
- `[ ]` Connect attendance validation to door trigger

## Milestone 5: POS, Inventory & Expenses
- `[ ]` Products CRUD Tauri commands + UI
- `[ ]` Inventory adjustment + log Tauri commands + UI
- `[ ]` POS checkout screen (cart, member, payment, receipt)
- `[ ]` Sales history + Tauri commands
- `[ ]` Expenses CRUD Tauri commands + UI

## Milestone 6: Reports, Audit, Backup & Settings
- `[ ]` Dashboard stats wired to real Tauri commands
- `[ ]` Revenue/expense/attendance chart real data
- `[ ]` Audit logs viewer (paginated)
- `[ ]` Manual + automatic backup (Rust zip + encrypt)
- `[ ]` Settings page (hardware config, camera, license)
- `[ ]` License activation page + Ed25519 signature verification
- `[ ]` Low stock notifications
- `[ ]` Subscription expiry notifications

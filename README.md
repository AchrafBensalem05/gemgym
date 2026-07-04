# GemGym — Gym Management System

<div align="center">
  <img src="docs/assets/logo.png" alt="GemGym Logo" width="80" />
  <h3>GemGym — Offline-First Gym Management System</h3>
  <p>Built with Tauri 2, React, TypeScript, Rust, and Python</p>
</div>

---

## Overview

GemGym is a production-ready, offline-first desktop application for managing gyms and fitness centers. It handles members, subscriptions, attendance (including face recognition and RFID), payments, inventory, POS, and more — all without an internet connection.

## Tech Stack

| Layer             | Technology                                    |
|-------------------|-----------------------------------------------|
| UI Framework      | React 19 + TypeScript                         |
| Styling           | TailwindCSS v4                                |
| Desktop Shell     | Tauri 2 (Rust)                               |
| State Management  | React Query v5                                |
| Routing           | React Router v7                               |
| Forms             | React Hook Form + Zod                         |
| Database          | SQLite (rusqlite — bundled)                   |
| Schema / Types    | Drizzle ORM                                   |
| Password Hashing  | Argon2id (Rust)                               |
| Encryption        | AES-256-GCM (Rust)                            |
| Face Recognition  | Python + OpenCV + face_recognition (dlib)     |
| Charts            | Recharts                                      |
| UI Primitives     | Radix UI                                      |
| Icons             | Lucide React                                  |

## Project Structure

```
gemgym/
├── src/                    # React frontend
│   ├── app/                # Providers, Router
│   ├── components/         # Reusable UI components (ui/, layout/, routing/)
│   ├── database/           # Drizzle ORM schema definitions
│   ├── features/           # Feature modules (auth, dashboard, members, …)
│   ├── hooks/              # Shared React hooks
│   ├── layouts/            # Page layouts (Auth, Dashboard)
│   ├── lib/                # Library configs (query-client, tauri bridge, utils)
│   ├── pages/              # Non-feature pages (404)
│   └── types/              # Shared TypeScript types
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri IPC command handlers
│       └── services/       # Crypto, Database services
├── src-python/             # Python face recognition service
└── docs/                   # Project documentation
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Rust (stable) — install via [rustup.rs](https://rustup.rs)
- Tauri CLI v2 dependencies — see [Tauri Prerequisites](https://tauri.app/start/prerequisites/)
- Python 3.11+ (for face recognition service)

### Development

```bash
# Install npm dependencies
npm install

# Run the Tauri dev server
npm run tauri dev
```

### Default Login (Milestone 1)

```
Username: admin
Password: admin
```

> ⚠️ These credentials are replaced with proper Argon2-hashed credentials in Milestone 2.

## Milestones

- [x] **M1**: Project Setup, Design System, Global Components, Router, Auth UI
- [ ] **M2**: Full Auth (Argon2), DB initialization, RBAC, Member CRUD
- [ ] **M3**: Subscriptions, Payments, RFID
- [ ] **M4**: Attendance, Face Recognition, Door Controller
- [ ] **M5**: POS, Inventory, Expenses
- [ ] **M6**: Reports, Audit Logs, Backups, Settings, Licensing

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture and design decisions
- [DATABASE.md](DATABASE.md) — Database schema reference
- [DECISIONS.md](DECISIONS.md) — Architecture Decision Records (ADR)
- [CHANGELOG.md](CHANGELOG.md) — Version history

## License

Proprietary — All rights reserved.

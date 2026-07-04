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

Before you begin, ensure your system has the following installed:
1. **Node.js** (v18 or higher)
2. **Rust** (stable) — install via [rustup.rs](https://rustup.rs)
3. **Tauri CLI v2 dependencies** — see [Tauri Prerequisites](https://tauri.app/start/prerequisites/)
4. **Python 3.11+** (for the face recognition sidecar service)
5. **CMake** (required for compiling `dlib` during Python setup)

### Step-by-Step Setup Guide

#### 1. Clone the Repository
Clone the project from GitHub and navigate into the directory:
```bash
git clone https://github.com/AchrafBensalem05/gemgym.git
cd gemgym
```

#### 2. Install Node Dependencies
Install all frontend and Tauri CLI dependencies:
```bash
npm install
```

#### 3. Setup Python Virtual Environment (Face Recognition Service)
The app uses a Python sidecar for heavy ML tasks (like facial recognition). You need to create a virtual environment and install its dependencies:
```bash
# Create virtual environment
python3 -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate
# Windows: venv\Scripts\activate

# Install dependencies (may take a few minutes to build dlib)
pip install -r src-python/requirements.txt
```

#### 4. Run the Application in Development Mode
Once both the Node modules and Python environment are ready, run the Tauri dev server. The Tauri backend will automatically spawn the Python sidecar:
```bash
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
- [x] **M2**: Full Auth (Argon2), DB initialization, RBAC, Member CRUD
- [x] **M3**: Subscriptions, Payments, RFID
- [x] **M4**: Attendance, Face Recognition, Door Controller
- [ ] **M5**: POS, Inventory, Expenses
- [ ] **M6**: Reports, Audit Logs, Backups, Settings, Licensing

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture and design decisions
- [DATABASE.md](DATABASE.md) — Database schema reference
- [DECISIONS.md](DECISIONS.md) — Architecture Decision Records (ADR)
- [CHANGELOG.md](CHANGELOG.md) — Version history

## License

Proprietary — All rights reserved.

# GemGym — Architecture Decision Records (DECISIONS.md)

## ADR-001: All Database Operations in Rust (not frontend)

**Date**: 2026-07-03  
**Status**: Accepted

**Context**: Tauri's WebView doesn't have Node.js, so `better-sqlite3` cannot run in the browser context. Options were: `@tauri-apps/plugin-sql` (frontend SQL), or rusqlite in Rust with typed commands.

**Decision**: All SQLite operations run in Rust via rusqlite. Tauri IPC commands expose typed CRUD endpoints. The frontend uses Zod schemas to validate responses.

**Consequences**: More Rust code per feature, but better security (SQL never in frontend), better performance, and no serialization of raw SQL through the IPC boundary.

---

## ADR-002: Drizzle ORM for Schema Definitions Only

**Date**: 2026-07-03  
**Status**: Accepted

**Context**: Drizzle ORM is listed in requirements. Given ADR-001, Drizzle can't execute queries in the WebView.

**Decision**: Use Drizzle as a schema definition and type inference tool only. `drizzle-kit generate` produces migration SQL for documentation and reference. Actual queries use rusqlite on the Rust side.

**Consequences**: Schema has two representations — Drizzle TypeScript (types) and Rust migration SQL (runtime). Both are kept in sync manually and are tested during development.

---

## ADR-003: AES-256-GCM for Sensitive Column Encryption

**Date**: 2026-07-03  
**Status**: Accepted

**Context**: GDPR requires biometric data protection. Phone/email fields must be encrypted at rest.

**Decision**: Use AES-256-GCM with a random 12-byte nonce prepended to ciphertext, Base64-encoded. The master encryption key is derived from a combination of the hardware fingerprint and a secret stored in the OS keychain (via Rust `keyring` crate).

**Consequences**: Sensitive columns store opaque blobs. Reporting/searching on encrypted fields requires decryption in Rust before filtering, which adds query complexity.

---

## ADR-004: Python Sidecar for Face Recognition

**Date**: 2026-07-03  
**Status**: Accepted

**Context**: OpenCV and dlib are not available in Rust with the same maturity as Python.

**Decision**: Face recognition runs in a dedicated Python process communicating with Tauri over localhost WebSockets. Tauri spawns the Python process using `tauri-plugin-shell` and manages its lifecycle.

**Consequences**: App bundle must include Python runtime (PyInstaller binary in production). Adds IPC latency for check-in events (~5–15ms locally).

---

## ADR-005: Offline-First Licensing with Ed25519

**Date**: 2026-07-03  
**Status**: Accepted

**Context**: The app must work without internet. Licensing must still be enforceable.

**Decision**: A license file contains the licensee name, allowed features, expiry date, and hardware fingerprint. It is signed with an Ed25519 private key held by the vendor. The Rust binary embeds the public key and verifies the signature locally on every startup.

**Consequences**: License files can be transferred via USB. Revocation requires the customer to connect to the internet to receive an updated (expired) license file.

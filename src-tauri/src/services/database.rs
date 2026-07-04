//! GemGym — Database Service
//!
//! Manages the SQLite connection pool and runs schema migrations.
//! All tables are created if they don't exist (idempotent migrations).

use rusqlite::{Connection, Result as SqlResult};
use std::path::Path;

/// Initialize the SQLite database at the given path.
/// Creates all tables and indexes if they don't exist.
pub fn initialize_database(db_path: &Path) -> SqlResult<Connection> {
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    // Enable foreign key enforcement
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    // Set busy timeout to 5 seconds
    conn.execute_batch("PRAGMA busy_timeout=5000;")?;

    run_migrations(&conn)?;
    Ok(conn)
}

/// Run all schema migration SQL statements.
/// Migrations are idempotent — safe to re-run on every startup.
fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(MIGRATION_V1)
}

/// Initial schema — creates all 18 entities.
const MIGRATION_V1: &str = "
-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
);

-- Role <-> Permission join table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email         TEXT NOT NULL DEFAULT '',
    name          TEXT NOT NULL,
    role_id       TEXT NOT NULL REFERENCES roles(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

-- Members
CREATE TABLE IF NOT EXISTS members (
    id                    TEXT PRIMARY KEY,
    first_name            TEXT NOT NULL,
    last_name             TEXT NOT NULL,
    email_encrypted       TEXT,
    phone_encrypted       TEXT,
    date_of_birth         TEXT,
    joined_date           TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'active'
                              CHECK(status IN ('active','inactive','suspended','expired')),
    photo_path            TEXT,
    active_subscription_id TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Membership Plans
CREATE TABLE IF NOT EXISTS membership_plans (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    duration_months INTEGER NOT NULL,
    price           REAL NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id         TEXT PRIMARY KEY,
    member_id  TEXT NOT NULL REFERENCES members(id),
    plan_id    TEXT NOT NULL REFERENCES membership_plans(id),
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active'
                   CHECK(status IN ('active','expired','cancelled','pending')),
    price_paid REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_member   ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id                  TEXT PRIMARY KEY,
    member_id           TEXT NOT NULL REFERENCES members(id),
    check_in_time       TEXT NOT NULL,
    check_out_time      TEXT,
    verification_method TEXT NOT NULL
                            CHECK(verification_method IN ('face','rfid','manual','pin')),
    status              TEXT NOT NULL DEFAULT 'checked_in'
                            CHECK(status IN ('checked_in','checked_out')),
    device_id           TEXT,
    created_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attendance_member    ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in  ON attendance(check_in_time);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    member_id       TEXT NOT NULL REFERENCES members(id),
    subscription_id TEXT REFERENCES subscriptions(id),
    amount          REAL NOT NULL,
    payment_method  TEXT NOT NULL
                        CHECK(payment_method IN ('cash','card','bank_transfer','other')),
    payment_status  TEXT NOT NULL DEFAULT 'completed'
                        CHECK(payment_status IN ('completed','pending','failed','refunded')),
    transaction_id  TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL
                    CHECK(category IN ('rent','utilities','equipment','maintenance','salaries','marketing','supplies','other')),
    amount      REAL NOT NULL,
    date        TEXT NOT NULL,
    description TEXT,
    paid_by     TEXT NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    sku             TEXT NOT NULL UNIQUE,
    barcode         TEXT UNIQUE,
    description     TEXT,
    price           REAL NOT NULL,
    cost_price      REAL NOT NULL,
    current_stock   INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id            TEXT PRIMARY KEY,
    product_id    TEXT NOT NULL REFERENCES products(id),
    change_amount INTEGER NOT NULL,
    log_type      TEXT NOT NULL CHECK(log_type IN ('purchase','sale','adjustment','loss')),
    reason        TEXT NOT NULL,
    performed_by  TEXT NOT NULL REFERENCES users(id),
    created_at    TEXT NOT NULL
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id             TEXT PRIMARY KEY,
    member_id      TEXT REFERENCES members(id),
    user_id        TEXT NOT NULL REFERENCES users(id),
    total_amount   REAL NOT NULL,
    payment_method TEXT NOT NULL
                       CHECK(payment_method IN ('cash','card','bank_transfer','other')),
    created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id          TEXT PRIMARY KEY,
    sale_id     TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    unit_price  REAL NOT NULL,
    total_price REAL NOT NULL
);

-- RFID Cards
CREATE TABLE IF NOT EXISTS rfid_cards (
    id          TEXT PRIMARY KEY,
    card_uid    TEXT NOT NULL UNIQUE,
    member_id   TEXT NOT NULL REFERENCES members(id),
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active','inactive','lost')),
    assigned_at TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Face Embeddings (biometric — always encrypted)
CREATE TABLE IF NOT EXISTS face_embeddings (
    id                  TEXT PRIMARY KEY,
    member_id           TEXT NOT NULL REFERENCES members(id),
    embedding_encrypted TEXT NOT NULL,
    model_version       TEXT NOT NULL,
    created_at          TEXT NOT NULL
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id                   TEXT PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id),
    action               TEXT NOT NULL,
    table_name           TEXT NOT NULL,
    record_id            TEXT NOT NULL,
    old_values_encrypted TEXT,
    new_values_encrypted TEXT,
    timestamp            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table     ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    member_id   TEXT REFERENCES members(id),
    type        TEXT NOT NULL
                    CHECK(type IN ('subscription_expiry','payment_due','low_stock','check_in','system','birthday')),
    message     TEXT NOT NULL,
    read_status INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

-- Settings (values encrypted)
CREATE TABLE IF NOT EXISTS settings (
    id              TEXT PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    value_encrypted TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    updated_at      TEXT NOT NULL
);

-- Licenses
CREATE TABLE IF NOT EXISTS licenses (
    id                   TEXT PRIMARY KEY,
    license_key          TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'trial'
                             CHECK(status IN ('active','expired','trial','invalid')),
    activation_date      TEXT,
    expiration_date      TEXT,
    hardware_fingerprint TEXT NOT NULL,
    signature            TEXT,
    verified_at          TEXT
);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
    id            TEXT PRIMARY KEY,
    file_path     TEXT NOT NULL,
    backup_type   TEXT NOT NULL CHECK(backup_type IN ('automatic','manual')),
    status        TEXT NOT NULL CHECK(status IN ('completed','failed','in_progress')),
    error_message TEXT,
    file_size     INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);

-- Hardware Devices
CREATE TABLE IF NOT EXISTS hardware (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL
                        CHECK(type IN ('door_controller','rfid_reader','camera','printer')),
    connection_type TEXT NOT NULL CHECK(connection_type IN ('serial','tcp','usb','virtual')),
    ip_address      TEXT,
    port            INTEGER,
    status          TEXT NOT NULL DEFAULT 'unknown'
                        CHECK(status IN ('connected','disconnected','error','unknown')),
    configuration   TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL
);
";

//! GemGym — Database Seeding
//!
//! Seeds the database with:
//! - All permission definitions
//! - Default roles (Admin, Manager, Staff)
//! - Role-permission associations
//! - A default admin user (username: admin, password: admin) if no users exist
//!
//! This runs on every app startup and is safe to re-run (idempotent via INSERT OR IGNORE).

use rusqlite::{Connection, Result as SqlResult};
use uuid::Uuid;
use chrono::Utc;
use crate::services::crypto;

/// All permission names in the system.
const PERMISSIONS: &[(&str, &str)] = &[
    ("members.view",        "View member records"),
    ("members.create",      "Create new members"),
    ("members.edit",        "Edit member records"),
    ("members.delete",      "Delete members"),
    ("subscriptions.view",  "View subscriptions"),
    ("subscriptions.create","Create subscriptions"),
    ("subscriptions.edit",  "Edit subscriptions"),
    ("attendance.view",     "View attendance records"),
    ("attendance.checkin",  "Perform check-in/check-out"),
    ("payments.view",       "View payment records"),
    ("payments.create",     "Record payments"),
    ("expenses.view",       "View expenses"),
    ("expenses.create",     "Create expenses"),
    ("inventory.view",      "View inventory"),
    ("inventory.manage",    "Manage inventory & products"),
    ("pos.access",          "Access Point of Sale"),
    ("reports.view",        "View reports"),
    ("settings.view",       "View settings"),
    ("settings.edit",       "Edit settings"),
    ("audit.view",          "View audit logs"),
    ("hardware.manage",     "Manage hardware devices"),
    ("backup.manage",       "Manage database backups"),
    ("license.manage",      "Manage application license"),
    ("roles.manage",        "Manage roles and permissions"),
    ("users.manage",        "Manage system users"),
];

/// Role definitions: (name, description, [permission names it gets])
const ROLES: &[(&str, &str, &[&str])] = &[
    (
        "Admin",
        "Full system access — all permissions",
        &[
            "members.view", "members.create", "members.edit", "members.delete",
            "subscriptions.view", "subscriptions.create", "subscriptions.edit",
            "attendance.view", "attendance.checkin",
            "payments.view", "payments.create",
            "expenses.view", "expenses.create",
            "inventory.view", "inventory.manage",
            "pos.access",
            "reports.view",
            "settings.view", "settings.edit",
            "audit.view",
            "hardware.manage",
            "backup.manage",
            "license.manage",
            "roles.manage",
            "users.manage",
        ],
    ),
    (
        "Manager",
        "Gym manager — most permissions except system settings",
        &[
            "members.view", "members.create", "members.edit",
            "subscriptions.view", "subscriptions.create", "subscriptions.edit",
            "attendance.view", "attendance.checkin",
            "payments.view", "payments.create",
            "expenses.view", "expenses.create",
            "inventory.view", "inventory.manage",
            "pos.access",
            "reports.view",
            "settings.view",
        ],
    ),
    (
        "Staff",
        "Front desk staff — check-ins, members, and POS only",
        &[
            "members.view",
            "subscriptions.view",
            "attendance.view", "attendance.checkin",
            "payments.view", "payments.create",
            "pos.access",
        ],
    ),
];

/// Run all seeds. Safe to call on every startup.
pub fn seed(conn: &Connection) -> SqlResult<()> {
    let now = Utc::now().to_rfc3339();

    seed_permissions(conn, &now)?;
    seed_roles(conn, &now)?;
    seed_default_admin(conn, &now)?;

    Ok(())
}

fn seed_permissions(conn: &Connection, now: &str) -> SqlResult<()> {
    for (name, description) in PERMISSIONS {
        conn.execute(
            "INSERT OR IGNORE INTO permissions (id, name, description, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![Uuid::new_v4().to_string(), name, description, now],
        )?;
    }
    Ok(())
}

fn seed_roles(conn: &Connection, now: &str) -> SqlResult<()> {
    for (name, description, perm_names) in ROLES {
        // Insert role (ignore if exists)
        conn.execute(
            "INSERT OR IGNORE INTO roles (id, name, description, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![Uuid::new_v4().to_string(), name, description, now],
        )?;

        // Retrieve the role id (may already exist)
        let role_id: String = conn.query_row(
            "SELECT id FROM roles WHERE name = ?1",
            rusqlite::params![name],
            |row| row.get(0),
        )?;

        // Assign permissions to this role
        for perm_name in *perm_names {
            // Look up permission id
            let perm_id: Option<String> = conn
                .query_row(
                    "SELECT id FROM permissions WHERE name = ?1",
                    rusqlite::params![perm_name],
                    |row| row.get(0),
                )
                .ok();

            if let Some(pid) = perm_id {
                conn.execute(
                    "INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
                     VALUES (?1, ?2)",
                    rusqlite::params![role_id, pid],
                )?;
            }
        }
    }
    Ok(())
}

fn seed_default_admin(conn: &Connection, now: &str) -> SqlResult<()> {
    // Only seed if no users exist
    let user_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| row.get(0),
    )?;

    if user_count > 0 {
        return Ok(());
    }

    // Get Admin role id
    let admin_role_id: String = conn.query_row(
        "SELECT id FROM roles WHERE name = 'Admin'",
        [],
        |row| row.get(0),
    )?;

    // Hash default password "admin" with Argon2
    let password_hash = crypto::hash_password("admin")
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
        )))?;

    conn.execute(
        "INSERT INTO users (id, username, password_hash, email, name, role_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            "admin",
            password_hash,
            "admin@gemgym.local",
            "System Admin",
            admin_role_id,
            now,
            now,
        ],
    )?;

    Ok(())
}

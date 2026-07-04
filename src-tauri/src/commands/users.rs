//! GemGym — Users & Roles Tauri Commands

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

use crate::state::{DbState, SessionState};
use crate::services::crypto;

// ── Response Types ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RoleRow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub permission_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserRow {
    pub id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub role_id: String,
    pub role_name: String,
    pub created_at: String,
    pub updated_at: String,
}

// ── Request Types ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserPayload {
    pub username: String,
    pub name: String,
    pub email: String,
    pub password: String,
    pub role_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserPayload {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role_id: String,
}

// ── Role Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn roles_list(db: State<'_, DbState>) -> Result<Vec<RoleRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT r.id, r.name, r.description, r.created_at,
                COUNT(rp.permission_id) as permission_count
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         GROUP BY r.id
         ORDER BY r.name"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<RoleRow> = stmt
        .query_map([], |row| {
            Ok(RoleRow {
                id:               row.get(0)?,
                name:             row.get(1)?,
                description:      row.get(2)?,
                created_at:       row.get(3)?,
                permission_count: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

// ── User Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn users_list(db: State<'_, DbState>) -> Result<Vec<UserRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT u.id, u.username, u.name, u.email, u.role_id,
                r.name as role_name, u.created_at, u.updated_at
         FROM users u
         JOIN roles r ON u.role_id = r.id
         ORDER BY u.created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<UserRow> = stmt
        .query_map([], |row| {
            Ok(UserRow {
                id:         row.get(0)?,
                username:   row.get(1)?,
                name:       row.get(2)?,
                email:      row.get(3)?,
                role_id:    row.get(4)?,
                role_name:  row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[tauri::command]
pub async fn users_create(
    payload: CreateUserPayload,
    db: State<'_, DbState>,
    session_state: State<'_, SessionState>,
) -> Result<UserRow, String> {
    // Require authentication
    let _session = session_state
        .0.lock().map_err(|e| e.to_string())?
        .clone()
        .ok_or("Not authenticated")?;

    // Validate username uniqueness
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE username = ?1",
        rusqlite::params![payload.username],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists > 0 {
        return Err(format!("Username '{}' is already taken", payload.username));
    }

    // Validate password length
    if payload.password.len() < 8 {
        return Err("Password must be at least 8 characters".into());
    }

    // Hash password
    let password_hash = crypto::hash_password(&payload.password)
        .map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, email, name, role_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id, payload.username, password_hash,
            payload.email, payload.name, payload.role_id, now, now,
        ],
    ).map_err(|e| e.to_string())?;

    // Return the created user with role name
    let row = conn.query_row(
        "SELECT u.id, u.username, u.name, u.email, u.role_id,
                r.name, u.created_at, u.updated_at
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?1",
        rusqlite::params![id],
        |row| Ok(UserRow {
            id:         row.get(0)?,
            username:   row.get(1)?,
            name:       row.get(2)?,
            email:      row.get(3)?,
            role_id:    row.get(4)?,
            role_name:  row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(row)
}

#[tauri::command]
pub async fn users_update(
    payload: UpdateUserPayload,
    db: State<'_, DbState>,
    session_state: State<'_, SessionState>,
) -> Result<UserRow, String> {
    let _session = session_state
        .0.lock().map_err(|e| e.to_string())?
        .clone()
        .ok_or("Not authenticated")?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE users SET name = ?1, email = ?2, role_id = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![payload.name, payload.email, payload.role_id, now, payload.id],
    ).map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT u.id, u.username, u.name, u.email, u.role_id,
                r.name, u.created_at, u.updated_at
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?1",
        rusqlite::params![payload.id],
        |row| Ok(UserRow {
            id:         row.get(0)?,
            username:   row.get(1)?,
            name:       row.get(2)?,
            email:      row.get(3)?,
            role_id:    row.get(4)?,
            role_name:  row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(row)
}

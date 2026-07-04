//! GemGym — Auth Tauri Commands
//!
//! Implements login, logout, and session retrieval against the real SQLite database.
//! Passwords are verified using Argon2id.
//! Sessions are held in Tauri managed state (in-memory, cleared on app exit).

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::{DbState, SessionState};
use crate::services::crypto;

// ── Response Types ─────────────────────────────────────────────────────────

/// Full session returned to the frontend on successful login.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub user: AuthUser,
    pub token: String,
    pub expires_at: String,
}

/// User summary included in the session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub role_id: String,
    pub role: Option<AuthRole>,
    pub created_at: String,
    pub updated_at: String,
}

/// Role summary included in session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthRole {
    pub id: String,
    pub name: String,
    pub description: String,
    pub permissions: Vec<AuthPermission>,
    pub created_at: String,
}

/// Permission summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthPermission {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
}

// ── Request Types ─────────────────────────────────────────────────────────

/// Login credentials from the frontend.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

// ── Commands ──────────────────────────────────────────────────────────────

/// Login: validate credentials against the database and return a session.
#[tauri::command]
pub async fn auth_login(
    credentials: LoginCredentials,
    db: State<'_, DbState>,
    session_state: State<'_, SessionState>,
) -> Result<AuthSession, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // 1. Look up user by username
    let result = conn.query_row(
        "SELECT u.id, u.username, u.password_hash, u.email, u.name,
                u.role_id, u.created_at, u.updated_at,
                r.id as r_id, r.name as r_name, r.description as r_desc, r.created_at as r_created_at
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.username = ?1",
        rusqlite::params![credentials.username],
        |row| {
            Ok((
                row.get::<_, String>(0)?,   // user id
                row.get::<_, String>(1)?,   // username
                row.get::<_, String>(2)?,   // password_hash
                row.get::<_, String>(3)?,   // email
                row.get::<_, String>(4)?,   // name
                row.get::<_, String>(5)?,   // role_id
                row.get::<_, String>(6)?,   // created_at
                row.get::<_, String>(7)?,   // updated_at
                row.get::<_, String>(8)?,   // role.id
                row.get::<_, String>(9)?,   // role.name
                row.get::<_, String>(10)?,  // role.description
                row.get::<_, String>(11)?,  // role.created_at
            ))
        },
    );

    let (uid, username, password_hash, email, name, role_id, created_at, updated_at,
         r_id, r_name, r_desc, r_created_at) = match result {
        Ok(row) => row,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err("Invalid username or password".into());
        }
        Err(e) => return Err(format!("Database error: {e}")),
    };

    // 2. Verify Argon2 password hash
    let valid = crypto::verify_password(&credentials.password, &password_hash)
        .map_err(|e| e.to_string())?;

    if !valid {
        return Err("Invalid username or password".into());
    }

    // 3. Load permissions for this role
    let mut perm_stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, p.created_at
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?1"
    ).map_err(|e| e.to_string())?;

    let permissions: Vec<AuthPermission> = perm_stmt
        .query_map(rusqlite::params![r_id], |row| {
            Ok(AuthPermission {
                id:          row.get(0)?,
                name:        row.get(1)?,
                description: row.get(2)?,
                created_at:  row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 4. Build session
    let session = AuthSession {
        token: crypto::generate_random_hex(32),
        expires_at: (chrono::Utc::now() + chrono::Duration::hours(8)).to_rfc3339(),
        user: AuthUser {
            id: uid,
            username,
            email,
            name,
            role_id,
            created_at,
            updated_at,
            role: Some(AuthRole {
                id: r_id,
                name: r_name,
                description: r_desc,
                permissions,
                created_at: r_created_at,
            }),
        },
    };

    // 5. Store session in managed state
    *session_state.0.lock().map_err(|e| e.to_string())? = Some(session.clone());
    Ok(session)
}

/// Logout: clear the in-memory session.
#[tauri::command]
pub async fn auth_logout(session_state: State<'_, SessionState>) -> Result<(), String> {
    *session_state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

/// Get current session — returns None if not logged in.
#[tauri::command]
pub async fn auth_get_session(
    session_state: State<'_, SessionState>,
) -> Result<Option<AuthSession>, String> {
    Ok(session_state.0.lock().map_err(|e| e.to_string())?.clone())
}

/// Change password for the currently authenticated user.
#[tauri::command]
pub async fn auth_change_password(
    current_password: String,
    new_password: String,
    db: State<'_, DbState>,
    session_state: State<'_, SessionState>,
) -> Result<(), String> {
    let session = session_state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Not authenticated")?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Get current hash
    let current_hash: String = conn.query_row(
        "SELECT password_hash FROM users WHERE id = ?1",
        rusqlite::params![session.user.id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Verify current password
    let valid = crypto::verify_password(&current_password, &current_hash)
        .map_err(|e| e.to_string())?;
    if !valid {
        return Err("Current password is incorrect".into());
    }

    // Validate new password length
    if new_password.len() < 8 {
        return Err("New password must be at least 8 characters".into());
    }

    // Hash new password
    let new_hash = crypto::hash_password(&new_password).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![new_hash, chrono::Utc::now().to_rfc3339(), session.user.id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

//! GemGym — Licensing & Activation Commands
//!
//! Generates a unique hardware fingerprint and manages license activation.

use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::state::DbState;
use crate::services::crypto;

// ── Response Types ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub id: String,
    pub license_key: String,
    pub status: String,
    pub activation_date: Option<String>,
    pub expiration_date: Option<String>,
    pub hardware_fingerprint: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────

/// Generates a stable hardware fingerprint for this machine.
/// Combines the system hostname, OS version, and MAC address (if available) or host id.
fn generate_fingerprint() -> String {
    let host_name = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let os_ver = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    
    let raw = format!("{}-{}", host_name, os_ver);
    // Hash it for a clean string
    crypto::generate_random_hex(16) // For simplicity right now, returning a fixed string or pseudo-stable would be better.
}

/// A more stable fingerprint implementation
fn generate_stable_fingerprint() -> String {
    let host_name = System::host_name().unwrap_or_else(|| "UnknownHost".to_string());
    let raw_string = format!("GEMGYM-{}", host_name.to_uppercase());
    
    raw_string
}

// ── Commands ──────────────────────────────────────────────────────────────

/// Retrieves the hardware fingerprint for license activation.
#[tauri::command]
pub async fn license_get_fingerprint() -> Result<String, String> {
    Ok(generate_stable_fingerprint())
}

/// Retrieves the current active license (or the trial license).
#[tauri::command]
pub async fn license_get(db: State<'_, DbState>) -> Result<Option<LicenseInfo>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT id, license_key, status, activation_date, expiration_date, hardware_fingerprint
         FROM licenses
         ORDER BY created_at DESC LIMIT 1",
        [],
        |row| Ok(LicenseInfo {
            id:                   row.get(0)?,
            license_key:          row.get(1)?,
            status:               row.get(2)?,
            activation_date:      row.get(3)?,
            expiration_date:      row.get(4)?,
            hardware_fingerprint: row.get(5)?,
        }),
    );

    match row {
        Ok(info) => Ok(Some(info)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("DB error: {}", e)),
    }
}

/// Activates a new license key.
#[tauri::command]
pub async fn license_activate(
    license_key: String,
    db: State<'_, DbState>,
) -> Result<LicenseInfo, String> {
    // Basic validation: Key must start with "GEMGYM-"
    if !license_key.starts_with("GEMGYM-") {
        return Err("Invalid license key format.".into());
    }

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let id = Uuid::new_v4().to_string();
    let fingerprint = generate_stable_fingerprint();
    let now = Utc::now().to_rfc3339();

    // Expire old active licenses (for simplicity just mark them invalid or keep them but add new one)
    // We will just clear old licenses and insert this one
    conn.execute("DELETE FROM licenses", []).ok();

    conn.execute(
        "INSERT INTO licenses 
         (id, license_key, status, activation_date, hardware_fingerprint, verified_at)
         VALUES (?1, ?2, 'active', ?3, ?4, ?5)",
        rusqlite::params![
            id,
            license_key,
            now,
            fingerprint,
            now
        ],
    ).map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT id, license_key, status, activation_date, expiration_date, hardware_fingerprint
         FROM licenses
         WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok(LicenseInfo {
            id:                   row.get(0)?,
            license_key:          row.get(1)?,
            status:               row.get(2)?,
            activation_date:      row.get(3)?,
            expiration_date:      row.get(4)?,
            hardware_fingerprint: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(row)
}

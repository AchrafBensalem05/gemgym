//! GemGym — RFID Cards Commands

use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use crate::state::DbState;

// ── Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RfidCard {
    pub id: String,
    pub card_uid: String,
    pub member_id: String,
    pub status: String,
    pub assigned_at: String,
    pub updated_at: String,
}

// ── Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn rfid_assign(
    card_uid: String,
    member_id: String,
    db: State<'_, DbState>,
) -> Result<RfidCard, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // In a real system, you might want to revoke any existing cards for this member
    // or revoke this card if it belonged to someone else.
    // For now, we'll just insert and assume the UI handles logic, but SQLite will enforce UNIQUE on card_uid.

    conn.execute(
        "INSERT INTO rfid_cards (id, card_uid, member_id, status, assigned_at, updated_at)
         VALUES (?1, ?2, ?3, 'active', ?4, ?5)
         ON CONFLICT(card_uid) DO UPDATE SET 
            member_id = excluded.member_id, 
            status = 'active', 
            updated_at = excluded.updated_at",
        rusqlite::params![id, card_uid, member_id, now, now],
    ).map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT id, card_uid, member_id, status, assigned_at, updated_at
         FROM rfid_cards
         WHERE card_uid = ?1",
        rusqlite::params![card_uid],
        |row| Ok(RfidCard {
            id:          row.get(0)?,
            card_uid:    row.get(1)?,
            member_id:   row.get(2)?,
            status:      row.get(3)?,
            assigned_at: row.get(4)?,
            updated_at:  row.get(5)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(row)
}

#[tauri::command]
pub async fn rfid_revoke(
    card_uid: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE rfid_cards SET status = 'inactive', updated_at = ?1 WHERE card_uid = ?2",
        rusqlite::params![now, card_uid],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn rfid_get_by_uid(
    card_uid: String,
    db: State<'_, DbState>,
) -> Result<Option<RfidCard>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let row = conn.query_row(
        "SELECT id, card_uid, member_id, status, assigned_at, updated_at
         FROM rfid_cards
         WHERE card_uid = ?1",
        rusqlite::params![card_uid],
        |row| Ok(RfidCard {
            id:          row.get(0)?,
            card_uid:    row.get(1)?,
            member_id:   row.get(2)?,
            status:      row.get(3)?,
            assigned_at: row.get(4)?,
            updated_at:  row.get(5)?,
        }),
    );

    match row {
        Ok(card) => Ok(Some(card)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

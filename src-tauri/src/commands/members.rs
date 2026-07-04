//! GemGym — Members Tauri Commands
//!
//! Full CRUD for gym members with:
//! - Paginated listing with search and status filter
//! - Create, update, delete (soft-delete via status change)
//! - Automatic active_subscription_id tracking

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

use crate::state::DbState;

// ── Response Types ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MemberRow {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub date_of_birth: Option<String>,
    pub joined_date: String,
    pub status: String,
    pub photo_path: Option<String>,
    pub active_subscription_id: Option<String>,
    pub plan_name: Option<String>,
    pub subscription_end: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberListResult {
    pub data: Vec<MemberRow>,
    pub total: i64,
}

// ── Request Types ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMemberPayload {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub date_of_birth: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMemberPayload {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub date_of_birth: Option<String>,
    pub status: String,
}

// ── Helper ────────────────────────────────────────────────────────────────

fn fetch_member_by_id(conn: &rusqlite::Connection, id: &str) -> rusqlite::Result<MemberRow> {
    conn.query_row(
        "SELECT m.id, m.first_name, m.last_name, m.email_encrypted,
                m.phone_encrypted, m.date_of_birth, m.joined_date, m.status,
                m.photo_path, m.active_subscription_id,
                mp.name as plan_name, s.end_date as subscription_end,
                m.created_at, m.updated_at
         FROM members m
         LEFT JOIN subscriptions s ON m.active_subscription_id = s.id
         LEFT JOIN membership_plans mp ON s.plan_id = mp.id
         WHERE m.id = ?1",
        rusqlite::params![id],
        map_member_row,
    )
}

/// Maps a rusqlite Row into a MemberRow.
/// NOTE: email and phone are stored as plain text for now (Milestone 3 adds AES encryption).
fn map_member_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemberRow> {
    Ok(MemberRow {
        id:                    row.get(0)?,
        first_name:            row.get(1)?,
        last_name:             row.get(2)?,
        email:                 row.get(3)?,
        phone:                 row.get(4)?,
        date_of_birth:         row.get(5)?,
        joined_date:           row.get(6)?,
        status:                row.get(7)?,
        photo_path:            row.get(8)?,
        active_subscription_id:row.get(9)?,
        plan_name:             row.get(10)?,
        subscription_end:      row.get(11)?,
        created_at:            row.get(12)?,
        updated_at:            row.get(13)?,
    })
}

// ── Commands ──────────────────────────────────────────────────────────────

/// List members with pagination, search, and status filter.
#[tauri::command]
pub async fn members_list(
    params: MemberListParams,
    db: State<'_, DbState>,
) -> Result<MemberListResult, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let page      = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset    = (page - 1) * page_size;

    let search_like = params.search
        .as_deref()
        .map(|s| format!("%{}%", s.to_lowercase()))
        .unwrap_or_else(|| "%".to_string());

    let status_filter = params.status.as_deref().unwrap_or("all");

    // Build status clause
    let status_sql = if status_filter == "all" {
        "1=1".to_string()
    } else {
        format!("m.status = '{}'", status_filter.replace('\'', ""))
    };

    // Count total
    let count_sql = format!(
        "SELECT COUNT(*) FROM members m
         WHERE {status_sql}
         AND (LOWER(m.first_name || ' ' || m.last_name) LIKE ?1
              OR LOWER(m.email_encrypted) LIKE ?1)"
    );
    let total: i64 = conn.query_row(
        &count_sql,
        rusqlite::params![search_like],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    // Fetch page
    let data_sql = format!(
        "SELECT m.id, m.first_name, m.last_name, m.email_encrypted,
                m.phone_encrypted, m.date_of_birth, m.joined_date, m.status,
                m.photo_path, m.active_subscription_id,
                mp.name as plan_name, s.end_date as subscription_end,
                m.created_at, m.updated_at
         FROM members m
         LEFT JOIN subscriptions s ON m.active_subscription_id = s.id
         LEFT JOIN membership_plans mp ON s.plan_id = mp.id
         WHERE {status_sql}
         AND (LOWER(m.first_name || ' ' || m.last_name) LIKE ?1
              OR LOWER(m.email_encrypted) LIKE ?1)
         ORDER BY m.created_at DESC
         LIMIT ?2 OFFSET ?3"
    );

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    let data: Vec<MemberRow> = stmt
        .query_map(rusqlite::params![search_like, page_size, offset], map_member_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(MemberListResult { data, total })
}

/// Get a single member by ID.
#[tauri::command]
pub async fn members_get(
    id: String,
    db: State<'_, DbState>,
) -> Result<MemberRow, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    fetch_member_by_id(&conn, &id).map_err(|e| e.to_string())
}

/// Create a new member.
#[tauri::command]
pub async fn members_create(
    payload: CreateMemberPayload,
    db: State<'_, DbState>,
) -> Result<MemberRow, String> {
    if payload.first_name.trim().is_empty() || payload.last_name.trim().is_empty() {
        return Err("First and last name are required".into());
    }

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id  = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    conn.execute(
        "INSERT INTO members
         (id, first_name, last_name, email_encrypted, phone_encrypted,
          date_of_birth, joined_date, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8, ?9)",
        rusqlite::params![
            id,
            payload.first_name.trim(),
            payload.last_name.trim(),
            payload.email,
            payload.phone,
            payload.date_of_birth,
            today,
            now,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    fetch_member_by_id(&conn, &id).map_err(|e| e.to_string())
}

/// Update an existing member's details.
#[tauri::command]
pub async fn members_update(
    payload: UpdateMemberPayload,
    db: State<'_, DbState>,
) -> Result<MemberRow, String> {
    if payload.first_name.trim().is_empty() || payload.last_name.trim().is_empty() {
        return Err("First and last name are required".into());
    }

    let valid_statuses = ["active", "inactive", "suspended", "expired"];
    if !valid_statuses.contains(&payload.status.as_str()) {
        return Err(format!("Invalid status: {}", payload.status));
    }

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows_changed = conn.execute(
        "UPDATE members SET
         first_name = ?1, last_name = ?2, email_encrypted = ?3,
         phone_encrypted = ?4, date_of_birth = ?5, status = ?6, updated_at = ?7
         WHERE id = ?8",
        rusqlite::params![
            payload.first_name.trim(),
            payload.last_name.trim(),
            payload.email,
            payload.phone,
            payload.date_of_birth,
            payload.status,
            now,
            payload.id,
        ],
    ).map_err(|e| e.to_string())?;

    if rows_changed == 0 {
        return Err(format!("Member {} not found", payload.id));
    }

    fetch_member_by_id(&conn, &payload.id).map_err(|e| e.to_string())
}

/// Soft-delete a member by setting status to 'inactive'.
#[tauri::command]
pub async fn members_delete(
    id: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE members SET status = 'inactive', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err(format!("Member {} not found", id));
    }
    Ok(())
}

/// Dashboard statistics pulled live from the database.
#[tauri::command]
pub async fn dashboard_stats(db: State<'_, DbState>) -> Result<DashboardStats, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let active_members: i64 = conn.query_row(
        "SELECT COUNT(*) FROM members WHERE status = 'active'", [], |r| r.get(0)
    ).unwrap_or(0);

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let month_start = Utc::now().format("%Y-%m-01").to_string();

    let new_members_month: i64 = conn.query_row(
        "SELECT COUNT(*) FROM members WHERE joined_date >= ?1", rusqlite::params![month_start], |r| r.get(0)
    ).unwrap_or(0);

    let check_ins_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM attendance WHERE DATE(check_in_time) = ?1", rusqlite::params![today], |r| r.get(0)
    ).unwrap_or(0);

    let revenue_month: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'completed' AND DATE(created_at) >= ?1",
        rusqlite::params![month_start], |r| r.get(0)
    ).unwrap_or(0.0);

    let expenses_month: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ?1",
        rusqlite::params![month_start], |r| r.get(0)
    ).unwrap_or(0.0);

    let expiring_soon: i64 = conn.query_row(
        "SELECT COUNT(*) FROM subscriptions
         WHERE status = 'active' AND end_date BETWEEN ?1 AND DATE(?1, '+7 days')",
        rusqlite::params![today], |r| r.get(0)
    ).unwrap_or(0);

    let low_stock: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_alert",
        [], |r| r.get(0)
    ).unwrap_or(0);

    Ok(DashboardStats {
        active_members,
        new_members_month,
        check_ins_today,
        revenue_month,
        expenses_month,
        expiring_soon,
        low_stock,
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub active_members: i64,
    pub new_members_month: i64,
    pub check_ins_today: i64,
    pub revenue_month: f64,
    pub expenses_month: f64,
    pub expiring_soon: i64,
    pub low_stock: i64,
}

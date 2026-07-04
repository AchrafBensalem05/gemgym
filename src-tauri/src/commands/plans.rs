//! GemGym — Membership Plans Commands

use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use crate::state::DbState;

// ── Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MembershipPlan {
    pub id: String,
    pub name: String,
    pub description: String,
    pub duration_months: i64,
    pub price: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanPayload {
    pub name: String,
    pub description: Option<String>,
    pub duration_months: i64,
    pub price: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlanPayload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub duration_months: i64,
    pub price: f64,
    pub is_active: bool,
}

// ── Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn plans_list(db: State<'_, DbState>) -> Result<Vec<MembershipPlan>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, duration_months, price, is_active, created_at, updated_at
             FROM membership_plans
             ORDER BY price ASC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(MembershipPlan {
                id:              row.get(0)?,
                name:            row.get(1)?,
                description:     row.get(2)?,
                duration_months: row.get(3)?,
                price:           row.get(4)?,
                is_active:       row.get::<_, i64>(5)? == 1,
                created_at:      row.get(6)?,
                updated_at:      row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut plans = Vec::new();
    for p in iter {
        if let Ok(plan) = p {
            plans.push(plan);
        }
    }

    Ok(plans)
}

#[tauri::command]
pub async fn plans_create(
    payload: CreatePlanPayload,
    db: State<'_, DbState>,
) -> Result<MembershipPlan, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = payload.description.unwrap_or_default();

    conn.execute(
        "INSERT INTO membership_plans (id, name, description, duration_months, price, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
        rusqlite::params![
            id,
            payload.name,
            desc,
            payload.duration_months,
            payload.price,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(MembershipPlan {
        id,
        name: payload.name,
        description: desc,
        duration_months: payload.duration_months,
        price: payload.price,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn plans_update(
    payload: UpdatePlanPayload,
    db: State<'_, DbState>,
) -> Result<MembershipPlan, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let desc = payload.description.unwrap_or_default();
    let is_active_int = if payload.is_active { 1 } else { 0 };

    conn.execute(
        "UPDATE membership_plans
         SET name = ?1, description = ?2, duration_months = ?3, price = ?4, is_active = ?5, updated_at = ?6
         WHERE id = ?7",
        rusqlite::params![
            payload.name,
            desc,
            payload.duration_months,
            payload.price,
            is_active_int,
            now,
            payload.id
        ],
    ).map_err(|e| e.to_string())?;

    // Return the updated plan by fetching it
    let mut stmt = conn
        .prepare("SELECT created_at FROM membership_plans WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let created_at: String = stmt
        .query_row(rusqlite::params![payload.id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(MembershipPlan {
        id: payload.id,
        name: payload.name,
        description: desc,
        duration_months: payload.duration_months,
        price: payload.price,
        is_active: payload.is_active,
        created_at,
        updated_at: now,
    })
}

//! GemGym — Subscriptions Commands

use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::{Utc, Datelike};
use uuid::Uuid;
use crate::state::DbState;

// ── Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionRow {
    pub id: String,
    pub member_id: String,
    pub member_name: String,
    pub plan_id: String,
    pub plan_name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub price_paid: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubscriptionPayload {
    pub member_id: String,
    pub plan_id: String,
    pub start_date: String, // YYYY-MM-DD
    pub payment_method: String,
}

// ── Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn subscriptions_list(db: State<'_, DbState>) -> Result<Vec<SubscriptionRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                s.id, s.member_id, m.first_name || ' ' || m.last_name as member_name,
                s.plan_id, p.name as plan_name,
                s.start_date, s.end_date, s.status, s.price_paid,
                s.created_at, s.updated_at
             FROM subscriptions s
             JOIN members m ON s.member_id = m.id
             JOIN membership_plans p ON s.plan_id = p.id
             ORDER BY s.created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(SubscriptionRow {
                id:          row.get(0)?,
                member_id:   row.get(1)?,
                member_name: row.get(2)?,
                plan_id:     row.get(3)?,
                plan_name:   row.get(4)?,
                start_date:  row.get(5)?,
                end_date:    row.get(6)?,
                status:      row.get(7)?,
                price_paid:  row.get(8)?,
                created_at:  row.get(9)?,
                updated_at:  row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut subs = Vec::new();
    for s in iter {
        if let Ok(sub) = s {
            subs.push(sub);
        }
    }

    Ok(subs)
}

#[tauri::command]
pub async fn subscriptions_create(
    payload: CreateSubscriptionPayload,
    db: State<'_, DbState>,
) -> Result<SubscriptionRow, String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;

    // We must fetch the plan details to get duration and price
    let mut plan_stmt = conn.prepare("SELECT duration_months, price, name FROM membership_plans WHERE id = ?1").map_err(|e| e.to_string())?;
    
    let (duration_months, price, plan_name): (i64, f64, String) = plan_stmt.query_row(rusqlite::params![payload.plan_id], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|_| "Plan not found".to_string())?;

    drop(plan_stmt);

    // Parse start_date
    let start_date = chrono::NaiveDate::parse_from_str(&payload.start_date, "%Y-%m-%d")
        .map_err(|_| "Invalid start_date format, expected YYYY-MM-DD".to_string())?;
    
    // Add months to calculate end date (rough calculation, handles rollover natively)
    let end_date = start_date.with_month0((start_date.month0() + duration_months as u32) % 12)
        .and_then(|d| d.with_year(d.year() + ((start_date.month0() + duration_months as u32) / 12) as i32))
        .unwrap_or(start_date); // fallback but chrono usually handles it

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let start_str = start_date.format("%Y-%m-%d").to_string();
    let end_str = end_date.format("%Y-%m-%d").to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO subscriptions (id, member_id, plan_id, start_date, end_date, status, price_paid, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, ?8)",
        rusqlite::params![
            id,
            payload.member_id,
            payload.plan_id,
            start_str,
            end_str,
            price,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;

    // Also update the member's active_subscription_id
    tx.execute(
        "UPDATE members SET active_subscription_id = ?1 WHERE id = ?2",
        rusqlite::params![id, payload.member_id],
    ).map_err(|e| e.to_string())?;

    // Auto-record the payment
    let payment_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO payments (id, member_id, subscription_id, amount, payment_method, payment_status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'completed', ?6)",
        rusqlite::params![
            payment_id,
            payload.member_id,
            id,
            price,
            payload.payment_method,
            now
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    // fetch member name for response
    let mut member_stmt = conn.prepare("SELECT first_name || ' ' || last_name FROM members WHERE id = ?1").map_err(|e| e.to_string())?;
    let member_name: String = member_stmt.query_row(rusqlite::params![payload.member_id], |row| row.get(0)).map_err(|e| e.to_string())?;

    Ok(SubscriptionRow {
        id,
        member_id: payload.member_id,
        member_name,
        plan_id: payload.plan_id,
        plan_name,
        start_date: start_str,
        end_date: end_str,
        status: "active".to_string(),
        price_paid: price,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn subscriptions_cancel(
    id: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE subscriptions SET status = 'cancelled', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    // Optional: could remove active_subscription_id from members here if needed.

    Ok(())
}

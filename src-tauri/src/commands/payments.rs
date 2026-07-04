//! GemGym — Payments Commands

use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use crate::state::DbState;

// ── Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRow {
    pub id: String,
    pub member_id: String,
    pub member_name: String,
    pub subscription_id: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub transaction_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaymentPayload {
    pub member_id: String,
    pub subscription_id: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub transaction_id: Option<String>,
}

// ── Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn payments_list(db: State<'_, DbState>) -> Result<Vec<PaymentRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                p.id, p.member_id, m.first_name || ' ' || m.last_name as member_name,
                p.subscription_id, p.amount, p.payment_method, p.payment_status, 
                p.transaction_id, p.created_at
             FROM payments p
             JOIN members m ON p.member_id = m.id
             ORDER BY p.created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(PaymentRow {
                id:              row.get(0)?,
                member_id:       row.get(1)?,
                member_name:     row.get(2)?,
                subscription_id: row.get(3)?,
                amount:          row.get(4)?,
                payment_method:  row.get(5)?,
                payment_status:  row.get(6)?,
                transaction_id:  row.get(7)?,
                created_at:      row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut payments = Vec::new();
    for p in iter {
        if let Ok(payment) = p {
            payments.push(payment);
        }
    }

    Ok(payments)
}

#[tauri::command]
pub async fn payments_create(
    payload: CreatePaymentPayload,
    db: State<'_, DbState>,
) -> Result<PaymentRow, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO payments (id, member_id, subscription_id, amount, payment_method, payment_status, transaction_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'completed', ?6, ?7)",
        rusqlite::params![
            id,
            payload.member_id,
            payload.subscription_id,
            payload.amount,
            payload.payment_method,
            payload.transaction_id,
            now
        ],
    ).map_err(|e| e.to_string())?;

    // Fetch the inserted row (to get the member name)
    let mut stmt = conn
        .prepare("SELECT first_name || ' ' || last_name FROM members WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let member_name: String = stmt
        .query_row(rusqlite::params![payload.member_id], |row| row.get(0))
        .map_err(|_| "Unknown Member".to_string())?;

    Ok(PaymentRow {
        id,
        member_id: payload.member_id,
        member_name,
        subscription_id: payload.subscription_id,
        amount: payload.amount,
        payment_method: payload.payment_method,
        payment_status: "completed".to_string(),
        transaction_id: payload.transaction_id,
        created_at: now,
    })
}

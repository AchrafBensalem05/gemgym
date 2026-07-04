//! GemGym — Tauri Application Entry Point (lib.rs)
//!
//! Responsibilities on startup:
//! 1. Open the SQLite database (WAL mode, FK enforcement)
//! 2. Run schema migrations (CREATE TABLE IF NOT EXISTS)
//! 3. Seed default roles, permissions, and admin user
//! 4. Register all managed state
//! 5. Register all IPC command handlers

mod commands;
mod services;
mod state;

use services::database::initialize_database;
use services::seed;
use state::{DbState, SessionState};

pub struct PythonProcess(pub std::sync::Mutex<Option<std::process::Child>>);
use commands::auth::{auth_login, auth_logout, auth_get_session, auth_change_password};
use commands::users::{roles_list, users_list, users_create, users_update};
use commands::members::{members_list, members_get, members_create, members_update, members_delete, members_set_embedding, dashboard_stats};
use commands::license::{license_get_fingerprint, license_get, license_activate};
use commands::plans::{plans_list, plans_create, plans_update};
use commands::subscriptions::{subscriptions_list, subscriptions_create, subscriptions_cancel};
use commands::rfids::{rfid_assign, rfid_revoke, rfid_get_by_uid};
use commands::payments::{payments_list, payments_create};
use commands::hardware::hardware_trigger_door;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ───────────────────────────────────────────────────────
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())

        // ── Setup Hook ────────────────────────────────────────────────────
        // Runs after the Tauri app is built but before any window is shown.
        .setup(|app| {
            // Resolve the app data directory for the current platform
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            // Ensure the directory exists
            std::fs::create_dir_all(&data_dir)
                .expect("Failed to create app data directory");

            let db_path = data_dir.join("gemgym.db");

            // Open database and run migrations
            let conn = initialize_database(&db_path)
                .expect("Failed to initialize SQLite database");

            // Seed roles, permissions, and default admin user
            seed::seed(&conn)
                .expect("Failed to seed database");

            // Register managed state
            app.manage(DbState(Mutex::new(conn)));
            app.manage(SessionState(Mutex::new(None)));

            // ── Spawn Python Background Service (Sidecar) ──
            // We'll spawn the venv python directly for development.
            let mut python_path = std::env::current_dir().unwrap_or_default();
            if python_path.ends_with("src-tauri") {
                python_path.pop();
            }
            let script_path = python_path.join("src-python").join("main.py");
            python_path = python_path.join("venv").join("bin").join("python");

            match std::process::Command::new(&python_path)
                .arg(&script_path)
                .spawn() 
            {
                Ok(child) => {
                    println!("Successfully spawned python background service (PID: {})", child.id());
                    // Keep the child alive in state so we can kill it later if needed (or it drops when app exits)
                    app.manage(PythonProcess(Mutex::new(Some(child))));
                }
                Err(e) => {
                    eprintln!("Failed to spawn python background service: {}", e);
                }
            }

            Ok(())
        })

        // ── IPC Command Handlers ──────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            // Auth
            auth_login,
            auth_logout,
            auth_get_session,
            auth_change_password,
            // Users & Roles
            roles_list,
            users_list,
            users_create,
            users_update,
            // Members
            members_list,
            members_get,
            members_create,
            members_update,
            members_delete,
            members_set_embedding,
            dashboard_stats,
            // License
            license_get_fingerprint,
            license_get,
            license_activate,
            // Plans
            plans_list,
            plans_create,
            plans_update,
            // Subscriptions
            subscriptions_list,
            subscriptions_create,
            subscriptions_cancel,
            // RFIDs
            rfid_assign,
            rfid_revoke,
            rfid_get_by_uid,
            // Payments
            payments_list,
            payments_create,
            // Hardware
            hardware_trigger_door,
        ])

        .run(tauri::generate_context!())
        .expect("error while running GemGym application");
}

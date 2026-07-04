//! GemGym — Application State
//!
//! Defines the globally managed Tauri state structs.
//! One `Mutex<Connection>` holds the SQLite connection for the app's lifetime.

use rusqlite::Connection;
use std::sync::Mutex;

use crate::commands::auth::AuthSession;

/// Wraps the SQLite connection for safe cross-thread access via Tauri state.
pub struct DbState(pub Mutex<Connection>);

/// Holds the current authenticated session (None if not logged in).
pub struct SessionState(pub Mutex<Option<AuthSession>>);

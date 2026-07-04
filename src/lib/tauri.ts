/**
 * GemGym — Tauri IPC Bridge
 *
 * Typed wrapper around @tauri-apps/api/core's invoke() function.
 * All Tauri command calls go through this module so we have a single
 * place to handle errors, logging, and type coercion.
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * Typed invoke wrapper. Throws a descriptive Error on Tauri command failure.
 *
 * @param command - The Rust command name (snake_case)
 * @param args    - Command arguments object
 * @returns Promise resolving to the typed return value
 */
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    // Tauri errors are typically strings from Rust's anyhow/thiserror
    const message = typeof err === "string" ? err : JSON.stringify(err);
    throw new Error(`[Tauri:${command}] ${message}`);
  }
}

/**
 * Known Tauri command names as a const map.
 * Centralizes command strings to avoid typos.
 */
export const Commands = {
  // Auth
  AUTH_LOGIN:              "auth_login",
  AUTH_LOGOUT:             "auth_logout",
  AUTH_GET_SESSION:        "auth_get_session",
  AUTH_CHANGE_PASSWORD:    "auth_change_password",

  // Members
  MEMBERS_LIST:            "members_list",
  MEMBERS_GET:             "members_get",
  MEMBERS_CREATE:          "members_create",
  MEMBERS_UPDATE:          "members_update",
  MEMBERS_DELETE:          "members_delete",
  MEMBERS_SET_EMBEDDING:   "members_set_embedding",

  // Plans
  PLANS_LIST:              "plans_list",
  PLANS_CREATE:            "plans_create",
  PLANS_UPDATE:            "plans_update",
  PLANS_DELETE:            "plans_delete",

  // Subscriptions
  SUBSCRIPTIONS_LIST:      "subscriptions_list",
  SUBSCRIPTIONS_CREATE:    "subscriptions_create",
  SUBSCRIPTIONS_CANCEL:    "subscriptions_cancel",

  // Attendance
  ATTENDANCE_LIST:         "attendance_list",
  ATTENDANCE_CHECK_IN:     "attendance_check_in",
  ATTENDANCE_CHECK_OUT:    "attendance_check_out",
  ATTENDANCE_STATS:        "attendance_stats",

  // Payments
  PAYMENTS_LIST:           "payments_list",
  PAYMENTS_CREATE:         "payments_create",

  // Expenses
  EXPENSES_LIST:           "expenses_list",
  EXPENSES_CREATE:         "expenses_create",
  EXPENSES_UPDATE:         "expenses_update",
  EXPENSES_DELETE:         "expenses_delete",

  // Products / Inventory
  PRODUCTS_LIST:           "products_list",
  PRODUCTS_CREATE:         "products_create",
  PRODUCTS_UPDATE:         "products_update",
  PRODUCTS_DELETE:         "products_delete",
  INVENTORY_ADJUST:        "inventory_adjust",
  INVENTORY_LOGS:          "inventory_logs",

  // POS / Sales
  SALES_LIST:              "sales_list",
  SALES_CREATE:            "sales_create",

  // RFID
  RFID_ASSIGN:             "rfid_assign",
  RFID_REVOKE:             "rfid_revoke",
  RFID_GET_BY_UID:         "rfid_get_by_uid",

  // Notifications
  NOTIFICATIONS_LIST:      "notifications_list",
  NOTIFICATIONS_MARK_READ: "notifications_mark_read",

  // Dashboard
  DASHBOARD_STATS:         "dashboard_stats",
  REVENUE_CHART:           "revenue_chart",
  ATTENDANCE_CHART:        "attendance_chart",

  // Settings
  SETTINGS_GET:            "settings_get",
  SETTINGS_SET:            "settings_set",

  // Licensing
  LICENSE_GET:             "license_get",
  LICENSE_ACTIVATE:        "license_activate",
  LICENSE_GET_FINGERPRINT: "license_get_fingerprint",

  // Audit
  AUDIT_LIST:              "audit_list",

  // Backups
  BACKUPS_LIST:            "backups_list",
  BACKUPS_CREATE:          "backups_create",
  BACKUPS_RESTORE:         "backups_restore",

  // Hardware
  HARDWARE_LIST:           "hardware_list",
  HARDWARE_SAVE:           "hardware_save",
  HARDWARE_TEST:           "hardware_test",
  HARDWARE_TRIGGER_DOOR:   "hardware_trigger_door",

  // Users / Roles
  USERS_LIST:              "users_list",
  USERS_CREATE:            "users_create",
  USERS_UPDATE:            "users_update",
  ROLES_LIST:              "roles_list",
  ROLES_CREATE:            "roles_create",
} as const;

/**
 * GemGym — Drizzle ORM Schema Definitions (SQLite)
 *
 * These definitions serve two purposes:
 * 1. TypeScript type inference via Drizzle's InferSelectModel / InferInsertModel
 * 2. Migration SQL generation via drizzle-kit
 *
 * IMPORTANT: All actual database queries are executed on the Rust side
 * using rusqlite and exposed as typed Tauri commands. This file is the
 * single source of truth for the database schema shape.
 */

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

/* ── Roles & Permissions ── */

export const roles = sqliteTable("roles", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt:   text("created_at").notNull(),
});

export const permissions = sqliteTable("permissions", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt:   text("created_at").notNull(),
});

export const rolePermissions = sqliteTable("role_permissions", {
  roleId:       text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

/* ── Users ── */

export const users = sqliteTable("users", {
  id:           text("id").primaryKey(),
  username:     text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email:        text("email").notNull().default(""),
  name:         text("name").notNull(),
  roleId:       text("role_id").notNull().references(() => roles.id),
  createdAt:    text("created_at").notNull(),
  updatedAt:    text("updated_at").notNull(),
});

/* ── Members ── */

export const members = sqliteTable("members", {
  id:                   text("id").primaryKey(),
  firstName:            text("first_name").notNull(),
  lastName:             text("last_name").notNull(),
  emailEncrypted:       text("email_encrypted"),
  phoneEncrypted:       text("phone_encrypted"),
  dateOfBirth:          text("date_of_birth"),
  joinedDate:           text("joined_date").notNull(),
  status:               text("status", { enum: ["active", "inactive", "suspended", "expired"] }).notNull().default("active"),
  photoPath:            text("photo_path"),
  activeSubscriptionId: text("active_subscription_id"),
  createdAt:            text("created_at").notNull(),
  updatedAt:            text("updated_at").notNull(),
}, (t) => [
  index("idx_members_status").on(t.status),
]);

/* ── Membership Plans ── */

export const membershipPlans = sqliteTable("membership_plans", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  description:    text("description").notNull().default(""),
  durationMonths: integer("duration_months").notNull(),
  price:          real("price").notNull(),
  isActive:       integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt:      text("created_at").notNull(),
  updatedAt:      text("updated_at").notNull(),
});

/* ── Subscriptions ── */

export const subscriptions = sqliteTable("subscriptions", {
  id:         text("id").primaryKey(),
  memberId:   text("member_id").notNull().references(() => members.id),
  planId:     text("plan_id").notNull().references(() => membershipPlans.id),
  startDate:  text("start_date").notNull(),
  endDate:    text("end_date").notNull(),
  status:     text("status", { enum: ["active", "expired", "cancelled", "pending"] }).notNull().default("active"),
  pricePaid:  real("price_paid").notNull(),
  createdAt:  text("created_at").notNull(),
  updatedAt:  text("updated_at").notNull(),
}, (t) => [
  index("idx_subscriptions_member").on(t.memberId),
  index("idx_subscriptions_status").on(t.status),
  index("idx_subscriptions_end_date").on(t.endDate),
]);

/* ── Attendance ── */

export const attendance = sqliteTable("attendance", {
  id:                 text("id").primaryKey(),
  memberId:           text("member_id").notNull().references(() => members.id),
  checkInTime:        text("check_in_time").notNull(),
  checkOutTime:       text("check_out_time"),
  verificationMethod: text("verification_method", { enum: ["face", "rfid", "manual", "pin"] }).notNull(),
  status:             text("status", { enum: ["checked_in", "checked_out"] }).notNull().default("checked_in"),
  deviceId:           text("device_id"),
  createdAt:          text("created_at").notNull(),
}, (t) => [
  index("idx_attendance_member").on(t.memberId),
  index("idx_attendance_check_in").on(t.checkInTime),
]);

/* ── Payments ── */

export const payments = sqliteTable("payments", {
  id:             text("id").primaryKey(),
  memberId:       text("member_id").notNull().references(() => members.id),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  amount:         real("amount").notNull(),
  paymentMethod:  text("payment_method", { enum: ["cash", "card", "bank_transfer", "other"] }).notNull(),
  paymentStatus:  text("payment_status", { enum: ["completed", "pending", "failed", "refunded"] }).notNull().default("completed"),
  transactionId:  text("transaction_id"),
  createdAt:      text("created_at").notNull(),
}, (t) => [
  index("idx_payments_member").on(t.memberId),
]);

/* ── Expenses ── */

export const expenses = sqliteTable("expenses", {
  id:          text("id").primaryKey(),
  title:       text("title").notNull(),
  category:    text("category", { enum: ["rent", "utilities", "equipment", "maintenance", "salaries", "marketing", "supplies", "other"] }).notNull(),
  amount:      real("amount").notNull(),
  date:        text("date").notNull(),
  description: text("description"),
  paidBy:      text("paid_by").notNull().references(() => users.id),
  createdAt:   text("created_at").notNull(),
});

/* ── Products ── */

export const products = sqliteTable("products", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  sku:           text("sku").notNull().unique(),
  barcode:       text("barcode").unique(),
  description:   text("description"),
  price:         real("price").notNull(),
  costPrice:     real("cost_price").notNull(),
  currentStock:  integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(5),
  createdAt:     text("created_at").notNull(),
  updatedAt:     text("updated_at").notNull(),
});

/* ── Inventory Logs ── */

export const inventoryLogs = sqliteTable("inventory_logs", {
  id:           text("id").primaryKey(),
  productId:    text("product_id").notNull().references(() => products.id),
  changeAmount: integer("change_amount").notNull(),
  logType:      text("log_type", { enum: ["purchase", "sale", "adjustment", "loss"] }).notNull(),
  reason:       text("reason").notNull(),
  performedBy:  text("performed_by").notNull().references(() => users.id),
  createdAt:    text("created_at").notNull(),
});

/* ── Sales ── */

export const sales = sqliteTable("sales", {
  id:            text("id").primaryKey(),
  memberId:      text("member_id").references(() => members.id),
  userId:        text("user_id").notNull().references(() => users.id),
  totalAmount:   real("total_amount").notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "bank_transfer", "other"] }).notNull(),
  createdAt:     text("created_at").notNull(),
}, (t) => [
  index("idx_sales_created_at").on(t.createdAt),
]);

export const saleItems = sqliteTable("sale_items", {
  id:         text("id").primaryKey(),
  saleId:     text("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId:  text("product_id").notNull().references(() => products.id),
  quantity:   integer("quantity").notNull(),
  unitPrice:  real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

/* ── RFID Cards ── */

export const rfidCards = sqliteTable("rfid_cards", {
  id:         text("id").primaryKey(),
  cardUid:    text("card_uid").notNull().unique(),
  memberId:   text("member_id").notNull().references(() => members.id),
  status:     text("status", { enum: ["active", "inactive", "lost"] }).notNull().default("active"),
  assignedAt: text("assigned_at").notNull(),
  updatedAt:  text("updated_at").notNull(),
});

/* ── Face Embeddings ── */

export const faceEmbeddings = sqliteTable("face_embeddings", {
  id:                 text("id").primaryKey(),
  memberId:           text("member_id").notNull().references(() => members.id),
  embeddingEncrypted: text("embedding_encrypted").notNull(),
  modelVersion:       text("model_version").notNull(),
  createdAt:          text("created_at").notNull(),
});

/* ── Audit Logs ── */

export const auditLogs = sqliteTable("audit_logs", {
  id:                  text("id").primaryKey(),
  userId:              text("user_id").notNull().references(() => users.id),
  action:              text("action").notNull(),
  tableName:           text("table_name").notNull(),
  recordId:            text("record_id").notNull(),
  oldValuesEncrypted:  text("old_values_encrypted"),
  newValuesEncrypted:  text("new_values_encrypted"),
  timestamp:           text("timestamp").notNull(),
}, (t) => [
  index("idx_audit_user").on(t.userId),
  index("idx_audit_table").on(t.tableName),
  index("idx_audit_timestamp").on(t.timestamp),
]);

/* ── Notifications ── */

export const notifications = sqliteTable("notifications", {
  id:         text("id").primaryKey(),
  memberId:   text("member_id").references(() => members.id),
  type:       text("type", { enum: ["subscription_expiry", "payment_due", "low_stock", "check_in", "system", "birthday"] }).notNull(),
  message:    text("message").notNull(),
  readStatus: integer("read_status", { mode: "boolean" }).notNull().default(false),
  createdAt:  text("created_at").notNull(),
});

/* ── Settings ── */

export const settings = sqliteTable("settings", {
  id:             text("id").primaryKey(),
  key:            text("key").notNull().unique(),
  valueEncrypted: text("value_encrypted").notNull(),
  category:       text("category").notNull().default("general"),
  updatedAt:      text("updated_at").notNull(),
});

/* ── Licenses ── */

export const licenses = sqliteTable("licenses", {
  id:                   text("id").primaryKey(),
  licenseKey:           text("license_key").notNull(),
  status:               text("status", { enum: ["active", "expired", "trial", "invalid"] }).notNull().default("trial"),
  activationDate:       text("activation_date"),
  expirationDate:       text("expiration_date"),
  hardwareFingerprint:  text("hardware_fingerprint").notNull(),
  signature:            text("signature"),
  verifiedAt:           text("verified_at"),
});

/* ── Backups ── */

export const backups = sqliteTable("backups", {
  id:           text("id").primaryKey(),
  filePath:     text("file_path").notNull(),
  backupType:   text("backup_type", { enum: ["automatic", "manual"] }).notNull(),
  status:       text("status", { enum: ["completed", "failed", "in_progress"] }).notNull(),
  errorMessage: text("error_message"),
  fileSize:     integer("file_size").notNull().default(0),
  createdAt:    text("created_at").notNull(),
});

/* ── Hardware ── */

export const hardware = sqliteTable("hardware", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  type:           text("type", { enum: ["door_controller", "rfid_reader", "camera", "printer"] }).notNull(),
  connectionType: text("connection_type", { enum: ["serial", "tcp", "usb", "virtual"] }).notNull(),
  ipAddress:      text("ip_address"),
  port:           integer("port"),
  status:         text("status", { enum: ["connected", "disconnected", "error", "unknown"] }).notNull().default("unknown"),
  configuration:  text("configuration").notNull().default("{}"),
  createdAt:      text("created_at").notNull(),
});

/* ── Drizzle Inferred Types ── */

export type SelectRole          = typeof roles.$inferSelect;
export type InsertRole          = typeof roles.$inferInsert;
export type SelectPermission    = typeof permissions.$inferSelect;
export type SelectUser          = typeof users.$inferSelect;
export type InsertUser          = typeof users.$inferInsert;
export type SelectMember        = typeof members.$inferSelect;
export type InsertMember        = typeof members.$inferInsert;
export type SelectPlan          = typeof membershipPlans.$inferSelect;
export type InsertPlan          = typeof membershipPlans.$inferInsert;
export type SelectSubscription  = typeof subscriptions.$inferSelect;
export type InsertSubscription  = typeof subscriptions.$inferInsert;
export type SelectAttendance    = typeof attendance.$inferSelect;
export type InsertAttendance    = typeof attendance.$inferInsert;
export type SelectPayment       = typeof payments.$inferSelect;
export type InsertPayment       = typeof payments.$inferInsert;
export type SelectExpense       = typeof expenses.$inferSelect;
export type InsertExpense       = typeof expenses.$inferInsert;
export type SelectProduct       = typeof products.$inferSelect;
export type InsertProduct       = typeof products.$inferInsert;
export type SelectSale          = typeof sales.$inferSelect;
export type InsertSale          = typeof sales.$inferInsert;
export type SelectRfidCard      = typeof rfidCards.$inferSelect;
export type SelectNotification  = typeof notifications.$inferSelect;
export type SelectAuditLog      = typeof auditLogs.$inferSelect;
export type SelectLicense       = typeof licenses.$inferSelect;
export type SelectBackup        = typeof backups.$inferSelect;
export type SelectHardware      = typeof hardware.$inferSelect;

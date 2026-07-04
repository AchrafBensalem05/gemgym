/**
 * GemGym — Shared TypeScript Types
 *
 * Central type definitions for all domain entities.
 * These mirror the SQLite schema on the Rust side.
 * All types are strict — no "any" used.
 */

/* ── Common ── */

/** Generic paginated response from Tauri commands */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Sorting configuration */
export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

/** Generic filter state for table components */
export interface TableFilters {
  search: string;
  page: number;
  pageSize: number;
  sort?: SortConfig;
  [key: string]: unknown;
}

/* ── Auth & RBAC ── */

export type PermissionName =
  | "members.view"
  | "members.create"
  | "members.edit"
  | "members.delete"
  | "subscriptions.view"
  | "subscriptions.create"
  | "subscriptions.edit"
  | "attendance.view"
  | "attendance.checkin"
  | "payments.view"
  | "payments.create"
  | "expenses.view"
  | "expenses.create"
  | "inventory.view"
  | "inventory.manage"
  | "pos.access"
  | "reports.view"
  | "settings.view"
  | "settings.edit"
  | "audit.view"
  | "hardware.manage"
  | "backup.manage"
  | "license.manage"
  | "roles.manage"
  | "users.manage";

export interface Permission {
  id: string;
  name: PermissionName;
  description: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  roleId: string;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

/** The authenticated session stored in React context */
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

/* ── Members ── */

export type MemberStatus = "active" | "inactive" | "suspended" | "expired";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  joinedDate: string;
  status: MemberStatus;
  photoPath?: string;
  activeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberWithSubscription extends Member {
  activeSubscription?: Subscription;
  rfidCard?: RfidCard;
}

/* ── Membership Plans ── */

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  durationMonths: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Subscriptions ── */

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";

export interface Subscription {
  id: string;
  memberId: string;
  planId: string;
  plan?: MembershipPlan;
  member?: Member;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  pricePaid: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Attendance ── */

export type VerificationMethod = "face" | "rfid" | "manual" | "pin";
export type AttendanceStatus = "checked_in" | "checked_out";

export interface Attendance {
  id: string;
  memberId: string;
  member?: Member;
  checkInTime: string;
  checkOutTime?: string;
  verificationMethod: VerificationMethod;
  status: AttendanceStatus;
  deviceId?: string;
  createdAt: string;
}

/* ── Payments ── */

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "other";
export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";

export interface Payment {
  id: string;
  memberId: string;
  member?: Member;
  subscriptionId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

/* ── Expenses ── */

export type ExpenseCategory =
  | "rent"
  | "utilities"
  | "equipment"
  | "maintenance"
  | "salaries"
  | "marketing"
  | "supplies"
  | "other";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  paidBy: string;
  paidByUser?: User;
  createdAt: string;
}

/* ── Products & Inventory ── */

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  price: number;
  costPrice: number;
  currentStock: number;
  minStockAlert: number;
  createdAt: string;
  updatedAt: string;
}

export type InventoryLogType = "purchase" | "sale" | "adjustment" | "loss";

export interface InventoryLog {
  id: string;
  productId: string;
  product?: Product;
  changeAmount: number;
  logType: InventoryLogType;
  reason: string;
  performedBy: string;
  createdAt: string;
}

/* ── Sales (POS) ── */

export interface Sale {
  id: string;
  memberId?: string;
  member?: Member;
  userId: string;
  processedBy?: User;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/* ── RFID ── */

export type RfidCardStatus = "active" | "inactive" | "lost";

export interface RfidCard {
  id: string;
  cardUid: string;
  memberId: string;
  member?: Member;
  status: RfidCardStatus;
  assignedAt: string;
  updatedAt: string;
}

/* ── Notifications ── */

export type NotificationType =
  | "subscription_expiry"
  | "payment_due"
  | "low_stock"
  | "check_in"
  | "system"
  | "birthday";

export interface Notification {
  id: string;
  memberId?: string;
  type: NotificationType;
  message: string;
  readStatus: boolean;
  createdAt: string;
}

/* ── Settings ── */

export interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

/* ── Licensing ── */

export type LicenseStatus = "active" | "expired" | "trial" | "invalid";

export interface License {
  id: string;
  licenseKey: string;
  status: LicenseStatus;
  activationDate: string;
  expirationDate: string;
  hardwareFingerprint: string;
  verifiedAt: string;
}

/* ── Audit Logs ── */

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  timestamp: string;
}

/* ── Backups ── */

export type BackupType = "automatic" | "manual";
export type BackupStatus = "completed" | "failed" | "in_progress";

export interface Backup {
  id: string;
  filePath: string;
  backupType: BackupType;
  status: BackupStatus;
  errorMessage?: string;
  fileSize: number;
  createdAt: string;
}

/* ── Hardware ── */

export type HardwareType = "door_controller" | "rfid_reader" | "camera" | "printer";
export type ConnectionType = "serial" | "tcp" | "usb" | "virtual";
export type HardwareStatus = "connected" | "disconnected" | "error" | "unknown";

export interface Hardware {
  id: string;
  name: string;
  type: HardwareType;
  connectionType: ConnectionType;
  ipAddress?: string;
  port?: number;
  status: HardwareStatus;
  configuration: Record<string, unknown>;
  createdAt: string;
}

/* ── Dashboard Stats ── */

export interface DashboardStats {
  activeMembers: number;
  newMembersThisMonth: number;
  checkInsToday: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  expiringSoon: number;
  lowStockProducts: number;
}

export interface RevenueChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface AttendanceChartPoint {
  day: string;
  checkIns: number;
}

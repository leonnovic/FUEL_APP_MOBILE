import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  decimal,
  int,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

// ═══════════════════════════════════════════════════════════
// AUTH & USERS
// ═══════════════════════════════════════════════════════════

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("userStatus", ["active", "suspended", "banned", "pending"]).default("active").notNull(),
  countryCode: varchar("countryCode", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ═══════════════════════════════════════════════════════════
// STATIONS & ACCESS CONTROL
// ═══════════════════════════════════════════════════════════

export const stations = mysqlTable("stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  location: varchar("location", { length: 500 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("countryCode", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  managerName: varchar("managerName", { length: 255 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance"]).default("active").notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0").notNull(),
  receiptFooter: text("receiptFooter"),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Station = typeof stations.$inferSelect;

export const stationUsers = mysqlTable("station_users", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  role: mysqlEnum("stationRole", ["owner", "manager", "cashier", "viewer"]).default("viewer").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// INVENTORY & SALES
// ═══════════════════════════════════════════════════════════

export const inventory = mysqlTable("inventory", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }).notNull(),
  fuelType: mysqlEnum("fuelType", ["petrol", "diesel", "premium", "kerosene", "lpg"]).notNull(),
  currentStock: decimal("currentStock", { precision: 12, scale: 2 }).default("0").notNull(),
  capacity: decimal("capacity", { precision: 12, scale: 2 }).default("0").notNull(),
  pricePerLiter: decimal("pricePerLiter", { precision: 10, scale: 2 }).default("0").notNull(),
  costPerLiter: decimal("costPerLiter", { precision: 10, scale: 2 }).default("0").notNull(),
  supplierName: varchar("supplierName", { length: 255 }),
  lastRestockedAt: timestamp("lastRestockedAt"),
  alertThreshold: decimal("alertThreshold", { precision: 12, scale: 2 }).default("500").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sales = mysqlTable("sales", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  fuelType: mysqlEnum("fuelType", ["petrol", "diesel", "premium", "kerosene", "lpg"]).notNull(),
  quantityLiters: decimal("quantityLiters", { precision: 12, scale: 2 }).notNull(),
  pricePerLiter: decimal("pricePerLiter", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 100 }).notNull(),
  pumpNumber: varchar("pumpNumber", { length: 20 }),
  receiptNumber: varchar("receiptNumber", { length: 50 }),
  notes: text("notes"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════

export const bankAccounts = mysqlTable("bank_accounts", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 100 }).notNull(),
  branch: varchar("branch", { length: 255 }),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  countryCode: varchar("countryCode", { length: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mobileMoneyConfigs = mysqlTable("mobile_money_configs", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  provider: varchar("provider", { length: 255 }).notNull(),
  paybillNumber: varchar("paybillNumber", { length: 100 }),
  accountReference: varchar("accountReference", { length: 100 }),
  apiKey: varchar("apiKey", { length: 500 }),
  shortCode: varchar("shortCode", { length: 50 }),
  countryCode: varchar("countryCode", { length: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const additionalPaymentMethods = mysqlTable("additional_payment_methods", {
  id: serial("id").primaryKey(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  config: text("config"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// AUDIT & FOUNDER SESSIONS
// ═══════════════════════════════════════════════════════════

export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }),
  event: varchar("event", { length: 255 }).notNull(),
  detail: text("detail"),
  severity: mysqlEnum("severity", ["info", "success", "warning", "danger"]).default("info").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const founderSessions = mysqlTable("founder_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  lastLoginAt: timestamp("lastLoginAt").defaultNow().notNull(),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  twoFactorSecret: varchar("twoFactorSecret", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  passwordHash: varchar("passwordHash", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — FEATURE FLAGS
// ═══════════════════════════════════════════════════════════

export const featureFlags = mysqlTable("feature_flags", {
  id: serial("id").primaryKey(),
  flagKey: varchar("flagKey", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(false).notNull(),
  scope: mysqlEnum("scope", ["global", "station", "user"]).default("global").notNull(),
  stationId: bigint("stationId", { mode: "number", unsigned: true }),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — PRICING & SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export const pricingPlans = mysqlTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "quarterly", "yearly", "lifetime"]).default("monthly").notNull(),
  maxStations: int("maxStations").default(1).notNull(),
  maxUsers: int("maxUsers").default(5).notNull(),
  features: text("features"), // JSON array of feature strings
  isActive: boolean("isActive").default(true).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type PricingPlan = typeof pricingPlans.$inferSelect;

export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  planId: bigint("planId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("subStatus", ["active", "trialing", "past_due", "canceled", "expired"]).default("active").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart").defaultNow().notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Subscription = typeof subscriptions.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — COUPONS
// ═══════════════════════════════════════════════════════════

export const coupons = mysqlTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount"]).default("percentage").notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  maxUses: int("maxUses").default(0).notNull(), // 0 = unlimited
  timesUsed: int("timesUsed").default(0).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — SYSTEM CONFIGURATION
// ═══════════════════════════════════════════════════════════

export const systemConfig = mysqlTable("system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 200 }).notNull().unique(),
  configValue: text("configValue"),
  configGroup: varchar("configGroup", { length: 100 }).default("general").notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(),
  updatedBy: bigint("updatedBy", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type SystemConfig = typeof systemConfig.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — API KEYS & WEBHOOKS
// ═══════════════════════════════════════════════════════════

export const apiKeys = mysqlTable("api_keys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("keyHash", { length: 500 }).notNull(),
  prefix: varchar("prefix", { length: 20 }).notNull(),
  permissions: text("permissions"), // JSON array of permission strings
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const webhooks = mysqlTable("webhooks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  events: text("events"), // JSON array of event names
  secret: varchar("secret", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  lastStatus: int("lastStatus"),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════

export const emailTemplates = mysqlTable("email_templates", {
  id: serial("id").primaryKey(),
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  bodyText: text("bodyText"),
  variables: text("variables"), // JSON array of available variable names
  isActive: boolean("isActive").default(true).notNull(),
  updatedBy: bigint("updatedBy", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — USER ACTIVITY LOG
// ═══════════════════════════════════════════════════════════

export const userActivityLog = mysqlTable("user_activity_log", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }), // 'station', 'sale', 'inventory', etc.
  entityId: bigint("entityId", { mode: "number", unsigned: true }),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// FOUNDER ACCESS — BACKUPS
// ═══════════════════════════════════════════════════════════

export const backups = mysqlTable("backups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("backupType", ["full", "schema", "data", "settings"]).default("full").notNull(),
  size: varchar("size", { length: 50 }),
  status: mysqlEnum("backupStatus", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  downloadUrl: text("downloadUrl"),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Backup = typeof backups.$inferSelect;

import { sql } from "drizzle-orm";
import { blob, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type BillingCycle = "weekly" | "monthly" | "yearly" | "custom_days";

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  billingCycle: text("billing_cycle", {
    enum: ["weekly", "monthly", "yearly", "custom_days"],
  })
    .notNull()
    .$type<BillingCycle>(),
  customIntervalDays: integer("custom_interval_days"),
  nextBillingDate: text("next_billing_date").notNull(),
  category: text("category").notNull(),
  notificationDaysBefore: integer("notification_days_before").notNull().default(3),
  appriseUrl: text("apprise_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isTrial: integer("is_trial", { mode: "boolean" }).notNull().default(false),
  splitCount: integer("split_count").notNull().default(1),
  lastNotifiedFor: text("last_notified_for"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const statusHistory = sqliteTable("status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  changedAt: text("changed_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  changedAt: text("changed_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type ExchangeRateMode = "manual" | "auto";

export const settings = sqliteTable("settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultAppriseUrl: text("default_apprise_url"),
  defaultCurrency: text("default_currency").notNull().default("CLP"),
  exchangeRateMode: text("exchange_rate_mode", { enum: ["manual", "auto"] })
    .notNull()
    .default("manual")
    .$type<ExchangeRateMode>(),
  manualExchangeRate: real("manual_exchange_rate"),
  monthlyBudget: real("monthly_budget"),
  budgetAlertSentFor: text("budget_alert_sent_for"),
});

export const exchangeRates = sqliteTable("exchange_rates", {
  pair: text("pair").primaryKey(),
  rate: real("rate").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const logoCache = sqliteTable("logo_cache", {
  urlHash: text("url_hash").primaryKey(),
  url: text("url").notNull(),
  contentType: text("content_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull().$type<Buffer>(),
  fetchedAt: text("fetched_at").notNull(),
});

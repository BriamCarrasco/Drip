import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const settings = sqliteTable("settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultAppriseUrl: text("default_apprise_url"),
  defaultCurrency: text("default_currency").notNull().default("CLP"),
});

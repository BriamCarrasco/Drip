import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, type ExchangeRateMode } from "@/drizzle/schema";

export type Settings = {
  defaultAppriseUrl: string | null;
  defaultCurrency: string;
  exchangeRateMode: ExchangeRateMode;
  manualExchangeRate: number | null;
  monthlyBudget: number | null;
  budgetAlertSentFor: string | null;
};

const defaultSettings: Settings = {
  defaultAppriseUrl: null,
  defaultCurrency: "CLP",
  exchangeRateMode: "manual",
  manualExchangeRate: null,
  monthlyBudget: null,
  budgetAlertSentFor: null,
};

export function getSettingsForUser(userId: number): Settings {
  const row = db.select().from(settings).where(eq(settings.userId, userId)).get();
  return row ?? defaultSettings;
}

export function isAutoExchangeRateEnabledForAnyUser(): boolean {
  const row = db.select().from(settings).where(eq(settings.exchangeRateMode, "auto")).get();
  return row !== undefined;
}

export type BudgetSettings = Settings & { userId: number; monthlyBudget: number };

export function getUsersWithMonthlyBudget(): BudgetSettings[] {
  return db
    .select()
    .from(settings)
    .where(isNotNull(settings.monthlyBudget))
    .all()
    .map((row) => ({ ...row, monthlyBudget: row.monthlyBudget as number }));
}

export function setBudgetAlertSentFor(userId: number, monthKey: string): void {
  db.update(settings).set({ budgetAlertSentFor: monthKey }).where(eq(settings.userId, userId)).run();
}

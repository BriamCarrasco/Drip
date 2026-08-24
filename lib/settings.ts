import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, type ExchangeRateMode } from "@/drizzle/schema";

export type Settings = {
  defaultAppriseUrl: string | null;
  defaultCurrency: string;
  exchangeRateMode: ExchangeRateMode;
  manualExchangeRate: number | null;
};

const defaultSettings: Settings = {
  defaultAppriseUrl: null,
  defaultCurrency: "CLP",
  exchangeRateMode: "manual",
  manualExchangeRate: null,
};

export function getSettingsForUser(userId: number): Settings {
  const row = db.select().from(settings).where(eq(settings.userId, userId)).get();
  return row ?? defaultSettings;
}

export function isAutoExchangeRateEnabledForAnyUser(): boolean {
  const row = db.select().from(settings).where(eq(settings.exchangeRateMode, "auto")).get();
  return row !== undefined;
}

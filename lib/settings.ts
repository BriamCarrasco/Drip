import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/drizzle/schema";

export type Settings = {
  defaultAppriseUrl: string | null;
  defaultCurrency: string;
};

const defaultSettings: Settings = {
  defaultAppriseUrl: null,
  defaultCurrency: "CLP",
};

export function getSettingsForUser(userId: number): Settings {
  const row = db.select().from(settings).where(eq(settings.userId, userId)).get();
  return row ?? defaultSettings;
}

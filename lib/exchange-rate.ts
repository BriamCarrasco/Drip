import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exchangeRates, historicalExchangeRates } from "@/drizzle/schema";
import type { Settings } from "@/lib/settings";

export { convertToCurrency } from "@/lib/currency-utils";

const USD_CLP_PAIR = "USD_CLP";
const FETCH_URL = "https://mindicador.cl/api/dolar";

export function getStoredUsdClpRate(): { rate: number; updatedAt: string } | null {
  const row = db.select().from(exchangeRates).get();
  if (!row || row.pair !== USD_CLP_PAIR) return null;
  return { rate: row.rate, updatedAt: row.updatedAt };
}

export async function fetchUsdClpRate(): Promise<number | null> {
  try {
    const response = await fetch(FETCH_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    const rate = data?.serie?.[0]?.valor;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

export async function refreshUsdClpRate(): Promise<number | null> {
  const rate = await fetchUsdClpRate();
  if (rate === null) return null;

  db.insert(exchangeRates)
    .values({ pair: USD_CLP_PAIR, rate, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: exchangeRates.pair,
      set: { rate, updatedAt: new Date().toISOString() },
    })
    .run();

  return rate;
}

function toMindicadorDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  return `${day}-${month}-${year}`;
}

async function fetchUsdClpRateForDate(dateIso: string): Promise<number | null> {
  try {
    const response = await fetch(`${FETCH_URL}/${toMindicadorDate(dateIso)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const rate = data?.serie?.[0]?.valor;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function findHistoricalUsdClpRate(dateIso: string): Promise<number | null> {
  const cursor = new Date(`${dateIso}T00:00:00`);
  for (let i = 0; i < 5; i++) {
    const rate = await fetchUsdClpRateForDate(cursor.toISOString().slice(0, 10));
    if (rate !== null) return rate;
    cursor.setDate(cursor.getDate() - 1);
  }
  return null;
}

const HISTORICAL_LOOKUP_BUDGET_MS = 6000;

export async function getOrFetchHistoricalUsdClpRate(dateIso: string): Promise<number | null> {
  const cached = db
    .select()
    .from(historicalExchangeRates)
    .where(eq(historicalExchangeRates.date, dateIso))
    .get();
  if (cached) return cached.rate;

  const rate = await Promise.race([
    findHistoricalUsdClpRate(dateIso),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), HISTORICAL_LOOKUP_BUDGET_MS)),
  ]);

  if (rate !== null) {
    db.insert(historicalExchangeRates).values({ date: dateIso, rate }).onConflictDoNothing().run();
  }
  return rate;
}

export function getEffectiveUsdClpRate(settings: Settings): number | null {
  if (settings.exchangeRateMode === "auto") {
    const stored = getStoredUsdClpRate();
    if (stored) return stored.rate;
  }
  return settings.manualExchangeRate;
}


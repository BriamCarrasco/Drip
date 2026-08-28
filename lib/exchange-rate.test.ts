import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { exchangeRates, historicalExchangeRates, settings, users } from "@/drizzle/schema";
import {
  fetchUsdClpRate,
  getEffectiveUsdClpRate,
  getOrFetchHistoricalUsdClpRate,
  getStoredUsdClpRate,
  refreshUsdClpRate,
} from "@/lib/exchange-rate";
import type { Settings } from "@/lib/settings";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

beforeEach(() => {
  db.delete(exchangeRates).run();
  db.delete(historicalExchangeRates).run();
  db.delete(settings).run();
  db.delete(users).run();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStoredUsdClpRate", () => {
  it("returns null when there is no stored rate", () => {
    expect(getStoredUsdClpRate()).toBeNull();
  });

  it("returns the stored rate and timestamp", () => {
    db.insert(exchangeRates).values({ pair: "USD_CLP", rate: 950, updatedAt: "2026-08-01T00:00:00.000Z" }).run();
    expect(getStoredUsdClpRate()).toEqual({ rate: 950, updatedAt: "2026-08-01T00:00:00.000Z" });
  });
});

describe("fetchUsdClpRate", () => {
  it("returns the rate from a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ serie: [{ valor: 950 }] })));
    expect(await fetchUsdClpRate()).toBe(950);
  });

  it("returns null when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    expect(await fetchUsdClpRate()).toBeNull();
  });

  it("returns null when the payload shape is unexpected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ serie: [] })));
    expect(await fetchUsdClpRate()).toBeNull();
  });

  it("returns null when the fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await fetchUsdClpRate()).toBeNull();
  });
});

describe("refreshUsdClpRate", () => {
  it("stores the freshly fetched rate and returns it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ serie: [{ valor: 960 }] })));

    const rate = await refreshUsdClpRate();

    expect(rate).toBe(960);
    expect(getStoredUsdClpRate()?.rate).toBe(960);
  });

  it("overwrites a previously stored rate", async () => {
    db.insert(exchangeRates).values({ pair: "USD_CLP", rate: 900, updatedAt: "2026-01-01T00:00:00.000Z" }).run();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ serie: [{ valor: 970 }] })));

    await refreshUsdClpRate();

    expect(getStoredUsdClpRate()?.rate).toBe(970);
  });

  it("leaves the stored rate untouched when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const rate = await refreshUsdClpRate();

    expect(rate).toBeNull();
    expect(getStoredUsdClpRate()).toBeNull();
  });
});

describe("getOrFetchHistoricalUsdClpRate", () => {
  it("returns a cached rate without calling fetch", async () => {
    db.insert(historicalExchangeRates).values({ date: "2026-06-01", rate: 900 }).run();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const rate = await getOrFetchHistoricalUsdClpRate("2026-06-01");

    expect(rate).toBe(900);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches and caches the rate for the requested date", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ serie: [{ valor: 880 }] })));

    const rate = await getOrFetchHistoricalUsdClpRate("2026-06-01");

    expect(rate).toBe(880);
    const cached = db.select().from(historicalExchangeRates).all().find((r) => r.date === "2026-06-01");
    expect(cached?.rate).toBe(880);
  });

  it("falls back to earlier days and returns null after exhausting attempts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));

    const rate = await getOrFetchHistoricalUsdClpRate("2026-06-01");

    expect(rate).toBeNull();
  });
});

describe("getEffectiveUsdClpRate", () => {
  const base: Settings = {
    defaultAppriseUrl: null,
    defaultCurrency: "CLP",
    exchangeRateMode: "manual",
    manualExchangeRate: 900,
    monthlyBudget: null,
    budgetAlertSentFor: null,
  };

  it("uses the manual rate in manual mode", () => {
    expect(getEffectiveUsdClpRate(base)).toBe(900);
  });

  it("uses the stored automatic rate when in auto mode and one is stored", () => {
    db.insert(exchangeRates).values({ pair: "USD_CLP", rate: 950, updatedAt: "2026-08-01T00:00:00.000Z" }).run();
    expect(getEffectiveUsdClpRate({ ...base, exchangeRateMode: "auto" })).toBe(950);
  });

  it("falls back to the manual rate in auto mode when nothing is stored yet", () => {
    expect(getEffectiveUsdClpRate({ ...base, exchangeRateMode: "auto" })).toBe(900);
  });
});

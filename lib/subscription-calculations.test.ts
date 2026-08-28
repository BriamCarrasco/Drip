import { describe, expect, it } from "vitest";
import {
  isActiveAt,
  monthlyEquivalent,
  monthlyTotalsByCurrency,
  normalizeSplitCount,
  priceAt,
} from "@/lib/subscription-calculations";

describe("normalizeSplitCount", () => {
  it("returns the given value when it is a positive number", () => {
    expect(normalizeSplitCount(4)).toBe(4);
  });

  it("falls back to 1 for zero, null or undefined", () => {
    expect(normalizeSplitCount(0)).toBe(1);
    expect(normalizeSplitCount(null)).toBe(1);
    expect(normalizeSplitCount(undefined)).toBe(1);
  });
});

describe("monthlyEquivalent", () => {
  it("keeps the amount as-is for monthly", () => {
    expect(monthlyEquivalent({ amount: 1000, billingCycle: "monthly" })).toBe(1000);
  });

  it("converts weekly to its monthly equivalent", () => {
    expect(monthlyEquivalent({ amount: 1000, billingCycle: "weekly" })).toBeCloseTo((1000 * 52) / 12);
  });

  it("converts yearly to its monthly equivalent", () => {
    expect(monthlyEquivalent({ amount: 1200, billingCycle: "yearly" })).toBeCloseTo(100);
  });

  it("converts custom_days using the given interval", () => {
    expect(monthlyEquivalent({ amount: 1000, billingCycle: "custom_days", customIntervalDays: 15 })).toBeCloseTo(
      (1000 * 365) / (15 * 12)
    );
  });

  it("falls back to a 30-day interval when none is given", () => {
    const withoutValue = monthlyEquivalent({ amount: 1000, billingCycle: "custom_days" });
    const withThirty = monthlyEquivalent({ amount: 1000, billingCycle: "custom_days", customIntervalDays: 30 });
    expect(withoutValue).toBeCloseTo(withThirty);
  });
});

describe("monthlyTotalsByCurrency", () => {
  it("sums subscriptions in the same currency", () => {
    const totals = monthlyTotalsByCurrency([
      { amount: 1000, currency: "CLP", billingCycle: "monthly" },
      { amount: 2000, currency: "CLP", billingCycle: "monthly" },
    ]);
    expect(totals).toEqual([{ currency: "CLP", total: 3000 }]);
  });

  it("keeps different currencies as separate totals", () => {
    const totals = monthlyTotalsByCurrency([
      { amount: 1000, currency: "CLP", billingCycle: "monthly" },
      { amount: 10, currency: "USD", billingCycle: "monthly" },
    ]);
    expect(totals).toEqual(
      expect.arrayContaining([
        { currency: "CLP", total: 1000 },
        { currency: "USD", total: 10 },
      ])
    );
  });

  it("divides by splitCount before totalling", () => {
    const totals = monthlyTotalsByCurrency([
      { amount: 1000, currency: "CLP", billingCycle: "monthly", splitCount: 4 },
    ]);
    expect(totals).toEqual([{ currency: "CLP", total: 250 }]);
  });
});

describe("isActiveAt", () => {
  it("treats a subscription with no history as always active", () => {
    expect(isActiveAt([], Date.now())).toBe(true);
  });

  it("is inactive before the earliest recorded status", () => {
    const history = [{ isActive: true, changedAt: "2026-06-01T00:00:00.000Z" }];
    const before = new Date("2026-05-01T00:00:00.000Z").getTime();
    expect(isActiveAt(history, before)).toBe(false);
  });

  it("reflects the most recent status at or before the given time", () => {
    const history = [
      { isActive: true, changedAt: "2026-06-01T00:00:00.000Z" },
      { isActive: false, changedAt: "2026-07-01T00:00:00.000Z" },
      { isActive: true, changedAt: "2026-08-01T00:00:00.000Z" },
    ];
    expect(isActiveAt(history, new Date("2026-06-15T00:00:00.000Z").getTime())).toBe(true);
    expect(isActiveAt(history, new Date("2026-07-15T00:00:00.000Z").getTime())).toBe(false);
    expect(isActiveAt(history, new Date("2026-09-01T00:00:00.000Z").getTime())).toBe(true);
  });
});

describe("priceAt", () => {
  it("returns null when there is no history", () => {
    expect(priceAt([], Date.now())).toBeNull();
  });

  it("picks the latest entry at or before the given time, regardless of input order", () => {
    const history = [
      { amount: 12990, changedAt: "2026-08-01T00:00:00.000Z" },
      { amount: 9990, changedAt: "2026-06-01T00:00:00.000Z" },
    ];
    const result = priceAt(history, new Date("2026-07-01T00:00:00.000Z").getTime());
    expect(result?.amount).toBe(9990);
  });
});

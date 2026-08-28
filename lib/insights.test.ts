import { describe, expect, it } from "vitest";
import {
  computeFxImpact,
  hasHistoryOlderThan,
  monthlyTotalsAt,
  totalsSpentBySubscription,
} from "@/lib/insights";
import { makeSubscription } from "@/lib/test-helpers";

describe("totalsSpentBySubscription", () => {
  it("sums each subscription's payment log and sorts by total descending", () => {
    const cheap = makeSubscription({ id: 1, name: "Spotify" });
    const expensive = makeSubscription({ id: 2, name: "Netflix" });

    const result = totalsSpentBySubscription(
      [cheap, expensive],
      new Map([
        [1, [{ amount: 5990, currency: "CLP", paidAt: "2026-08-01" }]],
        [2, [{ amount: 9990, currency: "CLP", paidAt: "2026-08-01" }, { amount: 9990, currency: "CLP", paidAt: "2026-09-01" }]],
      ])
    );

    expect(result[0].subscription.name).toBe("Netflix");
    expect(result[0].totalSpent).toBe(19980);
    expect(result[1].subscription.name).toBe("Spotify");
    expect(result[1].totalSpent).toBe(5990);
  });

  it("treats a subscription with no payments as zero", () => {
    const sub = makeSubscription({ id: 1 });
    const result = totalsSpentBySubscription([sub], new Map());
    expect(result[0].totalSpent).toBe(0);
  });
});

describe("hasHistoryOlderThan", () => {
  it("is true when at least one entry is older than the threshold", () => {
    const oldDate = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const map = new Map([[1, [{ amount: 100, currency: "CLP", changedAt: oldDate }]]]);
    expect(hasHistoryOlderThan(map, 330)).toBe(true);
  });

  it("is false when every entry is more recent than the threshold", () => {
    const recentDate = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const map = new Map([[1, [{ amount: 100, currency: "CLP", changedAt: recentDate }]]]);
    expect(hasHistoryOlderThan(map, 330)).toBe(false);
  });
});

describe("monthlyTotalsAt", () => {
  it("only counts subscriptions that were already priced and active at that point in time", () => {
    const sub = makeSubscription({ id: 1, billingCycle: "monthly", splitCount: 1 });
    const priceHistory = new Map([[1, [{ amount: 9990, currency: "CLP", changedAt: "2026-06-01T00:00:00.000Z" }]]]);
    const statusHistory = new Map([[1, [{ isActive: true, changedAt: "2026-06-01T00:00:00.000Z" }]]]);

    const before = new Date("2026-05-01T00:00:00.000Z").getTime();
    const after = new Date("2026-07-01T00:00:00.000Z").getTime();

    expect(monthlyTotalsAt([sub], priceHistory, statusHistory, before)).toEqual([]);
    expect(monthlyTotalsAt([sub], priceHistory, statusHistory, after)).toEqual([{ currency: "CLP", total: 9990 }]);
  });
});

describe("computeFxImpact", () => {
  it("decomposes a combined price change into vendor and fx portions", () => {
    const sub = makeSubscription({ id: 1, currency: "USD", amount: 10 });
    const priceHistory = new Map([[1, [{ amount: 8, currency: "USD", changedAt: "2026-06-28T00:00:00.000Z" }]]]);
    const firstRateBySub = new Map([[1, 850]]);

    const [row] = computeFxImpact([sub], priceHistory, firstRateBySub, "CLP", 918.42);

    expect(row.vendorPct).toBeCloseTo(25, 5);
    expect(row.fxPct).toBeCloseTo(8.049411764705883, 5);
    expect(row.combinedPct).toBeCloseTo(35.0617647058823, 5);
  });

  it("skips subscriptions with no historical rate available", () => {
    const sub = makeSubscription({ id: 1, currency: "USD", amount: 10 });
    const priceHistory = new Map([[1, [{ amount: 8, currency: "USD", changedAt: "2026-06-28T00:00:00.000Z" }]]]);

    expect(computeFxImpact([sub], priceHistory, new Map(), "CLP", 918.42)).toEqual([]);
  });
});

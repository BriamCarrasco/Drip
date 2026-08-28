import { describe, expect, it } from "vitest";
import { daysBetween, getDueSubscriptions, getOverdueSubscriptions } from "@/lib/scheduler-logic";
import { makeSubscription } from "@/lib/test-helpers";

describe("daysBetween", () => {
  it("is positive when the later date comes after the earlier one", () => {
    expect(daysBetween("2026-09-10", "2026-09-05")).toBe(5);
  });

  it("is negative when the later date is actually in the past", () => {
    expect(daysBetween("2026-09-01", "2026-09-05")).toBe(-4);
  });

  it("is zero for the same date", () => {
    expect(daysBetween("2026-09-05", "2026-09-05")).toBe(0);
  });
});

describe("getDueSubscriptions", () => {
  const today = "2026-09-01";

  it("includes a subscription due within its notification window", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-09-03", notificationDaysBefore: 3 });
    expect(getDueSubscriptions([sub], today)).toEqual([sub]);
  });

  it("excludes a subscription outside the notification window", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-09-10", notificationDaysBefore: 3 });
    expect(getDueSubscriptions([sub], today)).toEqual([]);
  });

  it("excludes an inactive subscription", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-09-03", notificationDaysBefore: 3, isActive: false });
    expect(getDueSubscriptions([sub], today)).toEqual([]);
  });

  it("excludes a subscription already notified for this exact billing date", () => {
    const sub = makeSubscription({
      nextBillingDate: "2026-09-03",
      notificationDaysBefore: 3,
      lastNotifiedFor: "2026-09-03",
    });
    expect(getDueSubscriptions([sub], today)).toEqual([]);
  });

  it("excludes an overdue subscription (negative days left)", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-08-20", notificationDaysBefore: 3 });
    expect(getDueSubscriptions([sub], today)).toEqual([]);
  });
});

describe("getOverdueSubscriptions", () => {
  const today = "2026-09-01";

  it("includes an active subscription whose billing date already passed", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-08-20" });
    expect(getOverdueSubscriptions([sub], today)).toEqual([sub]);
  });

  it("excludes a subscription due today or in the future", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-09-01" });
    expect(getOverdueSubscriptions([sub], today)).toEqual([]);
  });

  it("excludes an inactive subscription even if overdue", () => {
    const sub = makeSubscription({ nextBillingDate: "2026-08-20", isActive: false });
    expect(getOverdueSubscriptions([sub], today)).toEqual([]);
  });
});

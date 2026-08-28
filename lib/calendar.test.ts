import { describe, expect, it } from "vitest";
import { advanceDate, getOccurrencesInRange, subtractDate } from "@/lib/calendar";

describe("advanceDate", () => {
  it("adds 7 days for weekly", () => {
    const result = advanceDate(new Date("2026-09-01T00:00:00"), "weekly", null);
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-08");
  });

  it("adds 1 month for monthly", () => {
    const result = advanceDate(new Date("2026-09-05T00:00:00"), "monthly", null);
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("rolls over when the month is shorter (Jan 31 -> Mar 3)", () => {
    const result = advanceDate(new Date("2026-01-31T00:00:00"), "monthly", null);
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-03");
  });

  it("adds 1 year for yearly", () => {
    const result = advanceDate(new Date("2026-09-05T00:00:00"), "yearly", null);
    expect(result.toISOString().slice(0, 10)).toBe("2027-09-05");
  });

  it("adds the given custom interval in days", () => {
    const result = advanceDate(new Date("2026-09-01T00:00:00"), "custom_days", 10);
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-11");
  });

  it("falls back to 30 days when custom interval is missing or invalid", () => {
    const withoutValue = advanceDate(new Date("2026-09-01T00:00:00"), "custom_days", null);
    const withZero = advanceDate(new Date("2026-09-01T00:00:00"), "custom_days", 0);
    expect(withoutValue.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(withZero.toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});

describe("subtractDate", () => {
  it("mirrors advanceDate for every cycle", () => {
    const start = new Date("2026-09-05T00:00:00");
    for (const cycle of ["weekly", "monthly", "yearly", "custom_days"] as const) {
      const forward = advanceDate(start, cycle, 10);
      const back = subtractDate(forward, cycle, 10);
      expect(back.toISOString().slice(0, 10)).toBe(start.toISOString().slice(0, 10));
    }
  });
});

describe("getOccurrencesInRange", () => {
  const sub = {
    nextBillingDate: "2026-09-05",
    billingCycle: "monthly" as const,
    customIntervalDays: null,
  };

  it("returns every occurrence that falls inside the range", () => {
    const occurrences = getOccurrencesInRange(sub, "2026-09-01", "2026-12-31");
    expect(occurrences).toEqual(["2026-09-05", "2026-10-05", "2026-11-05", "2026-12-05"]);
  });

  it("returns nothing when the range is entirely before the first occurrence", () => {
    const occurrences = getOccurrencesInRange(sub, "2026-01-01", "2026-08-31");
    expect(occurrences).toEqual([]);
  });

  it("skips ahead to the first occurrence that lands inside a later range", () => {
    const occurrences = getOccurrencesInRange(sub, "2027-01-01", "2027-01-31");
    expect(occurrences).toEqual(["2027-01-05"]);
  });
});

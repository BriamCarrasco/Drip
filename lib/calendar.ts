import type { BillingCycle } from "@/drizzle/schema";

export function advanceDate(date: Date, cycle: BillingCycle, customIntervalDays?: number | null): Date {
  const next = new Date(date);
  switch (cycle) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case "custom_days": {
      const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30;
      next.setDate(next.getDate() + days);
      return next;
    }
  }
}

export function subtractDate(date: Date, cycle: BillingCycle, customIntervalDays?: number | null): Date {
  const prev = new Date(date);
  switch (cycle) {
    case "weekly":
      prev.setDate(prev.getDate() - 7);
      return prev;
    case "monthly":
      prev.setMonth(prev.getMonth() - 1);
      return prev;
    case "yearly":
      prev.setFullYear(prev.getFullYear() - 1);
      return prev;
    case "custom_days": {
      const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30;
      prev.setDate(prev.getDate() - days);
      return prev;
    }
  }
}

export function getOccurrencesInRange(
  sub: {
    nextBillingDate: string;
    billingCycle: BillingCycle;
    customIntervalDays?: number | null;
  },
  rangeStartIso: string,
  rangeEndIso: string
): string[] {
  const rangeStart = new Date(`${rangeStartIso}T00:00:00`);
  const rangeEnd = new Date(`${rangeEndIso}T00:00:00`);
  let cursor = new Date(`${sub.nextBillingDate}T00:00:00`);
  const occurrences: string[] = [];

  let guard = 0;
  while (cursor.getTime() <= rangeEnd.getTime() && guard < 500) {
    if (cursor.getTime() >= rangeStart.getTime()) {
      occurrences.push(cursor.toISOString().slice(0, 10));
    }
    cursor = advanceDate(cursor, sub.billingCycle, sub.customIntervalDays);
    guard += 1;
  }

  return occurrences;
}

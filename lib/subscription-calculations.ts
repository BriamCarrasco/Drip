import type { BillingCycle } from "@/drizzle/schema";
import { subtractDate } from "@/lib/calendar";

export function monthlyEquivalent(input: {
  amount: number;
  billingCycle: BillingCycle;
  customIntervalDays?: number | null;
}): number {
  switch (input.billingCycle) {
    case "weekly":
      return (input.amount * 52) / 12;
    case "monthly":
      return input.amount;
    case "yearly":
      return input.amount / 12;
    case "custom_days": {
      const days = input.customIntervalDays && input.customIntervalDays > 0 ? input.customIntervalDays : 30;
      return (input.amount * 365) / (days * 12);
    }
  }
}

export function monthlyTotalsByCurrency(
  subs: {
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
    customIntervalDays?: number | null;
    splitCount?: number;
  }[]
): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const sub of subs) {
    const splitCount = sub.splitCount && sub.splitCount > 0 ? sub.splitCount : 1;
    const cost = monthlyEquivalent({
      amount: sub.amount / splitCount,
      billingCycle: sub.billingCycle,
      customIntervalDays: sub.customIntervalDays,
    });
    totals.set(sub.currency, (totals.get(sub.currency) ?? 0) + cost);
  }
  return Array.from(totals, ([currency, total]) => ({ currency, total }));
}

export function isActiveAt(statusHistory: { isActive: boolean; changedAt: string }[], atMs: number): boolean {
  if (statusHistory.length === 0) return true;

  const past = statusHistory
    .filter((entry) => new Date(entry.changedAt).getTime() <= atMs)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));

  return past.length > 0 && past[past.length - 1].isActive;
}

export function priceAt<T extends { changedAt: string }>(history: T[], atMs: number): T | null {
  const past = history
    .filter((entry) => new Date(entry.changedAt).getTime() <= atMs)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));

  return past.length > 0 ? past[past.length - 1] : null;
}

export function estimateTotalSpent(
  sub: {
    billingCycle: BillingCycle;
    customIntervalDays?: number | null;
    nextBillingDate: string;
    splitCount?: number;
  },
  history: { amount: number; changedAt: string }[],
  statusHistory: { isActive: boolean; changedAt: string }[] = []
): number {
  if (history.length === 0) return 0;

  const historyStarts = history.map((entry) => new Date(entry.changedAt).getTime());
  const statusStarts = statusHistory.map((entry) => new Date(entry.changedAt).getTime());
  const floor = Math.min(...historyStarts, ...statusStarts);
  const now = Date.now();
  const splitCount = sub.splitCount && sub.splitCount > 0 ? sub.splitCount : 1;

  let cursor = new Date(`${sub.nextBillingDate}T00:00:00`);
  let guard = 0;
  while (cursor.getTime() > now && guard < 1000) {
    cursor = subtractDate(cursor, sub.billingCycle, sub.customIntervalDays);
    guard += 1;
  }

  let total = 0;
  guard = 0;
  while (cursor.getTime() >= floor && guard < 2000) {
    const atMs = cursor.getTime();
    if (isActiveAt(statusHistory, atMs)) {
      const price = priceAt(history, atMs);
      if (price) total += price.amount / splitCount;
    }
    cursor = subtractDate(cursor, sub.billingCycle, sub.customIntervalDays);
    guard += 1;
  }

  return total;
}

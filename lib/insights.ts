import type { BillingCycle } from "@/drizzle/schema";
import type { SubscriptionRow } from "@/lib/subscriptions";
import { isActiveAt, monthlyEquivalent, priceAt } from "@/lib/subscription-calculations";
import { convertToCurrency } from "@/lib/exchange-rate";
import { totalFromPaymentLog, type PaymentLogEntry } from "@/lib/payment-log";
import type { CurrencyTotal } from "@/lib/currency-summary";

export type PriceEntry = { amount: number; currency: string; changedAt: string };
export type StatusEntry = { isActive: boolean; changedAt: string };

export type SubscriptionSpend = {
  subscription: SubscriptionRow;
  totalSpent: number;
};

export function totalsSpentBySubscription(
  subscriptions: SubscriptionRow[],
  paymentLogBySub: Map<number, PaymentLogEntry[]>
): SubscriptionSpend[] {
  return subscriptions
    .map((subscription) => ({
      subscription,
      totalSpent: totalFromPaymentLog(paymentLogBySub.get(subscription.id) ?? []),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

function monthlyCostAt(
  sub: { billingCycle: BillingCycle; customIntervalDays: number | null; splitCount: number },
  priceHistory: PriceEntry[],
  statusHistory: StatusEntry[],
  atMs: number
): { currency: string; amount: number } | null {
  if (!isActiveAt(statusHistory, atMs)) return null;
  const price = priceAt(priceHistory, atMs);
  if (!price) return null;

  return {
    currency: price.currency,
    amount: monthlyEquivalent({
      amount: price.amount / sub.splitCount,
      billingCycle: sub.billingCycle,
      customIntervalDays: sub.customIntervalDays,
    }),
  };
}

export function monthlyTotalsAt(
  subscriptions: SubscriptionRow[],
  priceHistoryBySub: Map<number, PriceEntry[]>,
  statusHistoryBySub: Map<number, StatusEntry[]>,
  atMs: number
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const sub of subscriptions) {
    const cost = monthlyCostAt(
      sub,
      priceHistoryBySub.get(sub.id) ?? [],
      statusHistoryBySub.get(sub.id) ?? [],
      atMs
    );
    if (!cost) continue;
    totals.set(cost.currency, (totals.get(cost.currency) ?? 0) + cost.amount);
  }
  return Array.from(totals, ([currency, total]) => ({ currency, total }));
}

export function hasHistoryOlderThan(priceHistoryBySub: Map<number, PriceEntry[]>, days: number): boolean {
  const cutoff = Date.now() - days * 86_400_000;
  for (const entries of priceHistoryBySub.values()) {
    for (const entry of entries) {
      if (new Date(entry.changedAt).getTime() <= cutoff) return true;
    }
  }
  return false;
}

export function nowMs(): number {
  return Date.now();
}

export type FxImpactRow = {
  subscription: SubscriptionRow;
  vendorPct: number;
  fxPct: number;
  combinedPct: number;
};

export function computeFxImpact(
  subscriptions: SubscriptionRow[],
  priceHistoryBySub: Map<number, PriceEntry[]>,
  firstRateBySub: Map<number, number>,
  defaultCurrency: string,
  currentRate: number
): FxImpactRow[] {
  const rows: FxImpactRow[] = [];

  for (const sub of subscriptions) {
    const firstRate = firstRateBySub.get(sub.id);
    if (firstRate === undefined) continue;

    const history = priceHistoryBySub.get(sub.id) ?? [];
    if (history.length === 0) continue;

    const sorted = [...history].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
    const firstAmount = sorted[0].amount;
    const latestAmount = sub.amount;
    if (firstAmount <= 0) continue;

    const firstInDefault = convertToCurrency(firstAmount, sub.currency, defaultCurrency, firstRate);
    if (firstInDefault <= 0) continue;
    const currentInDefault = convertToCurrency(latestAmount, sub.currency, defaultCurrency, currentRate);

    const vendorRatio = latestAmount / firstAmount;
    const combinedRatio = currentInDefault / firstInDefault;
    const fxRatio = combinedRatio / vendorRatio;

    rows.push({
      subscription: sub,
      vendorPct: (vendorRatio - 1) * 100,
      fxPct: (fxRatio - 1) * 100,
      combinedPct: (combinedRatio - 1) * 100,
    });
  }

  return rows.sort((a, b) => Math.abs(b.combinedPct) - Math.abs(a.combinedPct));
}

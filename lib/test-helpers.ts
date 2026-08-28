import type { SubscriptionRow } from "@/lib/subscriptions";

export function makeSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 1,
    userId: 1,
    name: "Netflix",
    description: null,
    logoUrl: null,
    amount: 9990,
    currency: "CLP",
    billingCycle: "monthly",
    customIntervalDays: null,
    nextBillingDate: "2026-09-05",
    category: "Streaming",
    notificationDaysBefore: 3,
    appriseUrl: null,
    isActive: true,
    isTrial: false,
    splitCount: 1,
    lastNotifiedFor: null,
    ...overrides,
  };
}

import type { SubscriptionRow } from "@/lib/subscriptions";

function daysBetween(laterIso: string, earlierIso: string): number {
  const later = new Date(`${laterIso}T00:00:00Z`).getTime();
  const earlier = new Date(`${earlierIso}T00:00:00Z`).getTime();
  return Math.round((later - earlier) / 86_400_000);
}

export function getDueSubscriptions(
  subscriptions: SubscriptionRow[],
  todayIso: string
): SubscriptionRow[] {
  return subscriptions.filter(
    (sub) => sub.isActive && daysBetween(sub.nextBillingDate, todayIso) === sub.notificationDaysBefore
  );
}

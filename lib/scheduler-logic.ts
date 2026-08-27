import type { SubscriptionRow } from "@/lib/subscriptions";

export function daysBetween(laterIso: string, earlierIso: string): number {
  const later = new Date(`${laterIso}T00:00:00Z`).getTime();
  const earlier = new Date(`${earlierIso}T00:00:00Z`).getTime();
  return Math.round((later - earlier) / 86_400_000);
}

export function getDueSubscriptions(
  subscriptions: SubscriptionRow[],
  todayIso: string
): SubscriptionRow[] {
  return subscriptions.filter((sub) => {
    if (!sub.isActive) return false;
    if (sub.lastNotifiedFor === sub.nextBillingDate) return false;

    const daysLeft = daysBetween(sub.nextBillingDate, todayIso);
    return daysLeft >= 0 && daysLeft <= sub.notificationDaysBefore;
  });
}

export function getOverdueSubscriptions(
  subscriptions: SubscriptionRow[],
  todayIso: string
): SubscriptionRow[] {
  return subscriptions.filter(
    (sub) => sub.isActive && daysBetween(sub.nextBillingDate, todayIso) < 0
  );
}

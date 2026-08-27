import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, type BillingCycle } from "@/drizzle/schema";

export type SubscriptionRow = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  customIntervalDays: number | null;
  nextBillingDate: string;
  category: string;
  notificationDaysBefore: number;
  appriseUrl: string | null;
  isActive: boolean;
  isTrial: boolean;
  splitCount: number;
  lastNotifiedFor: string | null;
};

export function getSubscriptionsForUser(userId: number): SubscriptionRow[] {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .all()
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
}

export function getAllActiveSubscriptions(): SubscriptionRow[] {
  return db.select().from(subscriptions).where(eq(subscriptions.isActive, true)).all();
}

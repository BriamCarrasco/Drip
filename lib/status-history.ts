import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { statusHistory } from "@/drizzle/schema";

export type StatusHistoryEntry = {
  isActive: boolean;
  changedAt: string;
};

export function getStatusHistory(subscriptionId: number): StatusHistoryEntry[] {
  return db
    .select({ isActive: statusHistory.isActive, changedAt: statusHistory.changedAt })
    .from(statusHistory)
    .where(eq(statusHistory.subscriptionId, subscriptionId))
    .orderBy(asc(statusHistory.changedAt))
    .all();
}

export function recordStatusChange(
  subscriptionId: number,
  isActive: boolean,
  changedAt?: string
): void {
  db.insert(statusHistory)
    .values({ subscriptionId, isActive, changedAt: changedAt ?? new Date().toISOString() })
    .run();
}

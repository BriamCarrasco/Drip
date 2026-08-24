import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceHistory } from "@/drizzle/schema";

export type PriceHistoryEntry = {
  amount: number;
  currency: string;
  changedAt: string;
};

export function getPriceHistory(subscriptionId: number): PriceHistoryEntry[] {
  return db
    .select({
      amount: priceHistory.amount,
      currency: priceHistory.currency,
      changedAt: priceHistory.changedAt,
    })
    .from(priceHistory)
    .where(eq(priceHistory.subscriptionId, subscriptionId))
    .orderBy(desc(priceHistory.changedAt))
    .all();
}

export function recordPriceChange(subscriptionId: number, amount: number, currency: string): void {
  db.insert(priceHistory).values({ subscriptionId, amount, currency }).run();
}

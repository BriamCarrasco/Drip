import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { priceHistory, subscriptions, users } from "@/drizzle/schema";
import { getPriceHistory, recordPriceChange } from "@/lib/price-history";

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
}

function insertSubscription(userId: number): number {
  return db
    .insert(subscriptions)
    .values({
      userId,
      name: "Netflix",
      amount: 9990,
      currency: "CLP",
      billingCycle: "monthly",
      nextBillingDate: "2026-09-05",
      category: "Streaming",
    })
    .run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(priceHistory).run();
  db.delete(subscriptions).run();
  db.delete(users).run();
});

describe("recordPriceChange / getPriceHistory", () => {
  it("records and retrieves entries ordered by changedAt descending", () => {
    const subscriptionId = insertSubscription(insertUser());

    recordPriceChange(subscriptionId, 8990, "CLP", "2026-06-01T00:00:00.000Z");
    recordPriceChange(subscriptionId, 9990, "CLP", "2026-08-01T00:00:00.000Z");

    const history = getPriceHistory(subscriptionId);

    expect(history).toEqual([
      { amount: 9990, currency: "CLP", changedAt: "2026-08-01T00:00:00.000Z" },
      { amount: 8990, currency: "CLP", changedAt: "2026-06-01T00:00:00.000Z" },
    ]);
  });

  it("defaults changedAt to the current time when not provided", () => {
    const subscriptionId = insertSubscription(insertUser());
    recordPriceChange(subscriptionId, 9990, "CLP");

    const [entry] = getPriceHistory(subscriptionId);
    expect(entry.amount).toBe(9990);
    expect(new Date(entry.changedAt).getTime()).not.toBeNaN();
  });

  it("returns an empty array when there is no history", () => {
    const subscriptionId = insertSubscription(insertUser());
    expect(getPriceHistory(subscriptionId)).toEqual([]);
  });
});

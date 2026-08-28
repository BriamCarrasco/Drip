import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { statusHistory, subscriptions, users } from "@/drizzle/schema";
import { getStatusHistory, recordStatusChange } from "@/lib/status-history";

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
  db.delete(statusHistory).run();
  db.delete(subscriptions).run();
  db.delete(users).run();
});

describe("recordStatusChange / getStatusHistory", () => {
  it("records and retrieves entries ordered by changedAt ascending", () => {
    const subscriptionId = insertSubscription(insertUser());

    recordStatusChange(subscriptionId, false, "2026-08-01T00:00:00.000Z");
    recordStatusChange(subscriptionId, true, "2026-06-01T00:00:00.000Z");

    const history = getStatusHistory(subscriptionId);

    expect(history).toEqual([
      { isActive: true, changedAt: "2026-06-01T00:00:00.000Z" },
      { isActive: false, changedAt: "2026-08-01T00:00:00.000Z" },
    ]);
  });

  it("defaults changedAt to the current time when not provided", () => {
    const subscriptionId = insertSubscription(insertUser());
    recordStatusChange(subscriptionId, true);

    const [entry] = getStatusHistory(subscriptionId);
    expect(entry.isActive).toBe(true);
    expect(new Date(entry.changedAt).getTime()).not.toBeNaN();
  });

  it("returns an empty array when there is no history", () => {
    const subscriptionId = insertSubscription(insertUser());
    expect(getStatusHistory(subscriptionId)).toEqual([]);
  });
});

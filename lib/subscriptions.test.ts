import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/drizzle/schema";
import { getAllActiveSubscriptions, getSubscriptionsForUser } from "@/lib/subscriptions";

function insertUser(username: string): number {
  return db.insert(users).values({ username, passwordHash: "x" }).run().lastInsertRowid as number;
}

function insertSubscription(userId: number, overrides: Partial<typeof subscriptions.$inferInsert> = {}) {
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
      ...overrides,
    })
    .run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(subscriptions).run();
  db.delete(users).run();
});

describe("getSubscriptionsForUser", () => {
  it("returns only the given user's subscriptions, sorted by next billing date", () => {
    const userId = insertUser("alice");
    const otherUserId = insertUser("bob");
    insertSubscription(userId, { name: "Later", nextBillingDate: "2026-12-01" });
    insertSubscription(userId, { name: "Sooner", nextBillingDate: "2026-09-01" });
    insertSubscription(otherUserId, { name: "NotMine", nextBillingDate: "2026-01-01" });

    const result = getSubscriptionsForUser(userId);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Sooner");
    expect(result[1].name).toBe("Later");
  });

  it("returns an empty array for a user with no subscriptions", () => {
    const userId = insertUser("alice");
    expect(getSubscriptionsForUser(userId)).toEqual([]);
  });
});

describe("getAllActiveSubscriptions", () => {
  it("only returns subscriptions marked active, across all users", () => {
    const userId = insertUser("alice");
    insertSubscription(userId, { name: "Active", isActive: true });
    insertSubscription(userId, { name: "Paused", isActive: false });

    const result = getAllActiveSubscriptions();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Active");
  });
});

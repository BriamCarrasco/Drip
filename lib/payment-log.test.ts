import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { paymentLog, subscriptions, users } from "@/drizzle/schema";
import { getPaymentLog, recordPayment, totalFromPaymentLog } from "@/lib/payment-log";

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
  db.delete(paymentLog).run();
  db.delete(subscriptions).run();
  db.delete(users).run();
});

describe("recordPayment / getPaymentLog", () => {
  it("records and retrieves payments for a subscription", () => {
    const subscriptionId = insertSubscription(insertUser());

    recordPayment(subscriptionId, 9990, "CLP", "2026-08-01T00:00:00.000Z");
    recordPayment(subscriptionId, 9990, "CLP", "2026-09-01T00:00:00.000Z");

    const log = getPaymentLog(subscriptionId);

    expect(log).toEqual([
      { amount: 9990, currency: "CLP", paidAt: "2026-08-01T00:00:00.000Z" },
      { amount: 9990, currency: "CLP", paidAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(totalFromPaymentLog(log)).toBe(19980);
  });

  it("defaults paidAt to the current time when not provided", () => {
    const subscriptionId = insertSubscription(insertUser());
    recordPayment(subscriptionId, 9990, "CLP");

    const [entry] = getPaymentLog(subscriptionId);
    expect(new Date(entry.paidAt).getTime()).not.toBeNaN();
  });

  it("returns an empty array for a subscription with no payments", () => {
    const subscriptionId = insertSubscription(insertUser());
    expect(getPaymentLog(subscriptionId)).toEqual([]);
  });
});

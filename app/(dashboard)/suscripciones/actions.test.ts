import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { paymentLog, priceHistory, statusHistory, subscriptions, users } from "@/drizzle/schema";
import type { SubscriptionInput } from "./actions";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import {
  createSubscriptionAction,
  deleteSubscriptionAction,
  getSubscriptionHistoryAction,
  markAsPaidAction,
  toggleSubscriptionActiveAction,
  updateSubscriptionAction,
} from "./actions";

const authMock = vi.mocked(auth);

function sessionFor(userId: number) {
  return { user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>;
}

function insertUser(username = "alice"): number {
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
    .returning({ id: subscriptions.id })
    .get().id;
}

function validInput(overrides: Partial<SubscriptionInput> = {}): SubscriptionInput {
  return {
    name: "Netflix",
    amount: 9990,
    currency: "CLP",
    billingCycle: "monthly",
    nextBillingDate: "2026-09-05",
    category: "Streaming",
    notificationDaysBefore: 3,
    isActive: true,
    isTrial: false,
    splitCount: 1,
    ...overrides,
  };
}

beforeEach(() => {
  db.delete(paymentLog).run();
  db.delete(priceHistory).run();
  db.delete(statusHistory).run();
  db.delete(subscriptions).run();
  db.delete(users).run();
  authMock.mockReset();
});

describe("createSubscriptionAction", () => {
  it("throws when there is no authenticated session", async () => {
    authMock.mockResolvedValue(null);
    await expect(createSubscriptionAction(validInput())).rejects.toThrow("No autenticado");
  });

  it("rejects invalid input", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    await expect(createSubscriptionAction(validInput({ name: "" }))).rejects.toThrow();
  });

  it("creates a subscription and records its initial price and status", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    await createSubscriptionAction(validInput());

    const [created] = db.select().from(subscriptions).all();
    expect(created.userId).toBe(userId);
    expect(db.select().from(priceHistory).all()).toHaveLength(1);
    expect(db.select().from(statusHistory).all()).toHaveLength(1);
  });
});

describe("updateSubscriptionAction", () => {
  it("records a price change only when the amount or currency changes", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId, { amount: 9990, currency: "CLP" });

    await updateSubscriptionAction(id, validInput({ amount: 9990, currency: "CLP" }));
    expect(db.select().from(priceHistory).all()).toHaveLength(0);

    await updateSubscriptionAction(id, validInput({ amount: 12990, currency: "CLP" }));
    expect(db.select().from(priceHistory).all()).toHaveLength(1);
  });

  it("records a status change only when isActive changes", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId, { isActive: true });

    await updateSubscriptionAction(id, validInput({ isActive: true }));
    expect(db.select().from(statusHistory).all()).toHaveLength(0);

    await updateSubscriptionAction(id, validInput({ isActive: false }));
    expect(db.select().from(statusHistory).all()).toHaveLength(1);
  });

  it("does not update a subscription belonging to another user", async () => {
    const owner = insertUser("alice");
    const attacker = insertUser("mallory");
    const id = insertSubscription(owner, { name: "Netflix" });
    authMock.mockResolvedValue(sessionFor(attacker));

    await updateSubscriptionAction(id, validInput({ name: "Hijacked" }));

    const [unchanged] = db.select().from(subscriptions).all();
    expect(unchanged.name).toBe("Netflix");
  });
});

describe("toggleSubscriptionActiveAction", () => {
  it("flips isActive and records a status change", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId, { isActive: true });

    await toggleSubscriptionActiveAction(id);

    const [updated] = db.select().from(subscriptions).all();
    expect(updated.isActive).toBe(false);
    expect(db.select().from(statusHistory).all()).toHaveLength(1);
  });

  it("does nothing for a subscription that does not belong to the user", async () => {
    const owner = insertUser("alice");
    const attacker = insertUser("mallory");
    const id = insertSubscription(owner, { isActive: true });
    authMock.mockResolvedValue(sessionFor(attacker));

    await toggleSubscriptionActiveAction(id);

    const [unchanged] = db.select().from(subscriptions).all();
    expect(unchanged.isActive).toBe(true);
  });
});

describe("markAsPaidAction", () => {
  it("advances the next billing date, clears isTrial, and records a payment", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId, {
      nextBillingDate: "2026-09-05",
      billingCycle: "monthly",
      isTrial: true,
      amount: 9990,
      splitCount: 1,
    });

    await markAsPaidAction(id);

    const [updated] = db.select().from(subscriptions).all();
    expect(updated.nextBillingDate).toBe("2026-10-05");
    expect(updated.isTrial).toBe(false);

    const [payment] = db.select().from(paymentLog).all();
    expect(payment.amount).toBe(9990);
    expect(payment.paidAt).toBe("2026-09-05T00:00:00.000Z");
  });

  it("splits the recorded payment across splitCount", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId, { amount: 10000, splitCount: 2 });

    await markAsPaidAction(id);

    const [payment] = db.select().from(paymentLog).all();
    expect(payment.amount).toBe(5000);
  });

  it("does nothing for a subscription that does not exist", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    await markAsPaidAction(9999);
    expect(db.select().from(paymentLog).all()).toEqual([]);
  });
});

describe("deleteSubscriptionAction", () => {
  it("deletes only the requesting user's subscription", async () => {
    const owner = insertUser("alice");
    const attacker = insertUser("mallory");
    const ownId = insertSubscription(owner);
    const otherId = insertSubscription(attacker);

    authMock.mockResolvedValue(sessionFor(owner));
    await deleteSubscriptionAction(ownId);

    const remaining = db.select().from(subscriptions).all();
    expect(remaining.map((s) => s.id)).toEqual([otherId]);
  });
});

describe("getSubscriptionHistoryAction", () => {
  it("returns empty history for a subscription the user does not own", async () => {
    const owner = insertUser("alice");
    const other = insertUser("bob");
    const id = insertSubscription(owner);
    authMock.mockResolvedValue(sessionFor(other));

    const result = await getSubscriptionHistoryAction(id);
    expect(result).toEqual({ prices: [], statuses: [], payments: [] });
  });

  it("returns the owned subscription's history", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    const id = insertSubscription(userId);
    db.insert(priceHistory).values({ subscriptionId: id, amount: 9990, currency: "CLP", changedAt: "2026-08-01T00:00:00.000Z" }).run();

    const result = await getSubscriptionHistoryAction(id);
    expect(result.prices).toHaveLength(1);
  });
});

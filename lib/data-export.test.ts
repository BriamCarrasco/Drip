import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { priceHistory, settings, statusHistory, subscriptions, users } from "@/drizzle/schema";
import { buildExportForUser, importDataForUser, parseImportPayload } from "@/lib/data-export";

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
    .returning({ id: subscriptions.id })
    .get().id;
}

beforeEach(() => {
  db.delete(priceHistory).run();
  db.delete(statusHistory).run();
  db.delete(subscriptions).run();
  db.delete(settings).run();
  db.delete(users).run();
});

describe("buildExportForUser", () => {
  it("exports null settings when the user has none", () => {
    const userId = insertUser();
    expect(buildExportForUser(userId).settings).toBeNull();
  });

  it("exports the user's settings and subscriptions with their price history", () => {
    const userId = insertUser();
    db.insert(settings).values({ userId, defaultCurrency: "USD", exchangeRateMode: "auto" }).run();
    const subscriptionId = insertSubscription(userId);
    db.insert(priceHistory)
      .values({ subscriptionId, amount: 9990, currency: "CLP", changedAt: "2026-08-01T00:00:00.000Z" })
      .run();

    const result = buildExportForUser(userId);

    expect(result.version).toBe(1);
    expect(result.settings).toEqual({
      defaultAppriseUrl: null,
      defaultCurrency: "USD",
      exchangeRateMode: "auto",
      manualExchangeRate: null,
    });
    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0].name).toBe("Netflix");
    expect(result.subscriptions[0].priceHistory).toEqual([
      { amount: 9990, currency: "CLP", changedAt: "2026-08-01T00:00:00.000Z" },
    ]);
  });

  it("only exports subscriptions belonging to the requested user", () => {
    const userId = insertUser();
    const otherUserId = db.insert(users).values({ username: "bob", passwordHash: "x" }).run()
      .lastInsertRowid as number;
    insertSubscription(otherUserId);

    expect(buildExportForUser(userId).subscriptions).toEqual([]);
  });
});

describe("parseImportPayload", () => {
  it("accepts a valid payload", () => {
    const result = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Netflix",
          amount: 9990,
          currency: "CLP",
          billingCycle: "monthly",
          nextBillingDate: "2026-09-05",
          category: "Streaming",
          notificationDaysBefore: 3,
          isActive: true,
          isTrial: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload with the wrong version", () => {
    expect(parseImportPayload({ version: 2, subscriptions: [] }).success).toBe(false);
  });

  it("rejects an unknown currency", () => {
    const result = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Netflix",
          amount: 9990,
          currency: "EUR",
          billingCycle: "monthly",
          nextBillingDate: "2026-09-05",
          category: "Streaming",
          notificationDaysBefore: 3,
          isActive: true,
          isTrial: false,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe apprise url", () => {
    const result = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Netflix",
          amount: 9990,
          currency: "CLP",
          billingCycle: "monthly",
          nextBillingDate: "2026-09-05",
          category: "Streaming",
          notificationDaysBefore: 3,
          appriseUrl: "json://169.254.169.254/",
          isActive: true,
          isTrial: false,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more subscriptions than the import cap allows", () => {
    const one = {
      name: "X",
      amount: 1,
      currency: "CLP",
      billingCycle: "monthly" as const,
      nextBillingDate: "2026-09-05",
      category: "Streaming",
      notificationDaysBefore: 3,
      isActive: true,
      isTrial: false,
    };
    const result = parseImportPayload({
      version: 1,
      subscriptions: Array.from({ length: 1001 }, () => ({ ...one })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload with an invalid date format", () => {
    const result = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Netflix",
          amount: 9990,
          currency: "CLP",
          billingCycle: "monthly",
          nextBillingDate: "05-09-2026",
          category: "Streaming",
          notificationDaysBefore: 3,
          isActive: true,
          isTrial: false,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("importDataForUser", () => {
  it("creates subscriptions with their price and status history", () => {
    const userId = insertUser();
    const payload = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Netflix",
          amount: 9990,
          currency: "CLP",
          billingCycle: "monthly",
          nextBillingDate: "2026-09-05",
          category: "Streaming",
          notificationDaysBefore: 3,
          isActive: true,
          isTrial: false,
          priceHistory: [{ amount: 8990, currency: "CLP", changedAt: "2026-06-01T00:00:00.000Z" }],
        },
      ],
    });
    if (!payload.success) throw new Error("expected valid payload");

    const result = importDataForUser(userId, payload.data);

    expect(result.subscriptions).toBe(1);
    const [imported] = db.select().from(subscriptions).all();
    expect(imported.name).toBe("Netflix");
    const history = db.select().from(priceHistory).where(eq(priceHistory.subscriptionId, imported.id)).all();
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(8990);
    const status = db.select().from(statusHistory).where(eq(statusHistory.subscriptionId, imported.id)).all();
    expect(status).toHaveLength(1);
    expect(status[0].isActive).toBe(true);
  });

  it("defaults price history to the current price when none is provided", () => {
    const userId = insertUser();
    const payload = parseImportPayload({
      version: 1,
      subscriptions: [
        {
          name: "Spotify",
          amount: 5990,
          currency: "CLP",
          billingCycle: "monthly",
          nextBillingDate: "2026-09-10",
          category: "Streaming",
          notificationDaysBefore: 3,
          isActive: true,
          isTrial: false,
        },
      ],
    });
    if (!payload.success) throw new Error("expected valid payload");

    importDataForUser(userId, payload.data);

    const [imported] = db.select().from(subscriptions).all();
    const history = db.select().from(priceHistory).where(eq(priceHistory.subscriptionId, imported.id)).all();
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(5990);
  });
});

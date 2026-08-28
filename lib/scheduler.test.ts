import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  exchangeRates,
  paymentLog,
  priceHistory,
  settings,
  statusHistory,
  subscriptions,
  users,
} from "@/drizzle/schema";

vi.mock("@/lib/apprise", () => ({
  sendNotification: vi.fn().mockResolvedValue(true),
}));

import { sendNotification } from "@/lib/apprise";
import { rollOverdueSubscriptions, runDailyCheck } from "@/lib/scheduler";

const sendNotificationMock = vi.mocked(sendNotification);

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
      notificationDaysBefore: 3,
      appriseUrl: "tgram://token/chat",
      ...overrides,
    })
    .returning({ id: subscriptions.id })
    .get().id;
}

beforeEach(() => {
  db.delete(paymentLog).run();
  db.delete(priceHistory).run();
  db.delete(statusHistory).run();
  db.delete(subscriptions).run();
  db.delete(settings).run();
  db.delete(exchangeRates).run();
  db.delete(users).run();
  sendNotificationMock.mockClear();
  sendNotificationMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rollOverdueSubscriptions", () => {
  it("advances an overdue subscription to the next future billing date and records a payment per cycle", () => {
    const userId = insertUser();
    const subscriptionId = insertSubscription(userId, { nextBillingDate: "2026-06-05", amount: 9990 });

    const rolled = rollOverdueSubscriptions("2026-08-26");

    expect(rolled).toBe(1);
    const [updated] = db.select().from(subscriptions).all();
    expect(updated.id).toBe(subscriptionId);
    expect(updated.nextBillingDate >= "2026-08-26").toBe(true);

    const payments = db.select().from(paymentLog).all();
    expect(payments.length).toBeGreaterThanOrEqual(2);
    expect(payments.every((p) => p.amount === 9990)).toBe(true);
  });

  it("splits the recorded payment amount across splitCount", () => {
    const userId = insertUser();
    insertSubscription(userId, { nextBillingDate: "2026-07-05", amount: 10000, splitCount: 2 });

    rollOverdueSubscriptions("2026-08-26");

    const [payment] = db.select().from(paymentLog).all();
    expect(payment.amount).toBe(5000);
  });

  it("does nothing for subscriptions that are not overdue", () => {
    const userId = insertUser();
    insertSubscription(userId, { nextBillingDate: "2026-09-05" });

    const rolled = rollOverdueSubscriptions("2026-08-26");

    expect(rolled).toBe(0);
    expect(db.select().from(paymentLog).all()).toEqual([]);
  });
});

describe("runDailyCheck", () => {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthKey = today.slice(0, 7);

  it("notifies due subscriptions and marks them as notified", async () => {
    const userId = insertUser();
    insertSubscription(userId, { nextBillingDate: today, notificationDaysBefore: 3 });

    const result = await runDailyCheck();

    expect(result.notified).toBe(1);
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    const [updated] = db.select().from(subscriptions).all();
    expect(updated.lastNotifiedFor).toBe(today);
  });

  it("does not notify twice for the same billing date", async () => {
    const userId = insertUser();
    insertSubscription(userId, {
      nextBillingDate: today,
      notificationDaysBefore: 3,
      lastNotifiedFor: today,
    });

    const result = await runDailyCheck();

    expect(result.notified).toBe(0);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("skips notifying when neither the subscription nor the user settings have an apprise url", async () => {
    const userId = insertUser();
    insertSubscription(userId, { nextBillingDate: today, appriseUrl: null });

    const result = await runDailyCheck();

    expect(result.notified).toBe(0);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("refreshes the exchange rate when any user has auto mode enabled", async () => {
    const userId = insertUser();
    db.insert(settings).values({ userId, exchangeRateMode: "auto" }).run();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ serie: [{ valor: 950 }] }) } as Response)
    );

    await runDailyCheck();

    const [rate] = db.select().from(exchangeRates).all();
    expect(rate.rate).toBe(950);
  });

  it("sends a budget alert when a user's monthly total exceeds their budget", async () => {
    const userId = insertUser();
    db.insert(settings)
      .values({ userId, defaultAppriseUrl: "tgram://token/chat", defaultCurrency: "CLP", monthlyBudget: 5000 })
      .run();
    insertSubscription(userId, { nextBillingDate: "2099-12-01", amount: 9990, appriseUrl: null });

    const result = await runDailyCheck();

    expect(result.budgetAlerted).toBe(1);
    const [updatedSettings] = db.select().from(settings).all();
    expect(updatedSettings.budgetAlertSentFor).toBe(currentMonthKey);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";
import {
  getSettingsForUser,
  getUsersWithMonthlyBudget,
  isAutoExchangeRateEnabledForAnyUser,
  setBudgetAlertSentFor,
} from "@/lib/settings";

function insertUser(username: string): number {
  return db.insert(users).values({ username, passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(settings).run();
  db.delete(users).run();
});

describe("getSettingsForUser", () => {
  it("returns default settings when the user has no row", () => {
    const userId = insertUser("alice");
    expect(getSettingsForUser(userId)).toEqual({
      defaultAppriseUrl: null,
      defaultCurrency: "CLP",
      exchangeRateMode: "manual",
      manualExchangeRate: null,
      monthlyBudget: null,
      budgetAlertSentFor: null,
    });
  });

  it("returns the stored row when one exists", () => {
    const userId = insertUser("alice");
    db.insert(settings).values({ userId, defaultCurrency: "USD", exchangeRateMode: "auto" }).run();

    const result = getSettingsForUser(userId);
    expect(result.defaultCurrency).toBe("USD");
    expect(result.exchangeRateMode).toBe("auto");
  });
});

describe("isAutoExchangeRateEnabledForAnyUser", () => {
  it("is false when no user has auto mode enabled", () => {
    const userId = insertUser("alice");
    db.insert(settings).values({ userId, exchangeRateMode: "manual" }).run();
    expect(isAutoExchangeRateEnabledForAnyUser()).toBe(false);
  });

  it("is true when at least one user has auto mode enabled", () => {
    const userId = insertUser("alice");
    db.insert(settings).values({ userId, exchangeRateMode: "auto" }).run();
    expect(isAutoExchangeRateEnabledForAnyUser()).toBe(true);
  });
});

describe("getUsersWithMonthlyBudget", () => {
  it("only returns users with a non-null monthly budget", () => {
    const withBudget = insertUser("alice");
    const withoutBudget = insertUser("bob");
    db.insert(settings).values({ userId: withBudget, monthlyBudget: 50000 }).run();
    db.insert(settings).values({ userId: withoutBudget }).run();

    const result = getUsersWithMonthlyBudget();

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(withBudget);
    expect(result[0].monthlyBudget).toBe(50000);
  });
});

describe("setBudgetAlertSentFor", () => {
  it("updates the budgetAlertSentFor column for that user", () => {
    const userId = insertUser("alice");
    db.insert(settings).values({ userId }).run();

    setBudgetAlertSentFor(userId, "2026-08");

    expect(getSettingsForUser(userId).budgetAlertSentFor).toBe("2026-08");
  });
});

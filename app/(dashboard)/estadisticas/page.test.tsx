import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { paymentLog, priceHistory, settings, subscriptions, users } from "@/drizzle/schema";
import EstadisticasPage from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";

const authMock = vi.mocked(auth);

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
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

beforeEach(() => {
  db.delete(paymentLog).run();
  db.delete(priceHistory).run();
  db.delete(subscriptions).run();
  db.delete(settings).run();
  db.delete(users).run();
  authMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EstadisticasPage", () => {
  it("shows an empty message when the user has no subscriptions", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    render(await EstadisticasPage());

    expect(screen.getByText("Todavía no tienes suscripciones registradas.")).toBeInTheDocument();
  });

  it("ranks subscriptions by total paid and shows the header stats", async () => {
    const userId = insertUser();
    const id = insertSubscription(userId, { amount: 9990, currency: "CLP" });
    db.insert(paymentLog).values({ subscriptionId: id, amount: 9990, currency: "CLP", paidAt: "2026-08-01T00:00:00.000Z" }).run();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    render(await EstadisticasPage());

    expect(screen.getByText("Total pagado hasta hoy")).toBeInTheDocument();
    expect(screen.getAllByText("$9.990")).toHaveLength(3);
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "1 suscripciones")).toBeInTheDocument();
  });

  it("shows the fx-impact prompt for foreign-currency subscriptions when auto mode is off", async () => {
    const userId = insertUser();
    db.insert(settings).values({ userId, defaultCurrency: "CLP", exchangeRateMode: "manual", manualExchangeRate: 900 }).run();
    insertSubscription(userId, { currency: "USD", amount: 10 });
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    render(await EstadisticasPage());

    expect(screen.getByText("Impacto del tipo de cambio")).toBeInTheDocument();
    expect(screen.getByText(/Activa el tipo de cambio automático/)).toBeInTheDocument();
  });

  it("computes fx impact for a foreign-currency subscription with enough history", async () => {
    const userId = insertUser();
    db.insert(settings)
      .values({ userId, defaultCurrency: "CLP", exchangeRateMode: "auto", manualExchangeRate: 900 })
      .run();
    const id = insertSubscription(userId, { currency: "USD", amount: 10 });
    db.insert(priceHistory)
      .values({ subscriptionId: id, amount: 8, currency: "USD", changedAt: "2026-06-01T00:00:00.000Z" })
      .run();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ serie: [{ valor: 850 }] }) } as Response)
    );

    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    render(await EstadisticasPage());

    expect(screen.getByText(/En CLP:/)).toBeInTheDocument();
  });
});

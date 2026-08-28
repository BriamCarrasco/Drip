import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { paymentLog, subscriptions, users } from "@/drizzle/schema";
import { SubscriptionModalProvider } from "@/lib/subscription-modal-context";
import CalendarioPage from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";

const authMock = vi.mocked(auth);

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(paymentLog).run();
  db.delete(subscriptions).run();
  db.delete(users).run();
  authMock.mockReset();
});

async function renderPage() {
  return render(
    <SubscriptionModalProvider defaultCurrency="CLP">{await CalendarioPage()}</SubscriptionModalProvider>
  );
}

describe("CalendarioPage", () => {
  it("shows an empty message when there are no active subscriptions", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    await renderPage();

    expect(screen.getByText("Todavía no tienes suscripciones registradas.")).toBeInTheDocument();
  });

  it("renders the calendar with active subscriptions and payment history", async () => {
    const userId = insertUser();
    const subscriptionId = db
      .insert(subscriptions)
      .values({
        userId,
        name: "Netflix",
        amount: 9990,
        currency: "CLP",
        billingCycle: "monthly",
        nextBillingDate: "2026-09-05",
        category: "Streaming",
        isActive: true,
      })
      .returning({ id: subscriptions.id })
      .get().id;
    db.insert(paymentLog)
      .values({ subscriptionId, amount: 9990, currency: "CLP", paidAt: "2026-08-05T00:00:00.000Z" })
      .run();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    await renderPage();

    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no tienes suscripciones registradas.")).not.toBeInTheDocument();
  });
});

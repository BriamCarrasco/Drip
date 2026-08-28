import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/drizzle/schema";
import { SubscriptionModalProvider } from "@/lib/subscription-modal-context";
import SuscripcionesPage from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  deleteSubscriptionAction: vi.fn(),
  markAsPaidAction: vi.fn(),
  toggleSubscriptionActiveAction: vi.fn(),
}));

import { auth } from "@/auth";

const authMock = vi.mocked(auth);

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(subscriptions).run();
  db.delete(users).run();
  authMock.mockReset();
});

describe("SuscripcionesPage", () => {
  it("renders the subscriptions table for the logged-in user", async () => {
    const userId = insertUser();
    db.insert(subscriptions)
      .values({
        userId,
        name: "Netflix",
        amount: 9990,
        currency: "CLP",
        billingCycle: "monthly",
        nextBillingDate: "2026-09-05",
        category: "Streaming",
      })
      .run();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    render(
      <SubscriptionModalProvider defaultCurrency="CLP">{await SuscripcionesPage()}</SubscriptionModalProvider>
    );

    expect(screen.getByText("Suscripciones")).toBeInTheDocument();
    expect(screen.getAllByText("Netflix")).toHaveLength(2);
  });
});

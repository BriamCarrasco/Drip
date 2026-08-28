import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { settings, subscriptions, users } from "@/drizzle/schema";
import { SubscriptionModalProvider } from "@/lib/subscription-modal-context";
import HomePage from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  markAsPaidAction: vi.fn(),
}));

import { auth } from "@/auth";

const authMock = vi.mocked(auth);

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(subscriptions).run();
  db.delete(settings).run();
  db.delete(users).run();
  authMock.mockReset();
});

async function renderPage() {
  return render(<SubscriptionModalProvider defaultCurrency="CLP">{await HomePage()}</SubscriptionModalProvider>);
}

describe("HomePage", () => {
  it("shows the empty state when the user has no subscriptions", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    await renderPage();

    expect(screen.getByText("Sin suscripciones por ahora")).toBeInTheDocument();
  });

  it("shows stats and the subscriptions grid when active subscriptions exist", async () => {
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
        isActive: true,
      })
      .run();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    await renderPage();

    expect(screen.getByText("Tus suscripciones")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("1 activas")).toBeInTheDocument();
  });

  it("shows a message when all subscriptions are inactive", async () => {
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
        isActive: false,
      })
      .run();
    authMock.mockResolvedValue({ user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>);

    await renderPage();

    expect(screen.getByText("Todavía no tienes suscripciones activas.")).toBeInTheDocument();
  });
});

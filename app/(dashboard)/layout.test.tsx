import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";
import DashboardLayout from "./layout";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { auth } from "@/auth";

const authMock = vi.mocked(auth);

function insertUser(): number {
  return db.insert(users).values({ username: "alice", passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(settings).run();
  db.delete(users).run();
  authMock.mockReset();
});

describe("DashboardLayout", () => {
  it("renders the top bar with the session username and the page content", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue({
      user: { id: String(userId), username: "alice" },
    } as Awaited<ReturnType<typeof auth>>);

    render(await DashboardLayout({ children: <div>page content</div> }));

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nueva suscripción/ })).toBeInTheDocument();
  });

  it("uses the user's default currency for the subscription modal context", async () => {
    const userId = insertUser();
    db.insert(settings).values({ userId, defaultCurrency: "USD" }).run();
    authMock.mockResolvedValue({
      user: { id: String(userId), username: "alice" },
    } as Awaited<ReturnType<typeof auth>>);

    render(await DashboardLayout({ children: <div>page content</div> }));

    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

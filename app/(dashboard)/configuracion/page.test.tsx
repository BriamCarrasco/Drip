import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";
import ConfiguracionPage from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("@/app/(dashboard)/configuracion/actions", () => ({
  updateSettingsAction: vi.fn(),
  sendTestNotificationAction: vi.fn(),
  refreshExchangeRateAction: vi.fn(),
  fetchTelegramChatIdAction: vi.fn(),
  changePasswordAction: vi.fn(),
  changeUsernameAction: vi.fn(),
  signOutAction: vi.fn(),
}));
vi.mock("@/app/(dashboard)/configuracion/data-actions", () => ({
  exportDataAction: vi.fn(),
  importDataAction: vi.fn(),
}));

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

describe("ConfiguracionPage", () => {
  it("renders the settings form for the logged-in user", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue({
      user: { id: String(userId), username: "alice" },
    } as Awaited<ReturnType<typeof auth>>);

    render(await ConfiguracionPage());

    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Sesión iniciada como")).toBeInTheDocument();
  });
});

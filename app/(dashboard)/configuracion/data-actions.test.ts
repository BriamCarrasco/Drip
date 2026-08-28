import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/drizzle/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { exportDataAction, importDataAction } from "./data-actions";

const authMock = vi.mocked(auth);

function sessionFor(userId: number) {
  return { user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>;
}

function insertUser(username = "alice"): number {
  return db.insert(users).values({ username, passwordHash: "x" }).run().lastInsertRowid as number;
}

beforeEach(() => {
  db.delete(subscriptions).run();
  db.delete(users).run();
  authMock.mockReset();
});

describe("exportDataAction", () => {
  it("throws when there is no authenticated session", async () => {
    authMock.mockResolvedValue(null);
    await expect(exportDataAction()).rejects.toThrow("No autenticado");
  });

  it("exports the requesting user's data", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await exportDataAction();

    expect(result.version).toBe(1);
    expect(result.subscriptions).toEqual([]);
  });
});

describe("importDataAction", () => {
  const validPayload = {
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
  };

  it("rejects a payload that is not valid JSON", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await importDataAction("{not json");

    expect(result.error).toMatch(/no es un JSON válido/);
  });

  it("rejects a payload that does not match the export schema", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await importDataAction({ version: 2 });

    expect(result.error).toMatch(/no tiene el formato esperado/);
  });

  it("rejects an empty subscription list", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await importDataAction({ version: 1, subscriptions: [] });

    expect(result.error).toMatch(/no contiene suscripciones/);
  });

  it("imports subscriptions for the requesting user", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await importDataAction(validPayload);

    expect(result).toEqual({ success: true, importedSubscriptions: 1 });
    const [imported] = db.select().from(subscriptions).all();
    expect(imported.userId).toBe(userId);
  });

  it("accepts a JSON string payload as well as an object", async () => {
    const userId = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await importDataAction(JSON.stringify(validPayload));

    expect(result.success).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { requireUserId } from "@/lib/require-user-id";

const authMock = vi.mocked(auth);

beforeEach(() => {
  authMock.mockReset();
});

describe("requireUserId", () => {
  it("returns the numeric user id from the session", async () => {
    authMock.mockResolvedValue({ user: { id: "42" } } as Awaited<ReturnType<typeof auth>>);
    expect(await requireUserId()).toBe(42);
  });

  it("throws when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireUserId()).rejects.toThrow("No autenticado");
  });

  it("throws when the session has no user id", async () => {
    authMock.mockResolvedValue({ user: {} } as Awaited<ReturnType<typeof auth>>);
    await expect(requireUserId()).rejects.toThrow("No autenticado");
  });
});

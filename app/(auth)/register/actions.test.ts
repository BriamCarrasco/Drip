import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

vi.mock("@/auth", () => ({ signIn: vi.fn() }));

import { signIn } from "@/auth";
import { registerAction } from "./actions";

const signInMock = vi.mocked(signIn);

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  db.delete(users).run();
  signInMock.mockReset();
});

describe("registerAction", () => {
  it("creates the user and signs in on success", async () => {
    signInMock.mockResolvedValue(undefined);

    const result = await registerAction(
      {},
      formData({ username: "alice", password: "secret123", confirmPassword: "secret123" })
    );

    expect(result).toEqual({});
    const [user] = db.select().from(users).all();
    expect(user.username).toBe("alice");
    expect(user.passwordHash).not.toBe("secret123");
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      username: "alice",
      password: "secret123",
      redirectTo: "/",
    });
  });

  it("rejects a username that is too short", async () => {
    const result = await registerAction(
      {},
      formData({ username: "ab", password: "secret123", confirmPassword: "secret123" })
    );
    expect(result.error).toMatch(/al menos 3 caracteres/);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const result = await registerAction(
      {},
      formData({ username: "alice", password: "secret123", confirmPassword: "different" })
    );
    expect(result.error).toBe("Las contraseñas no coinciden.");
  });

  it("rejects a duplicate username", async () => {
    db.insert(users).values({ username: "alice", passwordHash: "x" }).run();

    const result = await registerAction(
      {},
      formData({ username: "alice", password: "secret123", confirmPassword: "secret123" })
    );

    expect(result.error).toBe("Ya existe una cuenta con ese nombre de usuario.");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("reports a specific message when auto sign-in fails after account creation", async () => {
    signInMock.mockRejectedValue(new AuthError("failed"));

    const result = await registerAction(
      {},
      formData({ username: "alice", password: "secret123", confirmPassword: "secret123" })
    );

    expect(result.error).toBe("La cuenta se creó, pero no se pudo iniciar sesión automáticamente.");
    expect(db.select().from(users).all()).toHaveLength(1);
  });

  it("rethrows non-auth errors from signIn", async () => {
    signInMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      registerAction({}, formData({ username: "alice", password: "secret123", confirmPassword: "secret123" }))
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});

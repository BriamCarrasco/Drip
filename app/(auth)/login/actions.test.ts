import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";
import { _resetAttemptsForTests, registerFailedAttempt } from "@/lib/rate-limit";

vi.mock("@/auth", () => ({ signIn: vi.fn() }));

import { signIn } from "@/auth";
import { loginAction } from "./actions";

const signInMock = vi.mocked(signIn);

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  signInMock.mockReset();
  _resetAttemptsForTests();
});

describe("loginAction", () => {
  it("signs in and returns no error on success", async () => {
    signInMock.mockResolvedValue(undefined);
    const result = await loginAction({}, formData({ username: "alice", password: "secret123" }));
    expect(result).toEqual({});
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      username: "alice",
      password: "secret123",
      redirectTo: "/",
    });
  });

  it("returns a generic error message when signIn throws an AuthError", async () => {
    signInMock.mockRejectedValue(new AuthError("bad credentials"));
    const result = await loginAction({}, formData({ username: "alice", password: "wrong" }));
    expect(result.error).toBe("Usuario o contraseña incorrectos.");
  });

  it("rethrows non-auth errors (e.g. the Next.js redirect signal)", async () => {
    signInMock.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(loginAction({}, formData({ username: "alice", password: "secret123" }))).rejects.toThrow(
      "NEXT_REDIRECT"
    );
  });

  it("blocks the attempt without calling signIn when the user is locked out", async () => {
    for (let i = 0; i < 5; i++) registerFailedAttempt("user:alice");

    const result = await loginAction({}, formData({ username: "alice", password: "secret123" }));

    expect(result.error).toMatch(/Demasiados intentos fallidos/);
    expect(signInMock).not.toHaveBeenCalled();
  });
});

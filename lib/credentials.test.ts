import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { _resetAttemptsForTests, getLockRemainingMs } from "@/lib/rate-limit";
import { isLoginLocked, verifyCredentials } from "@/lib/credentials";

beforeEach(() => {
  db.delete(users).run();
  _resetAttemptsForTests();
  db.insert(users).values({ username: "alice", passwordHash: bcrypt.hashSync("secret123", 10) }).run();
});

describe("verifyCredentials", () => {
  it("returns the user on a correct password and clears the attempt counter", async () => {
    for (let i = 0; i < 3; i++) await verifyCredentials("alice", "wrong", "1.2.3.4");
    const user = await verifyCredentials("alice", "secret123", "1.2.3.4");

    expect(user).toEqual({ id: expect.any(String), username: "alice" });
    expect(getLockRemainingMs("user:alice")).toBe(0);
    expect(getLockRemainingMs("ip:1.2.3.4")).toBe(0);
  });

  it("returns null and records a failed attempt on a wrong password", async () => {
    expect(await verifyCredentials("alice", "nope", "1.2.3.4")).toBeNull();
    expect(await verifyCredentials("alice", "nope", "1.2.3.4")).toBeNull();
  });

  it("locks the account after five failed attempts, even with the right password", async () => {
    for (let i = 0; i < 5; i++) await verifyCredentials("alice", "wrong", "9.9.9.9");

    expect(await verifyCredentials("alice", "secret123", "9.9.9.9")).toBeNull();
    expect(isLoginLocked("alice", "9.9.9.9")).toBeGreaterThan(0);
  });

  it("locks by client IP across different usernames (password spraying)", async () => {
    for (let i = 0; i < 5; i++) await verifyCredentials(`ghost${i}`, "wrong", "5.5.5.5");

    expect(isLoginLocked("alice", "5.5.5.5")).toBeGreaterThan(0);
    expect(await verifyCredentials("alice", "secret123", "5.5.5.5")).toBeNull();
  });

  it("returns null for an unknown user without throwing", async () => {
    expect(await verifyCredentials("nobody", "whatever", null)).toBeNull();
  });
});

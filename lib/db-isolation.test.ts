import { describe, expect, it } from "vitest";

describe("test database isolation", () => {
  it("uses an in-memory database, not the real project file", async () => {
    expect(process.env.DATABASE_URL).toBe("file::memory:");
    const { db } = await import("@/lib/db");
    const { users } = await import("@/drizzle/schema");
    db.insert(users).values({ username: "isolation-check", passwordHash: "x" }).run();
    const all = db.select().from(users).all();
    expect(all).toHaveLength(1);
  });
});

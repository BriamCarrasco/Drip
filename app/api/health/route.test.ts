import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok when the database responds", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns a 500 error when the database query fails", async () => {
    const { db } = await import("@/lib/db");
    vi.spyOn(db, "get").mockImplementation(() => {
      throw new Error("db down");
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ status: "error" });

    vi.restoreAllMocks();
  });
});

import { describe, expect, it } from "vitest";
import { knownServices } from "@/lib/known-services";

describe("knownServices", () => {
  it("is a non-empty list with unique names and valid logo URLs", () => {
    expect(knownServices.length).toBeGreaterThan(0);
    const names = knownServices.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const service of knownServices) {
      expect(service.logoUrl).toMatch(/^https:\/\//);
      expect(service.category.length).toBeGreaterThan(0);
    }
  });
});

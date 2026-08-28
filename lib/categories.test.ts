import { describe, expect, it } from "vitest";
import { categorySuggestions } from "@/lib/categories";

describe("categorySuggestions", () => {
  it("is a non-empty list of unique category names", () => {
    expect(categorySuggestions.length).toBeGreaterThan(0);
    expect(new Set(categorySuggestions).size).toBe(categorySuggestions.length);
  });
});

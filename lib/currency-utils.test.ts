import { describe, expect, it } from "vitest";
import { convertToCurrency } from "@/lib/currency-utils";

describe("convertToCurrency", () => {
  it("returns the amount unchanged for the same currency", () => {
    expect(convertToCurrency(1000, "CLP", "CLP", 950)).toBe(1000);
  });

  it("multiplies by the rate when converting USD to CLP", () => {
    expect(convertToCurrency(10, "USD", "CLP", 950)).toBe(9500);
  });

  it("divides by the rate when converting CLP to USD", () => {
    expect(convertToCurrency(9500, "CLP", "USD", 950)).toBe(10);
  });

  it("returns the amount unchanged for an unsupported currency pair", () => {
    expect(convertToCurrency(100, "EUR", "USD", 950)).toBe(100);
  });
});

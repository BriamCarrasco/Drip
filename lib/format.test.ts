import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "@/lib/format";

describe("formatMoney", () => {
  it("formats CLP with no decimals and a $ symbol", () => {
    expect(formatMoney(9990, "CLP")).toBe("$9.990");
  });

  it("formats USD with two decimals and a US$ symbol", () => {
    expect(formatMoney(9.9, "USD")).toBe("US$9,90");
  });

  it("falls back to the currency code for an unknown currency", () => {
    expect(formatMoney(100, "EUR")).toBe("EUR 100,00");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in long Spanish form", () => {
    expect(formatDate("2026-09-05")).toBe("5 sept 2026");
  });

  it("returns a fallback message for an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("Fecha inválida");
  });
});

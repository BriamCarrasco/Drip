import { describe, expect, it } from "vitest";
import { combineTotals, summarizeTotals } from "@/lib/currency-summary";

describe("combineTotals", () => {
  it("returns zero when there are no totals", () => {
    const result = combineTotals([], "CLP", null);
    expect(result.combined).toBe(0);
    expect(result.primaryCurrency).toBe("CLP");
  });

  it("uses the single total as-is when there is only one currency", () => {
    const result = combineTotals([{ currency: "CLP", total: 5000 }], "CLP", null);
    expect(result.combined).toBe(5000);
    expect(result.converted).toBe(false);
  });

  it("keeps totals separate when there is no exchange rate", () => {
    const result = combineTotals(
      [
        { currency: "CLP", total: 5000 },
        { currency: "USD", total: 10 },
      ],
      "CLP",
      null
    );
    expect(result.combined).toBe(5000);
    expect(result.converted).toBe(false);
    expect(result.secondary).toEqual([{ currency: "USD", total: 10 }]);
  });

  it("converts and combines totals when a rate is available", () => {
    const result = combineTotals(
      [
        { currency: "CLP", total: 5000 },
        { currency: "USD", total: 10 },
      ],
      "CLP",
      950
    );
    expect(result.combined).toBe(5000 + 10 * 950);
    expect(result.converted).toBe(true);
  });
});

describe("summarizeTotals", () => {
  it("formats the combined value in the primary currency", () => {
    const result = summarizeTotals([{ currency: "CLP", total: 9990 }], "CLP", null);
    expect(result.value).toBe("$9.990");
    expect(result.secondaryValue).toBeUndefined();
  });

  it("shows a secondary value when currencies could not be combined", () => {
    const result = summarizeTotals(
      [
        { currency: "CLP", total: 9990 },
        { currency: "USD", total: 10 },
      ],
      "CLP",
      null
    );
    expect(result.secondaryValue).toBe("US$10,00");
  });

  it("applies the multiplier to both the value and the secondary value", () => {
    const result = summarizeTotals(
      [
        { currency: "CLP", total: 1000 },
        { currency: "USD", total: 10 },
      ],
      "CLP",
      null,
      12
    );
    expect(result.value).toBe("$12.000");
    expect(result.secondaryValue).toBe("US$120,00");
  });
});

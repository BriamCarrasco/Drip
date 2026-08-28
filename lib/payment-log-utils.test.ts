import { describe, expect, it } from "vitest";
import { totalFromPaymentLog } from "@/lib/payment-log-utils";

describe("totalFromPaymentLog", () => {
  it("returns 0 for an empty log", () => {
    expect(totalFromPaymentLog([])).toBe(0);
  });

  it("sums every recorded payment", () => {
    expect(totalFromPaymentLog([{ amount: 9990 }, { amount: 12990 }, { amount: 5990 }])).toBe(28970);
  });
});

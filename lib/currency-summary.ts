import { convertToCurrency } from "@/lib/currency-utils";
import { formatMoney } from "@/lib/format";

export type CurrencyTotal = { currency: string; total: number };

export function combineTotals(
  totals: CurrencyTotal[],
  defaultCurrency: string,
  usdClpRate: number | null
): { combined: number; primaryCurrency: string; secondary: CurrencyTotal[]; converted: boolean } {
  const primary = totals.find((t) => t.currency === defaultCurrency) ?? totals[0];
  const secondary = totals.filter((t) => t !== primary);
  const converted = secondary.length > 0 && usdClpRate !== null;

  const combined = primary
    ? primary.total +
      (converted
        ? secondary.reduce(
            (sum, t) => sum + convertToCurrency(t.total, t.currency, primary.currency, usdClpRate!),
            0
          )
        : 0)
    : 0;

  return { combined, primaryCurrency: primary?.currency ?? defaultCurrency, secondary, converted };
}

export function summarizeTotals(
  totals: CurrencyTotal[],
  defaultCurrency: string,
  usdClpRate: number | null,
  multiplier = 1
) {
  const { combined, primaryCurrency, secondary, converted } = combineTotals(totals, defaultCurrency, usdClpRate);

  return {
    value:
      totals.length > 0 ? formatMoney(combined * multiplier, primaryCurrency) : formatMoney(0, defaultCurrency),
    secondaryValue:
      !converted && secondary.length > 0
        ? secondary.map(({ currency, total }) => formatMoney(total * multiplier, currency)).join(" + ")
        : undefined,
    converted,
  };
}

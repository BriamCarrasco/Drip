export function convertToCurrency(amount: number, from: string, to: string, usdClpRate: number): number {
  if (from === to) return amount;
  if (from === "USD" && to === "CLP") return amount * usdClpRate;
  if (from === "CLP" && to === "USD") return amount / usdClpRate;
  return amount;
}

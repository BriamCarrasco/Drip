const currencySymbols: Record<string, string> = {
  CLP: "$",
  USD: "US$",
};

const currencyFractionDigits: Record<string, number> = {
  CLP: 0,
  USD: 2,
};

export function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] ?? `${currency} `;
  const fractionDigits = currencyFractionDigits[currency] ?? 2;
  const formatted = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

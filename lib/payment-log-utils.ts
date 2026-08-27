export type PaymentLogEntry = {
  amount: number;
  currency: string;
  paidAt: string;
};

export function totalFromPaymentLog(entries: { amount: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

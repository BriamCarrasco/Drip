import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentLog } from "@/drizzle/schema";
import type { PaymentLogEntry } from "@/lib/payment-log-utils";

export type { PaymentLogEntry } from "@/lib/payment-log-utils";
export { totalFromPaymentLog } from "@/lib/payment-log-utils";

export function getPaymentLog(subscriptionId: number): PaymentLogEntry[] {
  return db
    .select({
      amount: paymentLog.amount,
      currency: paymentLog.currency,
      paidAt: paymentLog.paidAt,
    })
    .from(paymentLog)
    .where(eq(paymentLog.subscriptionId, subscriptionId))
    .all();
}

export function recordPayment(
  subscriptionId: number,
  amount: number,
  currency: string,
  paidAt?: string
): void {
  db.insert(paymentLog)
    .values({ subscriptionId, amount, currency, paidAt: paidAt ?? new Date().toISOString() })
    .run();
}

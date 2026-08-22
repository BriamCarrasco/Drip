import type { BillingCycle } from "@/drizzle/schema";

export function monthlyEquivalent(input: {
  amount: number;
  billingCycle: BillingCycle;
  customIntervalDays?: number | null;
}): number {
  switch (input.billingCycle) {
    case "weekly":
      return (input.amount * 52) / 12;
    case "monthly":
      return input.amount;
    case "yearly":
      return input.amount / 12;
    case "custom_days": {
      const days = input.customIntervalDays && input.customIntervalDays > 0 ? input.customIntervalDays : 30;
      return (input.amount * 365) / (days * 12);
    }
  }
}

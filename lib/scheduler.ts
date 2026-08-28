import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions as subscriptionsTable } from "@/drizzle/schema";
import { getAllActiveSubscriptions, type SubscriptionRow } from "@/lib/subscriptions";
import {
  getSettingsForUser,
  getUsersWithMonthlyBudget,
  isAutoExchangeRateEnabledForAnyUser,
  setBudgetAlertSentFor,
} from "@/lib/settings";
import { getDueSubscriptions, getOverdueSubscriptions } from "@/lib/scheduler-logic";
import { recordPayment } from "@/lib/payment-log";
import { advanceDate } from "@/lib/calendar";
import { sendNotification } from "@/lib/apprise";
import { refreshUsdClpRate, getEffectiveUsdClpRate } from "@/lib/exchange-rate";
import { combineTotals } from "@/lib/currency-summary";
import { monthlyTotalsByCurrency, normalizeSplitCount } from "@/lib/subscription-calculations";
import { formatMoney, formatDate } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function rollOverdueSubscriptions(today: string): number {
  const overdue = getOverdueSubscriptions(getAllActiveSubscriptions(), today);
  let rolled = 0;

  for (const sub of overdue) {
    let nextDate = sub.nextBillingDate;
    let guard = 0;
    const splitCount = normalizeSplitCount(sub.splitCount);

    while (nextDate < today && guard < 500) {
      recordPayment(sub.id, sub.amount / splitCount, sub.currency, `${nextDate}T00:00:00.000Z`);
      nextDate = advanceDate(
        new Date(`${nextDate}T00:00:00`),
        sub.billingCycle,
        sub.customIntervalDays
      )
        .toISOString()
        .slice(0, 10);
      guard += 1;
    }

    db.update(subscriptionsTable)
      .set({ nextBillingDate: nextDate, isTrial: false })
      .where(eq(subscriptionsTable.id, sub.id))
      .run();

    rolled += 1;
  }

  return rolled;
}

async function checkMonthlyBudgets(subscriptions: SubscriptionRow[], today: string): Promise<number> {
  const currentMonthKey = today.slice(0, 7);
  let alerted = 0;

  for (const budgetSettings of getUsersWithMonthlyBudget()) {
    if (budgetSettings.budgetAlertSentFor === currentMonthKey) continue;
    if (!budgetSettings.defaultAppriseUrl) continue;

    const userSubs = subscriptions.filter((sub) => sub.userId === budgetSettings.userId);
    const totals = monthlyTotalsByCurrency(userSubs);
    const usdClpRate = getEffectiveUsdClpRate(budgetSettings);
    const { combined } = combineTotals(totals, budgetSettings.defaultCurrency, usdClpRate);

    if (combined <= budgetSettings.monthlyBudget) continue;

    const ok = await sendNotification({
      url: budgetSettings.defaultAppriseUrl,
      title: "Suscripciones — Presupuesto mensual superado",
      body: `Tus suscripciones activas ya suman ${formatMoney(combined, budgetSettings.defaultCurrency)} al mes, por sobre tu presupuesto de ${formatMoney(budgetSettings.monthlyBudget, budgetSettings.defaultCurrency)}.`,
    });

    if (ok) {
      setBudgetAlertSentFor(budgetSettings.userId, currentMonthKey);
      alerted += 1;
    }
  }

  return alerted;
}

export async function runDailyCheck(): Promise<{
  checked: number;
  notified: number;
  rolled: number;
  budgetAlerted: number;
}> {
  if (isAutoExchangeRateEnabledForAnyUser()) {
    const rate = await refreshUsdClpRate();
    if (rate === null) {
      console.warn("[scheduler] no se pudo actualizar el tipo de cambio USD/CLP");
    }
  }

  const today = todayIso();
  const rolled = rollOverdueSubscriptions(today);

  const subscriptions = getAllActiveSubscriptions();
  const due = getDueSubscriptions(subscriptions, today);

  let notified = 0;

  for (const sub of due) {
    const appriseUrl = sub.appriseUrl ?? getSettingsForUser(sub.userId).defaultAppriseUrl;
    if (!appriseUrl) {
      console.warn(`[scheduler] "${sub.name}" (usuario ${sub.userId}) no tiene URL de Apprise configurada`);
      continue;
    }

    const share =
      sub.splitCount > 1
        ? ` Tu parte: ${formatMoney(sub.amount / sub.splitCount, sub.currency)}.`
        : "";

    const body = sub.isTrial
      ? `Tu prueba gratuita de ${sub.name} termina el ${formatDate(sub.nextBillingDate)} y se cobrará ${formatMoney(sub.amount, sub.currency)}.${share}`
      : `${sub.name} se cobra el ${formatDate(sub.nextBillingDate)} (${formatMoney(sub.amount, sub.currency)}).${share}`;

    const ok = await sendNotification({
      url: appriseUrl,
      title: `Suscripciones — ${sub.name}`,
      body,
    });

    if (ok) {
      db.update(subscriptionsTable)
        .set({ lastNotifiedFor: sub.nextBillingDate })
        .where(eq(subscriptionsTable.id, sub.id))
        .run();
      notified += 1;
    }
  }

  const budgetAlerted = await checkMonthlyBudgets(subscriptions, today);

  return { checked: subscriptions.length, notified, rolled, budgetAlerted };
}

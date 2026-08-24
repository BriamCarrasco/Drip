import { getAllActiveSubscriptions } from "@/lib/subscriptions";
import { getSettingsForUser, isAutoExchangeRateEnabledForAnyUser } from "@/lib/settings";
import { getDueSubscriptions } from "@/lib/scheduler-logic";
import { sendNotification } from "@/lib/apprise";
import { refreshUsdClpRate } from "@/lib/exchange-rate";
import { formatMoney, formatDate } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runDailyCheck(): Promise<{ checked: number; notified: number }> {
  if (isAutoExchangeRateEnabledForAnyUser()) {
    const rate = await refreshUsdClpRate();
    if (rate === null) {
      console.warn("[scheduler] no se pudo actualizar el tipo de cambio USD/CLP");
    }
  }

  const subscriptions = getAllActiveSubscriptions();
  const due = getDueSubscriptions(subscriptions, todayIso());

  let notified = 0;

  for (const sub of due) {
    const appriseUrl = sub.appriseUrl ?? getSettingsForUser(sub.userId).defaultAppriseUrl;
    if (!appriseUrl) {
      console.warn(`[scheduler] "${sub.name}" (usuario ${sub.userId}) no tiene URL de Apprise configurada`);
      continue;
    }

    const body = sub.isTrial
      ? `Tu prueba gratuita de ${sub.name} termina el ${formatDate(sub.nextBillingDate)} y se cobrará ${formatMoney(sub.amount, sub.currency)}.`
      : `${sub.name} se cobra el ${formatDate(sub.nextBillingDate)} (${formatMoney(sub.amount, sub.currency)}).`;

    const ok = await sendNotification({
      url: appriseUrl,
      title: `Suscripciones — ${sub.name}`,
      body,
    });

    if (ok) notified += 1;
  }

  return { checked: subscriptions.length, notified };
}

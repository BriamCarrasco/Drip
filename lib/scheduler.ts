import { getAllActiveSubscriptions } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { getDueSubscriptions } from "@/lib/scheduler-logic";
import { sendNotification } from "@/lib/apprise";
import { formatCLP, formatDate } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runDailyCheck(): Promise<{ checked: number; notified: number }> {
  const subscriptions = getAllActiveSubscriptions();
  const due = getDueSubscriptions(subscriptions, todayIso());

  let notified = 0;

  for (const sub of due) {
    const appriseUrl = sub.appriseUrl ?? getSettingsForUser(sub.userId).defaultAppriseUrl;
    if (!appriseUrl) {
      console.warn(`[scheduler] "${sub.name}" (usuario ${sub.userId}) no tiene URL de Apprise configurada`);
      continue;
    }

    const ok = await sendNotification({
      url: appriseUrl,
      title: `Suscripciones — ${sub.name}`,
      body: `${sub.name} se cobra el ${formatDate(sub.nextBillingDate)} ($${formatCLP(sub.amount)} ${sub.currency}).`,
    });

    if (ok) notified += 1;
  }

  return { checked: subscriptions.length, notified };
}

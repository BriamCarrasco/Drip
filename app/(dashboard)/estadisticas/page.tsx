import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { getEffectiveUsdClpRate } from "@/lib/exchange-rate";
import { getPriceHistory, type PriceHistoryEntry } from "@/lib/price-history";
import { getStatusHistory, type StatusHistoryEntry } from "@/lib/status-history";
import { combineTotals } from "@/lib/currency-summary";
import {
  hasHistoryOlderThan,
  monthlyTotalsAt,
  nowMs,
  totalsSpentBySubscription,
} from "@/lib/insights";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import { BarChartIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

const ONE_YEAR_MS = 365 * 86_400_000;

export default async function EstadisticasPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:px-14">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Estadísticas</h1>
          <p className="mt-1.5 text-sm text-muted">
            Cobros completos desde que registraste cada suscripción, no fracciones de días.
          </p>
        </div>
        <p className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Todavía no tienes suscripciones registradas.
        </p>
      </div>
    );
  }

  const settings = getSettingsForUser(userId);
  const { defaultCurrency } = settings;
  const usdClpRate = getEffectiveUsdClpRate(settings);

  const priceHistoryBySub = new Map<number, PriceHistoryEntry[]>();
  const statusHistoryBySub = new Map<number, StatusHistoryEntry[]>();
  for (const sub of subscriptions) {
    priceHistoryBySub.set(sub.id, getPriceHistory(sub.id));
    statusHistoryBySub.set(sub.id, getStatusHistory(sub.id));
  }

  const spends = totalsSpentBySubscription(subscriptions, priceHistoryBySub, statusHistoryBySub);

  const totalsByCurrency = new Map<string, number>();
  for (const spend of spends) {
    totalsByCurrency.set(
      spend.subscription.currency,
      (totalsByCurrency.get(spend.subscription.currency) ?? 0) + spend.totalSpent
    );
  }
  const totalSpent = combineTotals(
    Array.from(totalsByCurrency, ([currency, total]) => ({ currency, total })),
    defaultCurrency,
    usdClpRate
  );

  const topSpend = spends[0];

  const now = nowMs();
  const enoughHistory = hasHistoryOlderThan(priceHistoryBySub, 330);
  let yearChange: { value: string; label: string } = {
    value: "—",
    label: "Necesitamos al menos un año de historial",
  };

  if (enoughHistory) {
    const nowTotal = combineTotals(
      monthlyTotalsAt(subscriptions, priceHistoryBySub, statusHistoryBySub, now),
      defaultCurrency,
      usdClpRate
    );
    const pastTotal = combineTotals(
      monthlyTotalsAt(subscriptions, priceHistoryBySub, statusHistoryBySub, now - ONE_YEAR_MS),
      defaultCurrency,
      usdClpRate
    );

    if (pastTotal.combined === 0) {
      yearChange = {
        value: nowTotal.combined > 0 ? "Nuevo" : "—",
        label: "No pagabas suscripciones hace un año",
      };
    } else {
      const pct = ((nowTotal.combined - pastTotal.combined) / pastTotal.combined) * 100;
      const sign = pct > 0 ? "+" : "";
      yearChange = {
        value: `${sign}${pct.toFixed(0)}%`,
        label: "Gasto mensual vs. hace un año",
      };
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:px-14">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Estadísticas</h1>
        <p className="mt-1.5 text-sm text-muted">
          Cobros completos desde que registraste cada suscripción, no fracciones de días.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <StatTile
          icon={<WalletIcon />}
          value={totalSpent.combined > 0 ? formatMoney(totalSpent.combined, totalSpent.primaryCurrency) : "—"}
          label="Total pagado hasta hoy"
        />
        <StatTile
          icon={<TrendingUpIcon />}
          value={topSpend ? formatMoney(topSpend.totalSpent, topSpend.subscription.currency) : "—"}
          label={topSpend ? `Lo que más te ha costado · ${topSpend.subscription.name}` : "Sin datos"}
        />
        <StatTile icon={<BarChartIcon />} value={yearChange.value} label={yearChange.label} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Ranking de gasto acumulado</h2>
        <span className="text-[13px] text-muted">{spends.length} suscripciones</span>
      </div>

      <div className="flex flex-col gap-2">
        {spends.map(({ subscription, totalSpent }) => (
          <div
            key={subscription.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <SubscriptionAvatar
                name={subscription.name}
                logoUrl={subscription.logoUrl}
                size={32}
                rounded="rounded-[9px]"
                className="text-[13px]"
              />
              <div>
                <p className="text-[14px] font-semibold">{subscription.name}</p>
                <p className="text-[12px] text-muted">
                  {subscription.isActive ? subscription.category : `${subscription.category} · pausada`}
                </p>
              </div>
            </div>
            <span className="text-[14px] font-semibold">
              {formatMoney(totalSpent, subscription.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

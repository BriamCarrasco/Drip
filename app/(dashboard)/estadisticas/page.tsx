import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { getEffectiveUsdClpRate, getOrFetchHistoricalUsdClpRate } from "@/lib/exchange-rate";
import { getPriceHistory, type PriceHistoryEntry } from "@/lib/price-history";
import { getStatusHistory, type StatusHistoryEntry } from "@/lib/status-history";
import { getPaymentLog, type PaymentLogEntry } from "@/lib/payment-log";
import { combineTotals } from "@/lib/currency-summary";
import {
  computeFxImpact,
  hasHistoryOlderThan,
  monthlyTotalsAt,
  nowMs,
  totalsSpentBySubscription,
} from "@/lib/insights";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import { EmptyStateNote } from "@/components/dashboard/EmptyStateNote";
import { PageContainer } from "@/components/dashboard/PageContainer";
import { BarChartIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

const MIN_DAYS_FOR_FX_IMPACT = 20;

const ONE_YEAR_MS = 365 * 86_400_000;

export default async function EstadisticasPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId);

  if (subscriptions.length === 0) {
    return (
      <PageContainer>
        <div>
          <h1 className="font-heading text-2xl font-semibold">Estadísticas</h1>
          <p className="mt-1.5 text-sm text-muted">
            Solo cuenta lo que confirmaste como pagado, a mano o porque venció automáticamente.
          </p>
        </div>
        <EmptyStateNote>Todavía no tienes suscripciones registradas.</EmptyStateNote>
      </PageContainer>
    );
  }

  const settings = getSettingsForUser(userId);
  const { defaultCurrency } = settings;
  const usdClpRate = getEffectiveUsdClpRate(settings);

  const priceHistoryBySub = new Map<number, PriceHistoryEntry[]>();
  const statusHistoryBySub = new Map<number, StatusHistoryEntry[]>();
  const paymentLogBySub = new Map<number, PaymentLogEntry[]>();
  for (const sub of subscriptions) {
    priceHistoryBySub.set(sub.id, getPriceHistory(sub.id));
    statusHistoryBySub.set(sub.id, getStatusHistory(sub.id));
    paymentLogBySub.set(sub.id, getPaymentLog(sub.id));
  }

  const spends = totalsSpentBySubscription(subscriptions, paymentLogBySub);

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

  const fxEnabled = settings.exchangeRateMode === "auto" && usdClpRate !== null;
  const foreignSubs = subscriptions.filter((sub) => sub.currency !== defaultCurrency);
  let fxImpact: ReturnType<typeof computeFxImpact> = [];

  if (fxEnabled && foreignSubs.length > 0) {
    const firstRateEntries = await Promise.all(
      foreignSubs.map(async (sub) => {
        const history = priceHistoryBySub.get(sub.id) ?? [];
        if (history.length === 0) return null;
        const sorted = [...history].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
        const firstChangedAt = new Date(sorted[0].changedAt).getTime();
        const elapsedDays = (now - firstChangedAt) / 86_400_000;
        if (elapsedDays < MIN_DAYS_FOR_FX_IMPACT) return null;

        const rate = await getOrFetchHistoricalUsdClpRate(sorted[0].changedAt.slice(0, 10));
        return rate !== null ? ([sub.id, rate] as const) : null;
      })
    );

    const firstRateBySub = new Map(
      firstRateEntries.filter((entry): entry is [number, number] => entry !== null)
    );

    fxImpact = computeFxImpact(foreignSubs, priceHistoryBySub, firstRateBySub, defaultCurrency, usdClpRate!);
  }

  return (
    <PageContainer>
      <div>
        <h1 className="font-heading text-2xl font-semibold">Estadísticas</h1>
        <p className="mt-1.5 text-sm text-muted">
          Solo cuenta lo que confirmaste como pagado, a mano o porque venció automáticamente.
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

      {foreignSubs.length > 0 && (
        <>
          <div>
            <h2 className="text-[17px] font-semibold">Impacto del tipo de cambio</h2>
            <p className="mt-1 text-[13px] text-muted">
              Cuánto de lo que subió cada suscripción es el proveedor y cuánto es el dólar.
            </p>
          </div>

          {!fxEnabled ? (
            <EmptyStateNote compact>
              Activa el tipo de cambio automático en Configuración → Preferencias para ver este
              análisis.
            </EmptyStateNote>
          ) : fxImpact.length === 0 ? (
            <EmptyStateNote compact>
              Necesitamos al menos {MIN_DAYS_FOR_FX_IMPACT} días de historial en tus suscripciones
              en {foreignSubs[0].currency} para calcular esto.
            </EmptyStateNote>
          ) : (
            <div className="flex flex-col gap-2">
              {fxImpact.map((row) => (
                <div
                  key={row.subscription.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <SubscriptionAvatar
                      name={row.subscription.name}
                      logoUrl={row.subscription.logoUrl}
                      size={32}
                      rounded="rounded-[9px]"
                      className="text-[13px]"
                    />
                    <div>
                      <p className="text-[14px] font-semibold">{row.subscription.name}</p>
                      <p className="text-[12px] text-muted">
                        Precio en {row.subscription.currency}: {row.vendorPct >= 0 ? "+" : ""}
                        {row.vendorPct.toFixed(0)}% · Dólar: {row.fxPct >= 0 ? "+" : ""}
                        {row.fxPct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <span className="text-[14px] font-semibold">
                    En {defaultCurrency}: {row.combinedPct >= 0 ? "+" : ""}
                    {row.combinedPct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

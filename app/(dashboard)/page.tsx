import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { convertToCurrency, getEffectiveUsdClpRate } from "@/lib/exchange-rate";
import { monthlyTotalsByCurrency } from "@/lib/subscription-calculations";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { EmptyHomeState } from "@/components/dashboard/EmptyHomeState";
import { CalendarIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { formatMoney, formatDate } from "@/lib/format";

export default async function HomePage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-9 sm:px-8 lg:px-14">
        <EmptyHomeState />
      </div>
    );
  }

  const settings = getSettingsForUser(userId);
  const { defaultCurrency } = settings;
  const active = subscriptions.filter((sub) => sub.isActive);
  const monthlyTotals = monthlyTotalsByCurrency(active);
  const primaryTotal = monthlyTotals.find((t) => t.currency === defaultCurrency) ?? monthlyTotals[0];
  const secondaryTotals = monthlyTotals.filter((t) => t !== primaryTotal);

  const usdClpRate = getEffectiveUsdClpRate(settings);
  const canConvert = secondaryTotals.length > 0 && usdClpRate !== null;
  const combinedMonthlyTotal = primaryTotal
    ? primaryTotal.total +
      (canConvert
        ? secondaryTotals.reduce(
            (sum, t) => sum + convertToCurrency(t.total, t.currency, primaryTotal.currency, usdClpRate!),
            0
          )
        : 0)
    : 0;

  const monthlyValue = primaryTotal ? formatMoney(combinedMonthlyTotal, primaryTotal.currency) : "—";
  const yearlyValue = primaryTotal ? formatMoney(combinedMonthlyTotal * 12, primaryTotal.currency) : "—";
  const monthlySecondary =
    !canConvert && secondaryTotals.length > 0
      ? secondaryTotals.map(({ currency, total }) => formatMoney(total, currency)).join(" + ")
      : undefined;
  const yearlySecondary =
    !canConvert && secondaryTotals.length > 0
      ? secondaryTotals.map(({ currency, total }) => formatMoney(total * 12, currency)).join(" + ")
      : undefined;
  const monthlyLabel = canConvert ? "Gasto mensual (convertido)" : "Gasto mensual";
  const yearlyLabel = canConvert ? "Gasto anual proyectado (convertido)" : "Gasto anual proyectado";

  const next = active[0];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:px-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <StatTile
          icon={<WalletIcon />}
          value={monthlyValue}
          secondaryValue={monthlySecondary}
          label={monthlyLabel}
        />
        <StatTile
          icon={<TrendingUpIcon />}
          value={yearlyValue}
          secondaryValue={yearlySecondary}
          label={yearlyLabel}
        />
        <StatTile
          icon={<CalendarIcon size={18} />}
          value={next ? formatDate(next.nextBillingDate) : "—"}
          label={next ? `Próxima renovación · ${next.name}` : "Sin suscripciones activas"}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Tus suscripciones</h2>
        <span className="text-[13px] text-muted">{active.length} activas</span>
      </div>

      {active.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Todavía no tienes suscripciones activas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {active.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

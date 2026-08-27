import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { getEffectiveUsdClpRate } from "@/lib/exchange-rate";
import { monthlyTotalsByCurrency } from "@/lib/subscription-calculations";
import { summarizeTotals } from "@/lib/currency-summary";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { EmptyHomeState } from "@/components/dashboard/EmptyHomeState";
import { CalendarIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";

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
  const usdClpRate = getEffectiveUsdClpRate(settings);

  const active = subscriptions.filter((sub) => sub.isActive);
  const totals = monthlyTotalsByCurrency(active);
  const monthly = summarizeTotals(totals, defaultCurrency, usdClpRate);
  const yearly = summarizeTotals(totals, defaultCurrency, usdClpRate, 12);

  const next = active[0];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:px-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <StatTile
          icon={<WalletIcon />}
          value={monthly.value}
          secondaryValue={monthly.secondaryValue}
          label={monthly.converted ? "Gasto mensual (convertido)" : "Gasto mensual"}
        />
        <StatTile
          icon={<TrendingUpIcon />}
          value={yearly.value}
          secondaryValue={yearly.secondaryValue}
          label={yearly.converted ? "Al año (convertido)" : "Al año"}
        />
        <StatTile
          icon={<CalendarIcon size={18} />}
          value={next ? formatDate(next.nextBillingDate) : "—"}
          label={next ? `Próximo cobro · ${next.name}` : "Sin cobros programados"}
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

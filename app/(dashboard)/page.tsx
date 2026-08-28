import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getSettingsForUser } from "@/lib/settings";
import { getEffectiveUsdClpRate } from "@/lib/exchange-rate";
import { monthlyTotalsByCurrency } from "@/lib/subscription-calculations";
import { summarizeTotals } from "@/lib/currency-summary";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionsGrid } from "@/components/dashboard/SubscriptionsGrid";
import { EmptyHomeState } from "@/components/dashboard/EmptyHomeState";
import { EmptyStateNote } from "@/components/dashboard/EmptyStateNote";
import { PageContainer } from "@/components/dashboard/PageContainer";
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
    <PageContainer>
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
        <EmptyStateNote>Todavía no tienes suscripciones activas.</EmptyStateNote>
      ) : (
        <SubscriptionsGrid subscriptions={active} />
      )}
    </PageContainer>
  );
}

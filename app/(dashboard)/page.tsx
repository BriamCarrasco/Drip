import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { monthlyEquivalent } from "@/lib/subscription-calculations";
import { StatTile } from "@/components/dashboard/StatTile";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { EmptyHomeState } from "@/components/dashboard/EmptyHomeState";
import { CalendarIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { formatCLP, formatDate } from "@/lib/format";

export default async function HomePage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-14 py-9">
        <EmptyHomeState />
      </div>
    );
  }

  const active = subscriptions.filter((sub) => sub.isActive);
  const monthlyTotal = active.reduce((sum, sub) => sum + monthlyEquivalent(sub), 0);
  const yearlyTotal = monthlyTotal * 12;
  const next = active[0];

  return (
    <div className="flex flex-col gap-7 px-14 py-9">
      <div className="flex gap-5">
        <StatTile
          icon={<WalletIcon />}
          value={`$${formatCLP(monthlyTotal)}`}
          label="Gasto mensual"
        />
        <StatTile
          icon={<TrendingUpIcon />}
          value={`$${formatCLP(yearlyTotal)}`}
          label="Gasto anual proyectado"
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
        <div className="grid grid-cols-3 gap-5">
          {active.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

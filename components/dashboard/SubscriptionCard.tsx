import { CalendarIcon } from "@/components/icons";
import { formatMoney, formatDate } from "@/lib/format";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import type { SubscriptionRow } from "@/lib/subscriptions";

export function SubscriptionCard({ subscription }: { subscription: SubscriptionRow }) {
  const isYearly = subscription.billingCycle === "yearly";

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <SubscriptionAvatar name={subscription.name} logoUrl={subscription.logoUrl} />
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-strong">
          {subscription.category}
        </span>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[15px] font-semibold">{subscription.name}</p>
          {subscription.isTrial && (
            <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
              Prueba
            </span>
          )}
        </div>
        <p className="mt-1.5 font-heading text-[21px] font-semibold">
          {formatMoney(subscription.amount, subscription.currency)}
          {isYearly && <span className="text-xs font-medium text-muted"> /año</span>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-border-soft pt-2.5 text-[12.5px] text-muted">
        <CalendarIcon />
        {subscription.isTrial ? "Termina prueba" : "Próximo cobro"}: {formatDate(subscription.nextBillingDate)}
      </div>
    </div>
  );
}

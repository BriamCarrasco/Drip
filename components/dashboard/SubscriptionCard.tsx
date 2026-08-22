import { CalendarIcon } from "@/components/icons";
import { formatCLP, formatDate } from "@/lib/format";
import { getAvatarStyle } from "@/lib/avatar";
import type { SubscriptionRow } from "@/lib/subscriptions";

export function SubscriptionCard({ subscription }: { subscription: SubscriptionRow }) {
  const isYearly = subscription.billingCycle === "yearly";
  const avatar = getAvatarStyle(subscription.name);

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <div
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-sm font-semibold"
          style={{ background: avatar.bg, color: avatar.color }}
        >
          {avatar.letter}
        </div>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-strong">
          {subscription.category}
        </span>
      </div>

      <div>
        <p className="text-[15px] font-semibold">{subscription.name}</p>
        <p className="mt-1.5 font-heading text-[21px] font-semibold">
          ${formatCLP(subscription.amount)}
          {isYearly && <span className="text-xs font-medium text-muted"> /año</span>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-border-soft pt-2.5 text-[12.5px] text-muted">
        <CalendarIcon />
        Próximo cobro: {formatDate(subscription.nextBillingDate)}
      </div>
    </div>
  );
}

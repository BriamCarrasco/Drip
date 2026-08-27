"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import { getAvatarStyle } from "@/lib/avatar";
import { formatMoney } from "@/lib/format";
import { getOccurrencesInRange } from "@/lib/calendar";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";
import type { SubscriptionRow } from "@/lib/subscriptions";

export type PaidOccurrence = {
  subscriptionId: number;
  name: string;
  logoUrl: string | null;
  amount: number;
  currency: string;
  date: string;
};

type DayItem =
  | { kind: "upcoming"; key: string; sub: SubscriptionRow }
  | { kind: "paid"; key: string; payment: PaidOccurrence };

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function RenewalsCalendar({
  subscriptions,
  payments,
}: {
  subscriptions: SubscriptionRow[];
  payments: PaidOccurrence[];
}) {
  const { openEditModal } = useSubscriptionModal();
  const today = useMemo(() => new Date(), []);
  const [cursorYear, setCursorYear] = useState(today.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(today.getMonth());
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);

  const monthStart = new Date(cursorYear, cursorMonth, 1);
  const monthEnd = new Date(cursorYear, cursorMonth + 1, 0);
  const rawMonthLabel = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(
    monthStart
  );
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();

    for (const sub of subscriptions) {
      const dates = getOccurrencesInRange(sub, toIso(monthStart), toIso(monthEnd));
      for (const iso of dates) {
        const list = map.get(iso) ?? [];
        list.push({ kind: "upcoming", key: `sub-${sub.id}-${iso}`, sub });
        map.set(iso, list);
      }
    }

    for (const payment of payments) {
      if (payment.date < toIso(monthStart) || payment.date > toIso(monthEnd)) continue;
      const list = map.get(payment.date) ?? [];
      list.push({ kind: "paid", key: `paid-${payment.subscriptionId}-${payment.date}`, payment });
      map.set(payment.date, list);
    }

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions, payments, cursorYear, cursorMonth]);

  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursorYear, cursorMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function goPrevMonth() {
    const d = new Date(cursorYear, cursorMonth - 1, 1);
    setDirection("prev");
    setCursorYear(d.getFullYear());
    setCursorMonth(d.getMonth());
  }

  function goNextMonth() {
    const d = new Date(cursorYear, cursorMonth + 1, 1);
    setDirection("next");
    setCursorYear(d.getFullYear());
    setCursorMonth(d.getMonth());
  }

  const todayIso = toIso(today);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border text-muted-strong hover:text-foreground"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border text-muted-strong hover:text-foreground"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div className="min-w-[560px] overflow-hidden">
          <div
            key={`${cursorYear}-${cursorMonth}`}
            className={
              direction === "next" ? "animate-slide-in-right" : direction === "prev" ? "animate-slide-in-left" : ""
            }
          >
            <div className="grid grid-cols-7 divide-x divide-border-soft border-b border-border-soft">
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className="px-2 py-2.5 text-center text-xs font-semibold tracking-wide text-muted uppercase"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="divide-y divide-border-soft">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border-soft">
                  {week.map((date, dayIndex) => {
                    const iso = date ? toIso(date) : null;
                    const items = iso ? (itemsByDay.get(iso) ?? []) : [];
                    const isToday = iso === todayIso;

                    return (
                      <div
                        key={dayIndex}
                        className={`flex min-h-[92px] flex-col gap-1 p-1.5 sm:min-h-[110px] sm:p-2 ${
                          date ? "" : "bg-surface-muted/40"
                        }`}
                      >
                        {date && (
                          <span
                            className={
                              isToday
                                ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white"
                                : "text-[12px] font-semibold text-muted-strong"
                            }
                          >
                            {date.getDate()}
                          </span>
                        )}
                        <div className="flex flex-col gap-1">
                          {items.slice(0, 3).map((item) => {
                            if (item.kind === "paid") {
                              const { payment } = item;
                              const label = `${payment.name} · ${formatMoney(payment.amount, payment.currency)} · pagado`;
                              return (
                                <div
                                  key={item.key}
                                  title={label}
                                  className="flex items-center gap-1 truncate rounded-md bg-success-tint px-1.5 py-1 text-left text-[11px] font-semibold text-success opacity-80"
                                >
                                  <CheckIcon size={11} />
                                  <span className="truncate">{payment.name}</span>
                                </div>
                              );
                            }

                            const { sub } = item;
                            const avatar = getAvatarStyle(sub.name);
                            const label = `${sub.name} · ${formatMoney(sub.amount, sub.currency)}`;

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => openEditModal(sub)}
                                title={label}
                                className="flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold"
                                style={{ background: avatar.bg, color: avatar.color }}
                              >
                                <SubscriptionAvatar
                                  name={sub.name}
                                  logoUrl={sub.logoUrl}
                                  size={14}
                                  rounded="rounded-[3px]"
                                  className="text-[8px]"
                                />
                                <span className="truncate">{sub.name}</span>
                              </button>
                            );
                          })}
                          {items.length > 3 && (
                            <span className="text-[11px] font-medium text-muted">
                              +{items.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

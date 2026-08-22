"use client";

import { useMemo, useState, useTransition } from "react";
import { PencilIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { formatCLP, formatDate } from "@/lib/format";
import { categorySuggestions } from "@/lib/categories";
import { getAvatarStyle } from "@/lib/avatar";
import type { SubscriptionRow } from "@/lib/subscriptions";
import type { BillingCycle } from "@/drizzle/schema";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";
import { deleteSubscriptionAction } from "@/app/(dashboard)/suscripciones/actions";

const cycleLabels: Record<BillingCycle, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
  custom_days: "Personalizado",
};

export function SubscriptionsTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const { openEditModal } = useSubscriptionModal();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const fromData = subscriptions.map((sub) => sub.category);
    return Array.from(new Set([...categorySuggestions, ...fromData]));
  }, [subscriptions]);

  const filtered = useMemo(() => {
    return subscriptions
      .filter((sub) => (activeCategory ? sub.category === activeCategory : true))
      .filter((sub) => sub.name.toLowerCase().includes(search.toLowerCase()));
  }, [subscriptions, activeCategory, search]);

  function handleDelete(id: number) {
    startTransition(() => {
      deleteSubscriptionAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={
              activeCategory === null
                ? "rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
                : "rounded-full bg-surface-muted px-3.5 py-1.5 text-[13px] font-medium text-muted-strong"
            }
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={
                activeCategory === category
                  ? "rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
                  : "rounded-full bg-surface-muted px-3.5 py-1.5 text-[13px] font-medium text-muted-strong"
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex w-60 items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
          <SearchIcon className="text-placeholder" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar suscripción..."
            className="w-full text-[13.5px] outline-none placeholder:text-placeholder"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center px-6 py-3.5 text-xs font-semibold tracking-wide text-muted uppercase border-b border-border-soft">
          <span className="flex-[2.4]">Servicio</span>
          <span className="flex-[1.2]">Categoría</span>
          <span className="flex-1">Ciclo</span>
          <span className="flex-[1.2]">Próximo cobro</span>
          <span className="flex-1 text-right">Monto</span>
          <span className="flex-1 text-center">Estado</span>
          <span className="w-[72px] text-right">Acciones</span>
        </div>

        {filtered.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-muted">
            No hay suscripciones que coincidan con el filtro.
          </p>
        )}

        {filtered.map((sub, index) => {
          const avatar = getAvatarStyle(sub.name);
          return (
            <div
              key={sub.id}
              className={
                index === filtered.length - 1
                  ? "flex items-center px-6 py-[18px]"
                  : "flex items-center px-6 py-[18px] border-b border-border-soft"
              }
            >
              <span className="flex flex-[2.4] items-center gap-3.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-semibold"
                  style={{ background: avatar.bg, color: avatar.color }}
                >
                  {avatar.letter}
                </span>
                <span className="text-sm font-semibold">{sub.name}</span>
              </span>
              <span className="flex-[1.2] text-[13.5px] text-foreground/70">{sub.category}</span>
              <span className="flex-1 text-[13.5px] text-foreground/70">
                {cycleLabels[sub.billingCycle]}
              </span>
              <span className="flex-[1.2] text-[13.5px] text-foreground/70">
                {formatDate(sub.nextBillingDate)}
              </span>
              <span className="flex-1 text-right text-sm font-semibold">
                ${formatCLP(sub.amount)}
              </span>
              <span className="flex-1 text-center">
                <span
                  className={
                    sub.isActive
                      ? "rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success"
                      : "rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-strong"
                  }
                >
                  {sub.isActive ? "Activa" : "Inactiva"}
                </span>
              </span>
              <span className="flex w-[72px] items-center justify-end gap-3">
                <button
                  onClick={() => openEditModal(sub)}
                  aria-label={`Editar ${sub.name}`}
                  className="text-muted hover:text-foreground"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  disabled={isPending}
                  aria-label={`Eliminar ${sub.name}`}
                  className="text-accent hover:opacity-70 disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { PencilIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { formatMoney, formatDate } from "@/lib/format";
import { categorySuggestions } from "@/lib/categories";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import type { SubscriptionRow } from "@/lib/subscriptions";
import type { BillingCycle } from "@/drizzle/schema";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";
import {
  deleteSubscriptionAction,
  toggleSubscriptionActiveAction,
} from "@/app/(dashboard)/suscripciones/actions";

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

  function handleToggleActive(id: number) {
    startTransition(() => {
      toggleSubscriptionActiveAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={
              activeCategory === null
                ? "shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
                : "shrink-0 rounded-full bg-surface-muted px-3.5 py-1.5 text-[13px] font-medium text-muted-strong"
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
                  ? "shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
                  : "shrink-0 rounded-full bg-surface-muted px-3.5 py-1.5 text-[13px] font-medium text-muted-strong"
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 sm:w-60">
          <SearchIcon className="shrink-0 text-placeholder" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar suscripción..."
            className="w-full text-[13.5px] outline-none placeholder:text-placeholder"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="hidden items-center px-6 py-3.5 text-xs font-semibold tracking-wide text-muted uppercase border-b border-border-soft md:flex">
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
          const isLast = index === filtered.length - 1;
          const statusPill = (
            <button
              type="button"
              onClick={() => handleToggleActive(sub.id)}
              disabled={isPending}
              title={sub.isActive ? "Pausar suscripción" : "Reactivar suscripción"}
              className={
                sub.isActive
                  ? "rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success disabled:opacity-50"
                  : "rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-strong disabled:opacity-50"
              }
            >
              {sub.isActive ? "Activa" : "Inactiva"}
            </button>
          );
          const trialBadge = sub.isTrial && (
            <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
              Prueba
            </span>
          );
          const actions = (
            <>
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
            </>
          );
          const avatarBadge = (
            <SubscriptionAvatar name={sub.name} logoUrl={sub.logoUrl} size={36} rounded="rounded-[10px]" />
          );

          return (
            <div
              key={sub.id}
              className={
                isLast
                  ? "flex flex-col gap-3 px-4 py-4 sm:px-6 md:hidden"
                  : "flex flex-col gap-3 border-b border-border-soft px-4 py-4 sm:px-6 md:hidden"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {avatarBadge}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold">{sub.name}</p>
                      {trialBadge}
                    </div>
                    <p className="text-[12.5px] text-foreground/60">{sub.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">{actions}</div>
              </div>
              <div className="flex items-center justify-between text-[13px] text-foreground/70">
                <span>
                  {cycleLabels[sub.billingCycle]} · {formatDate(sub.nextBillingDate)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatMoney(sub.amount, sub.currency)}
                </span>
              </div>
              <div>{statusPill}</div>
            </div>
          );
        })}

        {filtered.map((sub, index) => {
          return (
            <div
              key={sub.id}
              className={
                index === filtered.length - 1
                  ? "hidden items-center px-6 py-[18px] md:flex"
                  : "hidden items-center border-b border-border-soft px-6 py-[18px] md:flex"
              }
            >
              <span className="flex flex-[2.4] items-center gap-3.5">
                <SubscriptionAvatar name={sub.name} logoUrl={sub.logoUrl} size={36} rounded="rounded-[10px]" />
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{sub.name}</span>
                  {sub.isTrial && (
                    <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
                      Prueba
                    </span>
                  )}
                </span>
              </span>
              <span className="flex-[1.2] text-[13.5px] text-foreground/70">{sub.category}</span>
              <span className="flex-1 text-[13.5px] text-foreground/70">
                {cycleLabels[sub.billingCycle]}
              </span>
              <span className="flex-[1.2] text-[13.5px] text-foreground/70">
                {formatDate(sub.nextBillingDate)}
              </span>
              <span className="flex-1 text-right text-sm font-semibold">
                {formatMoney(sub.amount, sub.currency)}
              </span>
              <span className="flex-1 text-center">
                <button
                  type="button"
                  onClick={() => handleToggleActive(sub.id)}
                  disabled={isPending}
                  title={sub.isActive ? "Pausar suscripción" : "Reactivar suscripción"}
                  className={
                    sub.isActive
                      ? "rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success disabled:opacity-50"
                      : "rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-strong disabled:opacity-50"
                  }
                >
                  {sub.isActive ? "Activa" : "Inactiva"}
                </button>
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

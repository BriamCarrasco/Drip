"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ChevronDownIcon, XIcon } from "@/components/icons";
import { categorySuggestions } from "@/lib/categories";
import type { SubscriptionRow } from "@/lib/subscriptions";
import type { BillingCycle } from "@/drizzle/schema";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";
import {
  createSubscriptionAction,
  deleteSubscriptionAction,
  updateSubscriptionAction,
  type SubscriptionInput,
} from "@/app/(dashboard)/suscripciones/actions";

const cycles: { value: BillingCycle; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
  { value: "custom_days", label: "Personalizado" },
];

const CUSTOM_CATEGORY = "__custom__";

export function SubscriptionFormModal() {
  const { modal, closeModal } = useSubscriptionModal();

  if (modal.mode === "closed") return null;

  const isEdit = modal.mode === "edit";
  const existing = isEdit ? modal.subscription : undefined;

  return <SubscriptionForm key={existing?.id ?? "new"} isEdit={isEdit} existing={existing} onCancel={closeModal} />;
}

function SubscriptionForm({
  isEdit,
  existing,
  onCancel,
}: {
  isEdit: boolean;
  existing?: SubscriptionRow;
  onCancel: () => void;
}) {
  const { closeModal } = useSubscriptionModal();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [currency, setCurrency] = useState<"CLP" | "USD">(
    (existing?.currency as "CLP" | "USD") ?? "CLP"
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    existing?.billingCycle ?? "monthly"
  );
  const [customIntervalDays, setCustomIntervalDays] = useState(
    existing?.customIntervalDays ? String(existing.customIntervalDays) : ""
  );
  const [nextBillingDate, setNextBillingDate] = useState(existing?.nextBillingDate ?? "");
  const existingIsCustomCategory = existing ? !categorySuggestions.includes(existing.category) : false;
  const [categorySelect, setCategorySelect] = useState(
    existingIsCustomCategory ? CUSTOM_CATEGORY : existing?.category ?? categorySuggestions[0]
  );
  const [customCategory, setCustomCategory] = useState(existingIsCustomCategory ? existing!.category : "");
  const category = categorySelect === CUSTOM_CATEGORY ? customCategory : categorySelect;
  const [notificationDaysBefore, setNotificationDaysBefore] = useState(
    existing ? String(existing.notificationDaysBefore) : "3"
  );
  const [appriseUrl, setAppriseUrl] = useState(existing?.appriseUrl ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const input: SubscriptionInput = {
      name,
      description: description || undefined,
      amount: Number(amount) || 0,
      currency,
      billingCycle,
      customIntervalDays:
        billingCycle === "custom_days" ? Number(customIntervalDays) || undefined : undefined,
      nextBillingDate,
      category,
      notificationDaysBefore: Number(notificationDaysBefore) || 0,
      appriseUrl: appriseUrl || undefined,
      isActive: existing?.isActive ?? true,
    };

    startTransition(async () => {
      if (isEdit && existing) {
        await updateSubscriptionAction(existing.id, input);
      } else {
        await createSubscriptionAction(input);
      }
      closeModal();
    });
  }

  function handleDelete() {
    if (!existing) return;
    startTransition(async () => {
      await deleteSubscriptionAction(existing.id);
      closeModal();
    });
  }

  const inputClass =
    "rounded-[10px] border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none focus:border-accent";
  const labelClass = "text-[13px] font-semibold text-label";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F18]/50 px-4"
      onClick={onCancel}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-[20px] bg-surface p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[19px] font-semibold">
            {isEdit ? "Editar suscripción" : "Nueva suscripción"}
          </h2>
          <button type="button" onClick={onCancel} className="text-muted hover:text-foreground">
            <XIcon />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nombre</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Netflix"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>
            Descripción <span className="font-medium text-placeholder">(opcional)</span>
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plan familiar compartido"
            className={inputClass}
          />
        </label>

        <div className="flex gap-3.5">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Monto</span>
            <input
              required
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </label>
          <label className="flex w-[110px] flex-col gap-1.5">
            <span className={labelClass}>Moneda</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "CLP" | "USD")}
              className={inputClass}
            >
              <option value="CLP">CLP</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Ciclo de facturación</span>
          <div className="flex gap-0.5 rounded-[10px] bg-surface-muted p-1">
            {cycles.map((cycle) => (
              <button
                key={cycle.value}
                type="button"
                onClick={() => setBillingCycle(cycle.value)}
                className={
                  billingCycle === cycle.value
                    ? "flex-1 rounded-lg bg-accent py-2 text-[13px] font-semibold text-white"
                    : "flex-1 rounded-lg py-2 text-[13px] font-medium text-muted-strong"
                }
              >
                {cycle.label}
              </button>
            ))}
          </div>
        </div>

        {billingCycle === "custom_days" && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Cada cuántos días</span>
            <input
              required
              type="number"
              min="1"
              value={customIntervalDays}
              onChange={(e) => setCustomIntervalDays(e.target.value)}
              placeholder="Ej. 45"
              className={inputClass}
            />
          </label>
        )}

        <div className="flex gap-3.5">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Próximo cobro</span>
            <input
              required
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Categoría</span>
            <div className="relative">
              <select
                value={categorySelect}
                onChange={(e) => setCategorySelect(e.target.value)}
                className={`${inputClass} w-full appearance-none pr-9`}
              >
                {categorySuggestions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY}>Otra...</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            {categorySelect === CUSTOM_CATEGORY && (
              <input
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Escribe una categoría"
                className={`${inputClass} mt-1.5`}
              />
            )}
          </div>
        </div>

        <div className="flex gap-3.5">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Avisar antes del cobro</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={notificationDaysBefore}
                onChange={(e) => setNotificationDaysBefore(e.target.value)}
                className={`${inputClass} w-20`}
              />
              <span className="text-sm text-muted">días antes</span>
            </div>
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>
              URL de notificación <span className="font-medium text-placeholder">(opcional)</span>
            </span>
            <input
              value={appriseUrl}
              onChange={(e) => setAppriseUrl(e.target.value)}
              placeholder="Usar canal por defecto"
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-[13.5px] font-semibold text-danger disabled:opacity-50"
            >
              Eliminar suscripción
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4.5 py-2.5 text-sm font-semibold text-muted-strong"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isEdit ? "Guardar cambios" : "Crear suscripción"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

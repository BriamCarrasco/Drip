"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { ChevronDownIcon, XIcon } from "@/components/icons";
import { categorySuggestions } from "@/lib/categories";
import { knownServices, type KnownService } from "@/lib/known-services";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import { formatDate, formatMoney } from "@/lib/format";
import { estimateTotalSpent } from "@/lib/subscription-calculations";
import type { SubscriptionRow } from "@/lib/subscriptions";
import type { PriceHistoryEntry } from "@/lib/price-history";
import type { StatusHistoryEntry } from "@/lib/status-history";
import type { BillingCycle } from "@/drizzle/schema";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";
import {
  createSubscriptionAction,
  deleteSubscriptionAction,
  updateSubscriptionAction,
  getSubscriptionHistoryAction,
  type SubscriptionInput,
} from "@/app/(dashboard)/suscripciones/actions";

const cycles: { value: BillingCycle; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
  { value: "custom_days", label: "Personalizado" },
];

const CUSTOM_CATEGORY = "__custom__";

const CLOSE_ANIMATION_MS = 180;

export function SubscriptionFormModal() {
  const { modal, closeModal, defaultCurrency } = useSubscriptionModal();
  // conserva el contenido del modal mientras se anima el cierre, ya que el
  // contexto ya reseteó `modal` a "closed" para ese momento
  const [prevModal, setPrevModal] = useState(modal);
  const [cachedModal, setCachedModal] = useState(modal);
  if (modal !== prevModal) {
    setPrevModal(modal);
    if (modal.mode !== "closed") setCachedModal(modal);
  }

  const [shouldRender, setShouldRender] = useState(modal.mode !== "closed");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (modal.mode !== "closed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setVisible(false);
    const timeout = setTimeout(() => setShouldRender(false), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [modal]);

  if (!shouldRender) return null;

  const isEdit = cachedModal.mode === "edit";
  const existing = isEdit ? cachedModal.subscription : undefined;

  return (
    <SubscriptionForm
      key={existing?.id ?? "new"}
      isEdit={isEdit}
      existing={existing}
      defaultCurrency={defaultCurrency}
      onCancel={closeModal}
      visible={visible}
    />
  );
}

function SubscriptionForm({
  isEdit,
  existing,
  defaultCurrency,
  onCancel,
  visible,
}: {
  isEdit: boolean;
  existing?: SubscriptionRow;
  defaultCurrency: string;
  onCancel: () => void;
  visible: boolean;
}) {
  const { closeModal } = useSubscriptionModal();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [currency, setCurrency] = useState<"CLP" | "USD">(
    (existing?.currency as "CLP" | "USD") ?? (defaultCurrency as "CLP" | "USD") ?? "CLP"
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
  const [logoUrl, setLogoUrl] = useState(existing?.logoUrl ?? "");
  const [isTrial, setIsTrial] = useState(existing?.isTrial ?? false);
  const [splitCount, setSplitCount] = useState(existing ? String(existing.splitCount) : "1");
  const [priceHistoryEntries, setPriceHistoryEntries] = useState<PriceHistoryEntry[]>([]);
  const [statusHistoryEntries, setStatusHistoryEntries] = useState<StatusHistoryEntry[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && existing) {
      getSubscriptionHistoryAction(existing.id).then(({ prices, statuses }) => {
        setPriceHistoryEntries(prices);
        setStatusHistoryEntries(statuses);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing?.id]);

  function applyKnownService(service: KnownService) {
    setName(service.name);
    setLogoUrl(service.logoUrl);
    if (categorySuggestions.includes(service.category)) {
      setCategorySelect(service.category);
      setCustomCategory("");
    } else {
      setCategorySelect(CUSTOM_CATEGORY);
      setCustomCategory(service.category);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const input: SubscriptionInput = {
      name,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
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
      isTrial,
      splitCount: Number(splitCount) || 1,
    };

    startTransition(async () => {
      try {
        if (isEdit && existing) {
          await updateSubscriptionAction(existing.id, input);
        } else {
          await createSubscriptionAction(input);
        }
        closeModal();
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo guardar la suscripción.");
      }
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
  const totalSpent = estimateTotalSpent(
    {
      billingCycle,
      customIntervalDays: Number(customIntervalDays) || null,
      nextBillingDate,
      splitCount: Number(splitCount) || 1,
    },
    priceHistoryEntries,
    statusHistoryEntries
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#231F18]/50 px-4 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onCancel}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className={`flex max-h-[90vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-[20px] bg-surface p-5 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none sm:p-7 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[19px] font-semibold">
            {isEdit ? "Editar suscripción" : "Nueva suscripción"}
          </h2>
          <button type="button" onClick={onCancel} className="text-muted hover:text-foreground">
            <XIcon />
          </button>
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Servicios conocidos <span className="font-medium text-placeholder">(opcional)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {knownServices.map((service) => (
                <button
                  key={service.name}
                  type="button"
                  onClick={() => applyKnownService(service)}
                  className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-strong hover:border-accent hover:text-foreground"
                >
                  <SubscriptionAvatar
                    name={service.name}
                    logoUrl={service.logoUrl}
                    size={16}
                    rounded="rounded-[4px]"
                    className="text-[7px]"
                  />
                  {service.name}
                </button>
              ))}
            </div>
          </div>
        )}

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

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>
            URL de logo <span className="font-medium text-placeholder">(opcional)</span>
          </span>
          <div className="flex items-center gap-3">
            <SubscriptionAvatar name={name || "?"} logoUrl={logoUrl} size={38} />
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className={`${inputClass} flex-1`}
            />
          </div>
        </label>

        <div className="flex flex-col gap-3.5 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Monto</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </label>
          <label className="flex w-full flex-col gap-1.5 sm:w-[110px]">
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
          <label className="flex w-full flex-col gap-1.5 sm:w-[110px]">
            <span className={labelClass}>Compartida entre</span>
            <input
              type="number"
              min="1"
              max="20"
              value={splitCount}
              onChange={(e) => setSplitCount(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {Number(splitCount) > 1 && Number(amount) > 0 && (
          <p className="-mt-2.5 text-[12.5px] text-muted">
            Tu parte: {formatMoney(Number(amount) / Number(splitCount), currency)} de{" "}
            {formatMoney(Number(amount), currency)} entre {splitCount} personas.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Ciclo de facturación</span>
          <div className="flex flex-wrap gap-1 rounded-[10px] bg-surface-muted p-1">
            {cycles.map((cycle) => (
              <button
                key={cycle.value}
                type="button"
                onClick={() => setBillingCycle(cycle.value)}
                className={
                  billingCycle === cycle.value
                    ? "min-w-[70px] flex-1 rounded-lg bg-accent py-2 text-[13px] font-semibold text-white"
                    : "min-w-[70px] flex-1 rounded-lg py-2 text-[13px] font-medium text-muted-strong"
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

        <label className="flex items-center gap-2.5 text-[13px] font-medium text-label">
          <input
            type="checkbox"
            checked={isTrial}
            onChange={(e) => setIsTrial(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Es una prueba gratuita
        </label>

        <div className="flex flex-col gap-3.5 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>
              {isTrial ? "Termina la prueba el" : "Próximo cobro"}
            </span>
            <input
              required
              type="date"
              min="1970-01-01"
              max="9999-12-31"
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

        <div className="flex flex-col gap-3.5 sm:flex-row">
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

        {isEdit && priceHistoryEntries.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4">
            {totalSpent > 0 && (
              <div className="flex items-center justify-between rounded-[10px] bg-surface-muted p-3.5">
                <div>
                  <span className="text-[13px] font-medium text-label">Total pagado</span>
                  <p className="text-[11.5px] text-muted">Cobros completos desde que la registraste en la app</p>
                </div>
                <span className="font-heading text-[17px] font-semibold">
                  {formatMoney(totalSpent, currency)}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Historial de precios</span>
              <div className="flex flex-col gap-1">
                {priceHistoryEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[13px] text-muted"
                  >
                    <span>{formatDate(entry.changedAt.slice(0, 10))}</span>
                    <span className="font-medium text-foreground">
                      {formatMoney(entry.amount, entry.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {formError && (
          <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{formError}</p>
        )}

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

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SubscriptionAvatar } from "@/components/dashboard/SubscriptionAvatar";
import { CheckIcon } from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";
import { advanceDate } from "@/lib/calendar";
import type { SubscriptionRow } from "@/lib/subscriptions";
import { markAsPaidAction } from "@/app/(dashboard)/suscripciones/actions";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";

const CLOSE_ANIMATION_MS = 180;

export function MarkAsPaidModal({
  subscription,
  closing,
  onCancel,
  onClosed,
}: {
  subscription: SubscriptionRow;
  closing: boolean;
  onCancel: () => void;
  onClosed: () => void;
}) {
  const { openEditModal } = useSubscriptionModal();
  const [visible, setVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!closing) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const timeout = setTimeout(onClosed, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [closing, onClosed]);

  function handleConfirm() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    startTransition(() => {
      markAsPaidAction(subscription.id);
    });
    setConfirmed(true);
    setTimeout(onCancel, 700);
  }

  function handleEditFull() {
    openEditModal(subscription);
    onCancel();
  }

  const nextDate = advanceDate(
    new Date(`${subscription.nextBillingDate}T00:00:00`),
    subscription.billingCycle,
    subscription.customIntervalDays
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#231F18]/50 px-4 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-[400px] flex-col gap-5 rounded-[20px] bg-surface p-6 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <SubscriptionAvatar
            name={subscription.name}
            logoUrl={subscription.logoUrl}
            size={40}
            rounded="rounded-[12px]"
          />
          <div>
            <p className="font-heading text-[17px] font-semibold">{subscription.name}</p>
            <p className="text-[13px] text-muted">{subscription.category}</p>
          </div>
        </div>

        {confirmed ? (
          <div className="flex items-center justify-center gap-2 rounded-[12px] bg-success-tint py-5 text-success">
            <CheckIcon />
            <span className="text-sm font-semibold">Marcada como pagada</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 rounded-[12px] bg-surface-muted p-4">
              <p className="text-[13px] text-muted">
                {subscription.isTrial ? "Se cobrará al terminar la prueba" : "Monto a registrar"}
              </p>
              <p className="font-heading text-[22px] font-semibold">
                {formatMoney(subscription.amount, subscription.currency)}
              </p>
            </div>

            <p className="text-[13px] text-muted">
              {subscription.isTrial
                ? `Se marca el fin de la prueba gratuita y el próximo cobro pasa al ${formatDate(nextDate.toISOString().slice(0, 10))}.`
                : `El próximo cobro pasa al ${formatDate(nextDate.toISOString().slice(0, 10))}.`}
            </p>

            <button
              type="button"
              onClick={handleEditFull}
              className="self-start text-[13px] font-semibold text-accent hover:underline"
            >
              Ver detalles
            </button>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-[10px] px-4 py-2.5 text-sm font-semibold text-muted-strong hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Marcar como pagada
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

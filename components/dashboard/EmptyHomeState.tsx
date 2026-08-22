"use client";

import { PlusIcon, WalletIcon } from "@/components/icons";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";

export function EmptyHomeState() {
  const { openCreateModal } = useSubscriptionModal();

  return (
    <div className="flex flex-col items-center gap-4.5 text-center">
      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-[#F3D9BD] bg-accent-tint text-accent">
        <WalletIcon size={34} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">Sin suscripciones por ahora</h2>
        <p className="text-[13.5px] text-muted">Agrega la primera cuando quieras.</p>
      </div>
      <button
        onClick={openCreateModal}
        className="mt-1 flex items-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90"
      >
        <PlusIcon size={15} />
        Registrar suscripción
      </button>
    </div>
  );
}

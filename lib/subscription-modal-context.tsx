"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { SubscriptionRow } from "@/lib/subscriptions";

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; subscription: SubscriptionRow };

type SubscriptionModalContextValue = {
  modal: ModalState;
  defaultCurrency: string;
  openCreateModal: () => void;
  openEditModal: (subscription: SubscriptionRow) => void;
  closeModal: () => void;
};

const SubscriptionModalContext = createContext<SubscriptionModalContextValue | null>(null);

export function SubscriptionModalProvider({
  children,
  defaultCurrency,
}: {
  children: React.ReactNode;
  defaultCurrency: string;
}) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const value = useMemo<SubscriptionModalContextValue>(
    () => ({
      modal,
      defaultCurrency,
      openCreateModal: () => setModal({ mode: "create" }),
      openEditModal: (subscription) => setModal({ mode: "edit", subscription }),
      closeModal: () => setModal({ mode: "closed" }),
    }),
    [modal, defaultCurrency]
  );

  return (
    <SubscriptionModalContext.Provider value={value}>{children}</SubscriptionModalContext.Provider>
  );
}

export function useSubscriptionModal() {
  const ctx = useContext(SubscriptionModalContext);
  if (!ctx) {
    throw new Error("useSubscriptionModal must be used within SubscriptionModalProvider");
  }
  return ctx;
}

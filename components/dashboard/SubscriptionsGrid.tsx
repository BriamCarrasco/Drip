"use client";

import { useState } from "react";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { MarkAsPaidModal } from "@/components/dashboard/MarkAsPaidModal";
import type { SubscriptionRow } from "@/lib/subscriptions";

export function SubscriptionsGrid({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const [selected, setSelected] = useState<SubscriptionRow | null>(null);
  const [closing, setClosing] = useState(false);

  function openModal(sub: SubscriptionRow) {
    setSelected(sub);
    setClosing(false);
  }

  function requestClose() {
    setClosing(true);
  }

  function handleClosed() {
    setSelected(null);
    setClosing(false);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {subscriptions.map((sub, index) => (
          <div
            key={sub.id}
            className="animate-card-in"
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
          >
            <button
              type="button"
              onClick={() => openModal(sub)}
              className="w-full rounded-2xl text-left transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <SubscriptionCard subscription={sub} />
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <MarkAsPaidModal
          subscription={selected}
          closing={closing}
          onCancel={requestClose}
          onClosed={handleClosed}
        />
      )}
    </>
  );
}

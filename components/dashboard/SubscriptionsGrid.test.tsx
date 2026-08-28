import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionsGrid } from "./SubscriptionsGrid";
import { SubscriptionModalProvider } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";

vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  markAsPaidAction: vi.fn(),
}));

describe("SubscriptionsGrid", () => {
  it("renders a card for each subscription", () => {
    render(
      <SubscriptionModalProvider defaultCurrency="CLP">
        <SubscriptionsGrid
          subscriptions={[
            makeSubscription({ id: 1, name: "Netflix" }),
            makeSubscription({ id: 2, name: "Spotify" }),
          ]}
        />
      </SubscriptionModalProvider>
    );

    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
  });

  it("opens the mark-as-paid modal when a card is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SubscriptionModalProvider defaultCurrency="CLP">
        <SubscriptionsGrid subscriptions={[makeSubscription({ id: 1, name: "Netflix" })]} />
      </SubscriptionModalProvider>
    );

    expect(screen.queryByRole("button", { name: "Marcar como pagada" })).not.toBeInTheDocument();
    await user.click(screen.getByText("Netflix"));
    expect(screen.getByRole("button", { name: "Marcar como pagada" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RenewalsCalendar, type PaidOccurrence } from "./RenewalsCalendar";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";
import type { SubscriptionRow } from "@/lib/subscriptions";

function Probe() {
  const { modal } = useSubscriptionModal();
  return <span data-testid="mode">{modal.mode === "edit" ? modal.subscription.name : modal.mode}</span>;
}

function monthLabelFor(date: Date): string {
  const raw = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function renderCalendar(subscriptions: SubscriptionRow[] = [], payments: PaidOccurrence[] = []) {
  return render(
    <SubscriptionModalProvider defaultCurrency="CLP">
      <RenewalsCalendar subscriptions={subscriptions} payments={payments} />
      <Probe />
    </SubscriptionModalProvider>
  );
}

describe("RenewalsCalendar", () => {
  it("shows the current month by default", () => {
    renderCalendar();
    expect(screen.getByText(monthLabelFor(new Date()))).toBeInTheDocument();
  });

  it("navigates to the next and previous month", async () => {
    const user = userEvent.setup();
    renderCalendar();

    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText(monthLabelFor(next))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText(monthLabelFor(today))).toBeInTheDocument();
  });

  it("shows an upcoming subscription on its billing day and opens the edit modal on click", async () => {
    const user = userEvent.setup();
    const today = isoDate(new Date());
    const sub = makeSubscription({ id: 1, name: "Netflix", billingCycle: "monthly", nextBillingDate: today });
    renderCalendar([sub]);

    const entry = screen.getByRole("button", { name: /Netflix/ });
    await user.click(entry);

    expect(screen.getByTestId("mode")).toHaveTextContent("Netflix");
  });

  it("shows a paid occurrence as non-interactive", () => {
    const today = isoDate(new Date());
    const payment: PaidOccurrence = {
      subscriptionId: 1,
      name: "Spotify",
      logoUrl: null,
      amount: 5990,
      currency: "CLP",
      date: today,
    };
    renderCalendar([], [payment]);

    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Spotify/ })).not.toBeInTheDocument();
  });

  it("shows an overflow indicator when a day has more than 3 items", () => {
    const today = isoDate(new Date());
    const subs = [1, 2, 3, 4].map((id) =>
      makeSubscription({ id, name: `Sub${id}`, billingCycle: "monthly", nextBillingDate: today })
    );
    renderCalendar(subs);

    expect(screen.getByText("+1 más")).toBeInTheDocument();
  });
});

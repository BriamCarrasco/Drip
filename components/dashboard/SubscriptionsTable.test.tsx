import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionsTable } from "./SubscriptionsTable";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";

vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  deleteSubscriptionAction: vi.fn(),
  markAsPaidAction: vi.fn(),
  toggleSubscriptionActiveAction: vi.fn(),
}));

import {
  deleteSubscriptionAction,
  markAsPaidAction,
  toggleSubscriptionActiveAction,
} from "@/app/(dashboard)/suscripciones/actions";

const deleteMock = vi.mocked(deleteSubscriptionAction);
const markAsPaidMock = vi.mocked(markAsPaidAction);
const toggleMock = vi.mocked(toggleSubscriptionActiveAction);

function Probe() {
  const { modal } = useSubscriptionModal();
  return <span data-testid="mode">{modal.mode === "edit" ? modal.subscription.name : modal.mode}</span>;
}

function renderTable(subscriptions: ReturnType<typeof makeSubscription>[]) {
  return render(
    <SubscriptionModalProvider defaultCurrency="CLP">
      <SubscriptionsTable subscriptions={subscriptions} />
      <Probe />
    </SubscriptionModalProvider>
  );
}

const netflix = makeSubscription({
  id: 1,
  name: "Netflix",
  category: "Streaming",
  amount: 9990,
  nextBillingDate: "2026-09-05",
});
const spotify = makeSubscription({
  id: 2,
  name: "Spotify",
  category: "Música",
  amount: 5990,
  nextBillingDate: "2026-09-10",
});

describe("SubscriptionsTable", () => {
  it("renders each subscription once per layout (desktop + mobile)", () => {
    renderTable([netflix, spotify]);
    expect(screen.getAllByText("Netflix")).toHaveLength(2);
    expect(screen.getAllByText("Spotify")).toHaveLength(2);
  });

  it("shows an empty message when no subscription matches the filter", async () => {
    const user = userEvent.setup();
    renderTable([netflix]);
    await user.type(screen.getByPlaceholderText("Buscar suscripción..."), "nothing-matches");
    expect(screen.getByText("No hay suscripciones que coincidan con el filtro.")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    const user = userEvent.setup();
    renderTable([netflix, spotify]);
    await user.type(screen.getByPlaceholderText("Buscar suscripción..."), "spot");
    expect(screen.queryAllByText("Netflix")).toHaveLength(0);
    expect(screen.getAllByText("Spotify")).toHaveLength(2);
  });

  it("filters by category chip", async () => {
    const user = userEvent.setup();
    renderTable([netflix, spotify]);
    await user.click(screen.getByRole("button", { name: "Streaming" }));
    expect(screen.getAllByText("Netflix")).toHaveLength(2);
    expect(screen.queryAllByText("Spotify")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getAllByText("Spotify")).toHaveLength(2);
  });

  it("calls deleteSubscriptionAction when a delete button is clicked", async () => {
    const user = userEvent.setup();
    renderTable([netflix]);
    await user.click(screen.getAllByRole("button", { name: "Eliminar Netflix" })[0]);
    expect(deleteMock).toHaveBeenCalledWith(1);
  });

  it("calls toggleSubscriptionActiveAction when the status pill is clicked", async () => {
    const user = userEvent.setup();
    renderTable([netflix]);
    await user.click(screen.getAllByRole("button", { name: "Activa" })[0]);
    expect(toggleMock).toHaveBeenCalledWith(1);
  });

  it("opens the edit modal when the edit button is clicked", async () => {
    const user = userEvent.setup();
    renderTable([netflix]);
    await user.click(screen.getAllByRole("button", { name: "Editar Netflix" })[0]);
    expect(screen.getByTestId("mode")).toHaveTextContent("Netflix");
  });

  it("guards against double-clicking mark-as-paid for the same subscription", async () => {
    const user = userEvent.setup();
    renderTable([netflix]);
    const button = screen.getAllByRole("button", { name: "Marcar Netflix como pagada" })[0];
    await user.click(button);
    await user.click(button);
    expect(markAsPaidMock).toHaveBeenCalledTimes(1);
  });
});

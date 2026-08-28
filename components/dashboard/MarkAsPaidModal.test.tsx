import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarkAsPaidModal } from "./MarkAsPaidModal";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";

vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  markAsPaidAction: vi.fn(),
}));

import { markAsPaidAction } from "@/app/(dashboard)/suscripciones/actions";

const markAsPaidMock = vi.mocked(markAsPaidAction);

function Probe() {
  const { modal } = useSubscriptionModal();
  return <span data-testid="mode">{modal.mode}</span>;
}

function renderModal(props: Partial<Parameters<typeof MarkAsPaidModal>[0]> = {}) {
  const onCancel = vi.fn();
  const onClosed = vi.fn();
  const subscription = makeSubscription();
  render(
    <SubscriptionModalProvider defaultCurrency="CLP">
      <MarkAsPaidModal
        subscription={subscription}
        closing={false}
        onCancel={onCancel}
        onClosed={onClosed}
        {...props}
      />
      <Probe />
    </SubscriptionModalProvider>
  );
  return { onCancel, onClosed, subscription };
}

describe("MarkAsPaidModal", () => {
  it("renders the subscription name, category and amount", () => {
    renderModal();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("$9.990")).toBeInTheDocument();
  });

  it("shows trial-specific copy when the subscription is a trial", () => {
    renderModal({ subscription: makeSubscription({ isTrial: true }) });
    expect(screen.getByText("Se cobrará al terminar la prueba")).toBeInTheDocument();
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("opens the edit modal and closes on 'Ver detalles'", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();

    await user.click(screen.getByRole("button", { name: "Ver detalles" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("edit");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("confirms only once even if clicked twice quickly, and shows the success state", async () => {
    const user = userEvent.setup();
    renderModal();

    const confirmButton = screen.getByRole("button", { name: "Marcar como pagada" });
    await user.click(confirmButton);
    expect(screen.getByText("Marcada como pagada")).toBeInTheDocument();

    await user.click(confirmButton).catch(() => {});
    expect(markAsPaidMock).toHaveBeenCalledTimes(1);
  });

  it("automatically cancels shortly after confirming", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();

    await user.click(screen.getByRole("button", { name: "Marcar como pagada" }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});

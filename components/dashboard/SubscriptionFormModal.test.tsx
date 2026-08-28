import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionFormModal } from "./SubscriptionFormModal";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";
import type { SubscriptionRow } from "@/lib/subscriptions";

vi.mock("@/app/(dashboard)/suscripciones/actions", () => ({
  createSubscriptionAction: vi.fn(),
  updateSubscriptionAction: vi.fn(),
  deleteSubscriptionAction: vi.fn(),
  getSubscriptionHistoryAction: vi.fn(),
}));

import {
  createSubscriptionAction,
  deleteSubscriptionAction,
  getSubscriptionHistoryAction,
  updateSubscriptionAction,
} from "@/app/(dashboard)/suscripciones/actions";

const createMock = vi.mocked(createSubscriptionAction);
const updateMock = vi.mocked(updateSubscriptionAction);
const deleteMock = vi.mocked(deleteSubscriptionAction);
const historyMock = vi.mocked(getSubscriptionHistoryAction);

function Opener({ subscription }: { subscription?: SubscriptionRow }) {
  const { openCreateModal, openEditModal } = useSubscriptionModal();
  useEffect(() => {
    if (subscription) openEditModal(subscription);
    else openCreateModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderModal(subscription?: SubscriptionRow) {
  return render(
    <SubscriptionModalProvider defaultCurrency="CLP">
      <Opener subscription={subscription} />
      <SubscriptionFormModal />
    </SubscriptionModalProvider>
  );
}

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  historyMock.mockReset();
  historyMock.mockResolvedValue({ prices: [], statuses: [], payments: [] });
});

describe("SubscriptionFormModal", () => {
  it("renders nothing when the modal is closed", () => {
    render(
      <SubscriptionModalProvider defaultCurrency="CLP">
        <SubscriptionFormModal />
      </SubscriptionModalProvider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva suscripción")).not.toBeInTheDocument();
  });

  it("shows the create title in create mode", () => {
    renderModal();
    expect(screen.getByText("Nueva suscripción")).toBeInTheDocument();
  });

  it("shows the edit title and pre-fills fields in edit mode", () => {
    renderModal(makeSubscription({ name: "Netflix", amount: 9990 }));
    expect(screen.getByText("Editar suscripción")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Netflix")).toBeInTheDocument();
  });

  it("applies a known service's name, logo and category", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /Notion/ }));
    expect(screen.getByDisplayValue("Notion")).toBeInTheDocument();
  });

  it("shows the custom-days field only for a custom billing cycle", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.queryByLabelText("Cada cuántos días")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Personalizado" }));
    expect(screen.getByPlaceholderText("Ej. 45")).toBeInTheDocument();
  });

  it("shows the custom category field when 'Otra...' is selected", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByDisplayValue(/Streaming|Productividad/), "__custom__");
    expect(screen.getByPlaceholderText("Escribe una categoría")).toBeInTheDocument();
  });

  it("shows a split-cost preview once splitCount and amount are set", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText("Ej. Netflix"), "Netflix");
    await user.type(screen.getByPlaceholderText("0"), "10000");
    const splitInput = screen.getByDisplayValue("1");
    await user.clear(splitInput);
    await user.type(splitInput, "2");
    expect(await screen.findByText(/Tu parte: \$5.000/)).toBeInTheDocument();
  });

  it("submits a new subscription and closes on success", async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue(undefined);
    renderModal();

    await user.type(screen.getByPlaceholderText("Ej. Netflix"), "Netflix");
    await user.type(screen.getByPlaceholderText("0"), "9990");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-09-05");
    await user.click(screen.getByRole("button", { name: "Crear suscripción" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Netflix", amount: 9990, nextBillingDate: "2026-09-05" })
    );
    await waitFor(() => expect(screen.queryByText("Nueva suscripción")).not.toBeInTheDocument());
  });

  it("shows an error message when saving fails", async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new Error("La fecha ingresada no es válida."));
    renderModal();

    await user.type(screen.getByPlaceholderText("Ej. Netflix"), "Netflix");
    await user.type(screen.getByPlaceholderText("0"), "9990");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-09-05");
    await user.click(screen.getByRole("button", { name: "Crear suscripción" }));

    expect(await screen.findByText("La fecha ingresada no es válida.")).toBeInTheDocument();
  });

  it("submits an update for an existing subscription", async () => {
    const user = userEvent.setup();
    updateMock.mockResolvedValue(undefined);
    const existing = makeSubscription({ id: 7, name: "Netflix" });
    renderModal(existing);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(7, expect.objectContaining({ name: "Netflix" })));
  });

  it("deletes the subscription and closes when 'Eliminar suscripción' is confirmed", async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue(undefined);
    const existing = makeSubscription({ id: 7 });
    renderModal(existing);

    await user.click(screen.getByRole("button", { name: "Eliminar suscripción" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
  });

  it("loads and displays price history and total paid in edit mode", async () => {
    historyMock.mockResolvedValue({
      prices: [{ amount: 9990, currency: "CLP", changedAt: "2026-08-01T00:00:00.000Z" }],
      statuses: [],
      payments: [{ amount: 9990, currency: "CLP", paidAt: "2026-08-01T00:00:00.000Z" }],
    });
    renderModal(makeSubscription({ id: 7 }));

    expect(await screen.findByText("Total pagado")).toBeInTheDocument();
    const list = screen.getByText("Historial de precios").parentElement as HTMLElement;
    expect(within(list).getByText("$9.990")).toBeInTheDocument();
  });

  it("cancels and closes without saving", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText("Nueva suscripción")).not.toBeInTheDocument());
    expect(createMock).not.toHaveBeenCalled();
  });
});

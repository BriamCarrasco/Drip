import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

function Probe() {
  const { modal } = useSubscriptionModal();
  return <span data-testid="mode">{modal.mode}</span>;
}

function renderTopBar(username = "alice") {
  return render(
    <SubscriptionModalProvider defaultCurrency="CLP">
      <TopBar username={username} />
      <Probe />
    </SubscriptionModalProvider>
  );
}

describe("TopBar", () => {
  it("shows the 'nueva suscripción' button outside of configuración", () => {
    usePathnameMock.mockReturnValue("/");
    renderTopBar();
    expect(screen.getByRole("button", { name: /Nueva suscripción/ })).toBeInTheDocument();
  });

  it("shows the user's initials instead of the button on configuración", () => {
    usePathnameMock.mockReturnValue("/configuracion");
    renderTopBar("alice");
    expect(screen.queryByRole("button", { name: /Nueva suscripción/ })).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("opens the create modal when the new-subscription button is clicked", async () => {
    usePathnameMock.mockReturnValue("/");
    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: /Nueva suscripción/ }));

    expect(screen.getByTestId("mode")).toHaveTextContent("create");
  });

  it("renders a link for every nav item", () => {
    usePathnameMock.mockReturnValue("/");
    renderTopBar();

    for (const label of ["Inicio", "Suscripciones", "Calendario", "Estadísticas", "Configuración"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});

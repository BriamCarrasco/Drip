import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmptyHomeState } from "./EmptyHomeState";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";

function Probe() {
  const { modal } = useSubscriptionModal();
  return <span data-testid="mode">{modal.mode}</span>;
}

describe("EmptyHomeState", () => {
  it("renders the empty-state copy", () => {
    render(
      <SubscriptionModalProvider defaultCurrency="CLP">
        <EmptyHomeState />
      </SubscriptionModalProvider>
    );
    expect(screen.getByText("Sin suscripciones por ahora")).toBeInTheDocument();
  });

  it("opens the create modal when the button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SubscriptionModalProvider defaultCurrency="CLP">
        <EmptyHomeState />
        <Probe />
      </SubscriptionModalProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("closed");
    await user.click(screen.getByRole("button", { name: /Registrar suscripción/ }));
    expect(screen.getByTestId("mode")).toHaveTextContent("create");
  });
});

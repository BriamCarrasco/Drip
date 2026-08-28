import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionCard } from "./SubscriptionCard";
import { makeSubscription } from "@/lib/test-helpers";

describe("SubscriptionCard", () => {
  it("renders the name, category, amount and next billing date", () => {
    render(<SubscriptionCard subscription={makeSubscription({ name: "Netflix", category: "Streaming" })} />);
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("$9.990")).toBeInTheDocument();
  });

  it("shows a trial badge only when isTrial is true", () => {
    const { rerender } = render(<SubscriptionCard subscription={makeSubscription({ isTrial: false })} />);
    expect(screen.queryByText("Prueba")).not.toBeInTheDocument();

    rerender(<SubscriptionCard subscription={makeSubscription({ isTrial: true })} />);
    expect(screen.getByText("Prueba")).toBeInTheDocument();
    expect(screen.getByText(/Termina prueba/)).toBeInTheDocument();
  });

  it("appends a yearly suffix only for yearly billing", () => {
    const { rerender } = render(<SubscriptionCard subscription={makeSubscription({ billingCycle: "monthly" })} />);
    expect(screen.queryByText("/año")).not.toBeInTheDocument();

    rerender(<SubscriptionCard subscription={makeSubscription({ billingCycle: "yearly" })} />);
    expect(screen.getByText("/año")).toBeInTheDocument();
  });

  it("shows the split-cost line only when splitCount is greater than 1", () => {
    const { rerender } = render(<SubscriptionCard subscription={makeSubscription({ splitCount: 1 })} />);
    expect(screen.queryByText(/Tu parte/)).not.toBeInTheDocument();

    rerender(<SubscriptionCard subscription={makeSubscription({ splitCount: 2, amount: 10000 })} />);
    expect(screen.getByText(/Tu parte: \$5.000/)).toBeInTheDocument();
  });
});

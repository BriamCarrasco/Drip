import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("renders the value and label", () => {
    render(<StatTile icon={<span>icon</span>} value="$9.990" label="Gasto mensual" />);
    expect(screen.getByText("$9.990")).toBeInTheDocument();
    expect(screen.getByText("Gasto mensual")).toBeInTheDocument();
  });

  it("renders a secondary value only when provided", () => {
    const { rerender } = render(<StatTile icon={<span>icon</span>} value="$9.990" label="Gasto" />);
    expect(screen.queryByText("US$10,00")).not.toBeInTheDocument();

    rerender(<StatTile icon={<span>icon</span>} value="$9.990" secondaryValue="US$10,00" label="Gasto" />);
    expect(screen.getByText("US$10,00")).toBeInTheDocument();
  });
});

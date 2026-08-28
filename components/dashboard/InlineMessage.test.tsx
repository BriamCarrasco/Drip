import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InlineMessage } from "./InlineMessage";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InlineMessage", () => {
  it("renders the given text", () => {
    render(<InlineMessage text="Guardado" tone="success" pending={false} />);
    expect(screen.getByText("Guardado")).toBeInTheDocument();
  });

  it("auto-hides a success message after a few seconds", () => {
    render(<InlineMessage text="Guardado" tone="success" pending={false} />);
    expect(screen.getByText("Guardado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });

  it("does not auto-hide an error message", () => {
    render(<InlineMessage text="Algo falló" tone="error" pending={false} />);
    vi.advanceTimersByTime(10_000);
    expect(screen.getByText("Algo falló")).toBeInTheDocument();
  });

  it("shows the message again after a new pending cycle completes", () => {
    const { rerender } = render(<InlineMessage text="Guardado" tone="success" pending={false} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();

    rerender(<InlineMessage text="Guardado" tone="success" pending={true} />);
    rerender(<InlineMessage text="Guardado" tone="success" pending={false} />);

    expect(screen.getByText("Guardado")).toBeInTheDocument();
  });
});

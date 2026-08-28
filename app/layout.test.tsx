import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Sora: () => ({ variable: "--font-sora" }),
  Work_Sans: () => ({ variable: "--font-work-sans" }),
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders its children", () => {
    render(<RootLayout>{<div>page content</div>}</RootLayout>, { container: document.documentElement });
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

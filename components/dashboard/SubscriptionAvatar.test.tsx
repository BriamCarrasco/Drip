import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionAvatar } from "./SubscriptionAvatar";

describe("SubscriptionAvatar", () => {
  it("proxies an absolute logo url through /api/logo", () => {
    render(<SubscriptionAvatar name="Netflix" logoUrl="https://cdn.simpleicons.org/netflix/E50914" />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toContain("/api/logo?u=");
  });

  it("uses a relative logoUrl as-is", () => {
    render(<SubscriptionAvatar name="Netflix" logoUrl="/local/logo.png" />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toContain("/local/logo.png");
  });

  it("falls back to an initial avatar when there is no logoUrl", () => {
    render(<SubscriptionAvatar name="Netflix" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("falls back to an initial avatar when the image fails to load", () => {
    render(<SubscriptionAvatar name="Netflix" logoUrl="https://example.com/broken.png" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });
});

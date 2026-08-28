import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionModalProvider, useSubscriptionModal } from "@/lib/subscription-modal-context";
import { makeSubscription } from "@/lib/test-helpers";

function wrapper({ children }: { children: React.ReactNode }) {
  return <SubscriptionModalProvider defaultCurrency="CLP">{children}</SubscriptionModalProvider>;
}

describe("useSubscriptionModal", () => {
  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useSubscriptionModal())).toThrow(
      "useSubscriptionModal must be used within SubscriptionModalProvider"
    );
  });

  it("starts closed and exposes the default currency", () => {
    const { result } = renderHook(() => useSubscriptionModal(), { wrapper });
    expect(result.current.modal).toEqual({ mode: "closed" });
    expect(result.current.defaultCurrency).toBe("CLP");
  });

  it("opens the create modal", () => {
    const { result } = renderHook(() => useSubscriptionModal(), { wrapper });
    act(() => result.current.openCreateModal());
    expect(result.current.modal).toEqual({ mode: "create" });
  });

  it("opens the edit modal with the given subscription", () => {
    const { result } = renderHook(() => useSubscriptionModal(), { wrapper });
    const sub = makeSubscription();
    act(() => result.current.openEditModal(sub));
    expect(result.current.modal).toEqual({ mode: "edit", subscription: sub });
  });

  it("closes the modal", () => {
    const { result } = renderHook(() => useSubscriptionModal(), { wrapper });
    act(() => result.current.openCreateModal());
    act(() => result.current.closeModal());
    expect(result.current.modal).toEqual({ mode: "closed" });
  });
});

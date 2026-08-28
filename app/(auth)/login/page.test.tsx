import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

import { signIn } from "@/auth";
import { clearAttempts } from "@/lib/rate-limit";

const signInMock = vi.mocked(signIn);
let searchParamsValue = "";

beforeEach(() => {
  signInMock.mockReset();
  searchParamsValue = "";
  clearAttempts("alice");
});

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Inicia sesión")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nombre de usuario")).toBeInTheDocument();
  });

  it("pre-fills the username and shows a notice when redirected after a rename", () => {
    searchParamsValue = "renamed=alicia";
    render(<LoginPage />);
    expect(screen.getByDisplayValue("alicia")).toBeInTheDocument();
    expect(screen.getByText(/ahora es/)).toBeInTheDocument();
  });

  it("submits credentials and shows an error on failure", async () => {
    const user = userEvent.setup();
    const { AuthError } = await import("next-auth");
    signInMock.mockRejectedValue(new AuthError("bad credentials"));

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("Nombre de usuario"), "alice");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
  });
});

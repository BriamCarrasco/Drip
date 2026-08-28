import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthCard, AuthError, AuthField, AuthSubmitButton } from "./AuthCard";

describe("AuthCard", () => {
  it("renders title, subtitle, children and footer", () => {
    render(
      <AuthCard title="Iniciar sesión" subtitle="Bienvenido de nuevo" footer="footer text">
        <p>form here</p>
      </AuthCard>
    );
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument();
    expect(screen.getByText("form here")).toBeInTheDocument();
    expect(screen.getByText("footer text")).toBeInTheDocument();
  });
});

describe("AuthField", () => {
  it("renders a labeled input and forwards changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AuthField label="Usuario" name="username" placeholder="tu usuario" onChange={onChange} />);

    const input = screen.getByPlaceholderText("tu usuario");
    expect(input).toHaveAttribute("name", "username");
    await user.type(input, "alice");

    expect(onChange).toHaveBeenCalledWith("alice");
  });
});

describe("AuthError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<AuthError />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message when present", () => {
    render(<AuthError message="Usuario o contraseña incorrectos." />);
    expect(screen.getByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
  });
});

describe("AuthSubmitButton", () => {
  it("shows the children when not pending", () => {
    render(<AuthSubmitButton>Entrar</AuthSubmitButton>);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("shows a loading state and disables the button when pending", () => {
    render(<AuthSubmitButton pending>Entrar</AuthSubmitButton>);
    expect(screen.getByRole("button", { name: "Cargando..." })).toBeDisabled();
  });
});

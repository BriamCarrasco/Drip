import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CuentaTab } from "./CuentaTab";

vi.mock("@/app/(dashboard)/configuracion/actions", () => ({
  changePasswordAction: vi.fn(),
  changeUsernameAction: vi.fn(),
}));

import { changePasswordAction, changeUsernameAction } from "@/app/(dashboard)/configuracion/actions";

const changePasswordMock = vi.mocked(changePasswordAction);
const changeUsernameMock = vi.mocked(changeUsernameAction);

describe("CuentaTab", () => {
  it("shows the current username", () => {
    render(<CuentaTab username="alice" signOutAction={vi.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("calls signOutAction when the sign-out button is submitted", async () => {
    const user = userEvent.setup();
    const signOutAction = vi.fn().mockResolvedValue(undefined);
    render(<CuentaTab username="alice" signOutAction={signOutAction} />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(signOutAction).toHaveBeenCalled();
  });

  it("submits the change-password form and shows a success message", async () => {
    const user = userEvent.setup();
    changePasswordMock.mockResolvedValue({ success: true });
    render(<CuentaTab username="alice" signOutAction={vi.fn()} />);

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "current");
    await user.type(passwordInputs[1], "newpassword");
    await user.type(passwordInputs[2], "newpassword");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
  });

  it("submits the change-username form and shows an error message", async () => {
    const user = userEvent.setup();
    changeUsernameMock.mockResolvedValue({ error: "Ese nombre de usuario ya está en uso." });
    render(<CuentaTab username="alice" signOutAction={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("tu_usuario"), "bob");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[passwordInputs.length - 1], "current");
    await user.click(screen.getByRole("button", { name: "Cambiar usuario" }));

    expect(await screen.findByText("Ese nombre de usuario ya está en uso.")).toBeInTheDocument();
  });
});

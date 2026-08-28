import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import RegisterPage from "./page";

vi.mock("@/auth", () => ({ signIn: vi.fn() }));

import { signIn } from "@/auth";

const signInMock = vi.mocked(signIn);

beforeEach(() => {
  db.delete(users).run();
  signInMock.mockReset();
});

describe("RegisterPage", () => {
  it("renders the registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Crea tu cuenta")).toBeInTheDocument();
  });

  it("shows a validation error for a duplicate username", async () => {
    const user = userEvent.setup();
    db.insert(users).values({ username: "alice", passwordHash: "x" }).run();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("Nombre de usuario"), "alice");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "secret123");
    await user.type(passwordInputs[1], "secret123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ya existe una cuenta con ese nombre de usuario.")).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });
});

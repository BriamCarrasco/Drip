"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { getLockRemainingMs } from "@/lib/rate-limit";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();

  if (username) {
    const lockedMs = getLockRemainingMs(username.toLowerCase());
    if (lockedMs > 0) {
      const minutes = Math.max(1, Math.ceil(lockedMs / 60000));
      return {
        error: `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`,
      };
    }
  }

  try {
    await signIn("credentials", {
      username,
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Usuario o contraseña incorrectos." };
    }
    throw error;
  }

  return {};
}

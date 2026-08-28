"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { signIn } from "@/auth";
import { getClientIp } from "@/lib/client-ip";
import { isRegistrationEnabled } from "@/lib/registration";
import { getLockRemainingMs, registerFailedAttempt } from "@/lib/rate-limit";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "El usuario debe tener al menos 3 caracteres.")
      .max(24, "El usuario debe tener como máximo 24 caracteres.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(72, "La contraseña debe tener como máximo 72 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterState = { error?: string };

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  if (!isRegistrationEnabled()) {
    return { error: "El registro de nuevas cuentas está deshabilitado en esta instancia." };
  }

  const ip = await getClientIp();
  const rateKey = `register:${ip}`;
  if (getLockRemainingMs(rateKey) > 0) {
    return { error: "Demasiados intentos de registro. Probá de nuevo más tarde." };
  }
  registerFailedAttempt(rateKey);

  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { username, password } = parsed.data;

  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return { error: "Ya existe una cuenta con ese nombre de usuario." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  db.insert(users).values({ username, passwordHash }).run();

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "La cuenta se creó, pero no se pudo iniciar sesión automáticamente." };
    }
    throw error;
  }

  return {};
}

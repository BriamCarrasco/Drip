"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { signIn } from "@/auth";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "El usuario debe tener al menos 3 caracteres.")
      .max(24, "El usuario debe tener como máximo 24 caracteres.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
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

  const passwordHash = await bcrypt.hash(password, 10);

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

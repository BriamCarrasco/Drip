"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { signOut, auth } from "@/auth";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";
import { sendNotification } from "@/lib/apprise";
import { refreshUsdClpRate } from "@/lib/exchange-rate";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

const settingsSchema = z.object({
  defaultAppriseUrl: z.string().optional(),
  defaultCurrency: z.enum(["CLP", "USD"]),
  exchangeRateMode: z.enum(["manual", "auto"]),
  manualExchangeRate: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() !== "" ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      message: "El tipo de cambio debe ser un número positivo.",
    }),
  monthlyBudget: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() !== "" ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      message: "El presupuesto mensual debe ser un número positivo.",
    }),
});

export type SettingsState = { error?: string; success?: boolean };

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return Number(session.user.id);
}

export async function updateSettingsAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const userId = await requireUserId();
  const parsed = settingsSchema.safeParse({
    defaultAppriseUrl: formData.get("defaultAppriseUrl") || undefined,
    defaultCurrency: formData.get("defaultCurrency"),
    exchangeRateMode: formData.get("exchangeRateMode"),
    manualExchangeRate: formData.get("manualExchangeRate") || undefined,
    monthlyBudget: formData.get("monthlyBudget") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { defaultAppriseUrl, defaultCurrency, exchangeRateMode, manualExchangeRate, monthlyBudget } =
    parsed.data;

  db.insert(settings)
    .values({
      userId,
      defaultAppriseUrl: defaultAppriseUrl ?? null,
      defaultCurrency,
      exchangeRateMode,
      manualExchangeRate,
      monthlyBudget,
      budgetAlertSentFor: null,
    })
    .onConflictDoUpdate({
      target: settings.userId,
      set: {
        defaultAppriseUrl: defaultAppriseUrl ?? null,
        defaultCurrency,
        exchangeRateMode,
        manualExchangeRate,
        monthlyBudget,
        budgetAlertSentFor: null,
      },
    })
    .run();

  revalidatePath("/configuracion");
  return { success: true };
}

export type RefreshExchangeRateState = { error?: string; success?: boolean; rate?: number };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function refreshExchangeRateAction(_prevState: RefreshExchangeRateState, _formData: FormData): Promise<RefreshExchangeRateState> {
  const rate = await refreshUsdClpRate();
  if (rate === null) {
    return { error: "No se pudo obtener el tipo de cambio. Revisa tu conexión a internet." };
  }

  revalidatePath("/configuracion");
  return { success: true, rate };
}

export type TestNotificationState = { error?: string; success?: boolean };

export async function sendTestNotificationAction(
  _prevState: TestNotificationState,
  formData: FormData
): Promise<TestNotificationState> {
  const url = formData.get("defaultAppriseUrl");
  if (typeof url !== "string" || url.trim().length === 0) {
    return { error: "Ingresa una URL de Apprise antes de probarla." };
  }

  const ok = await sendNotification({
    url,
    title: "Suscripciones — Notificación de prueba",
    body: "Si ves esto, tu canal de notificaciones está funcionando.",
  });

  return ok ? { success: true } : { error: "No se pudo enviar la notificación. Revisa la URL." };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { error: "Usuario no encontrado." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "La contraseña actual no es correcta." };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId)).run();

  return { success: true };
}

const changeUsernameSchema = z.object({
  newUsername: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(24, "El usuario debe tener como máximo 24 caracteres.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos."),
  currentPassword: z.string().min(1, "Ingresa tu contraseña para confirmar."),
});

export type ChangeUsernameState = { error?: string };

export async function changeUsernameAction(
  _prevState: ChangeUsernameState,
  formData: FormData
): Promise<ChangeUsernameState> {
  const userId = await requireUserId();
  const parsed = changeUsernameSchema.safeParse({
    newUsername: formData.get("newUsername"),
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { newUsername, currentPassword } = parsed.data;

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { error: "Usuario no encontrado." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Contraseña incorrecta." };

  const clash = db.select().from(users).where(eq(users.username, newUsername)).get();
  if (clash && clash.id !== userId) {
    return { error: "Ese nombre de usuario ya está en uso." };
  }

  db.update(users).set({ username: newUsername }).where(eq(users.id, userId)).run();

  await signOut({ redirectTo: `/login?renamed=${encodeURIComponent(newUsername)}` });
  return {};
}

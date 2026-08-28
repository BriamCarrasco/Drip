"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";
import { requireUserId } from "@/lib/require-user-id";
import { revalidateSettingsPaths } from "@/lib/revalidate";
import { sendNotification } from "@/lib/apprise";
import { isSafeAppriseUrl } from "@/lib/apprise-url";
import { refreshUsdClpRate } from "@/lib/exchange-rate";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

const settingsSchema = z.object({
  defaultAppriseUrl: z
    .string()
    .optional()
    .refine((value) => !value || isSafeAppriseUrl(value), {
      message:
        "La URL de notificación no es válida o apunta a una red interna. Usá el esquema del servicio (por ejemplo discord://, tgram://).",
    }),
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

  revalidateSettingsPaths();
  return { success: true };
}

export type RefreshExchangeRateState = { error?: string; success?: boolean; rate?: number };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function refreshExchangeRateAction(_prevState: RefreshExchangeRateState, _formData: FormData): Promise<RefreshExchangeRateState> {
  await requireUserId();

  const rate = await refreshUsdClpRate();
  if (rate === null) {
    return { error: "No se pudo obtener el tipo de cambio. Revisa tu conexión a internet." };
  }

  revalidateSettingsPaths();
  return { success: true, rate };
}

export type TelegramChatIdState = { chatId?: string; error?: string };

export async function fetchTelegramChatIdAction(
  _prevState: TelegramChatIdState,
  formData: FormData
): Promise<TelegramChatIdState> {
  await requireUserId();

  const token = formData.get("botToken");
  if (typeof token !== "string" || token.trim().length === 0) {
    return { error: "Ingresa el token del bot primero." };
  }

  const trimmedToken = token.trim();
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(trimmedToken)) {
    return { error: "El token del bot no tiene un formato válido." };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${trimmedToken}/getUpdates`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await response.json();

    if (!data.ok) {
      return { error: "Telegram rechazó el token. Revisa que esté bien copiado." };
    }

    const updates = data.result as {
      message?: { chat?: { id: number } };
      channel_post?: { chat?: { id: number } };
    }[];

    if (!updates || updates.length === 0) {
      return {
        error: "No encontramos mensajes todavía. Escribile algo a tu bot (o al grupo) y probá de nuevo.",
      };
    }

    const last = updates[updates.length - 1];
    const chatId = last.message?.chat?.id ?? last.channel_post?.chat?.id;
    if (chatId === undefined) {
      return { error: "No se pudo leer el chat_id de la respuesta de Telegram." };
    }

    return { chatId: String(chatId) };
  } catch {
    return { error: "No se pudo conectar con Telegram. Revisa tu conexión." };
  }
}

export type TestNotificationState = { error?: string; success?: boolean };

export async function sendTestNotificationAction(
  _prevState: TestNotificationState,
  formData: FormData
): Promise<TestNotificationState> {
  await requireUserId();

  const url = formData.get("defaultAppriseUrl");
  if (typeof url !== "string" || url.trim().length === 0) {
    return { error: "Ingresa una URL de Apprise antes de probarla." };
  }

  if (!isSafeAppriseUrl(url)) {
    return {
      error:
        "La URL de notificación no es válida o apunta a una red interna. Usá el esquema del servicio (por ejemplo discord://, tgram://).",
    };
  }

  const ok = await sendNotification({
    url,
    title: "D(r)ip — Notificación de prueba",
    body: "Si ves esto, tu canal de notificaciones está funcionando.",
  });

  return ok ? { success: true } : { error: "No se pudo enviar la notificación. Revisa la URL." };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
      .max(72, "La nueva contraseña debe tener como máximo 72 caracteres."),
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

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
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

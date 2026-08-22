"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { signOut, auth } from "@/auth";
import { db } from "@/lib/db";
import { settings } from "@/drizzle/schema";
import { sendNotification } from "@/lib/apprise";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

const settingsSchema = z.object({
  defaultAppriseUrl: z.string().optional(),
  defaultCurrency: z.enum(["CLP", "USD"]),
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
  });

  if (!parsed.success) {
    return { error: "Datos inválidos." };
  }

  const { defaultAppriseUrl, defaultCurrency } = parsed.data;

  db.insert(settings)
    .values({ userId, defaultAppriseUrl: defaultAppriseUrl ?? null, defaultCurrency })
    .onConflictDoUpdate({
      target: settings.userId,
      set: { defaultAppriseUrl: defaultAppriseUrl ?? null, defaultCurrency },
    })
    .run();

  revalidatePath("/configuracion");
  return { success: true };
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

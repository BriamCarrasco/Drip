"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/drizzle/schema";
import { auth } from "@/auth";
import { getPriceHistory, recordPriceChange, type PriceHistoryEntry } from "@/lib/price-history";

const subscriptionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.enum(["CLP", "USD"]),
  billingCycle: z.enum(["weekly", "monthly", "yearly", "custom_days"]),
  customIntervalDays: z.number().int().positive().optional(),
  nextBillingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha ingresada no es válida.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date.getFullYear() >= 1970 && date.getFullYear() <= 9999;
    }, "La fecha ingresada no es válida."),
  category: z.string().min(1),
  notificationDaysBefore: z.number().int().nonnegative(),
  appriseUrl: z.string().optional(),
  isActive: z.boolean(),
  isTrial: z.boolean(),
});

export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return Number(session.user.id);
}

function revalidateSubscriptionPaths() {
  revalidatePath("/");
  revalidatePath("/suscripciones");
  revalidatePath("/calendario");
}

function parseSubscriptionInput(input: SubscriptionInput) {
  const result = subscriptionInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Datos inválidos.");
  }
  return result.data;
}

export async function createSubscriptionAction(input: SubscriptionInput) {
  const userId = await requireUserId();
  const data = parseSubscriptionInput(input);

  const created = db
    .insert(subscriptions)
    .values({ ...data, userId })
    .returning({ id: subscriptions.id })
    .get();

  recordPriceChange(created.id, data.amount, data.currency);
  revalidateSubscriptionPaths();
}

export async function updateSubscriptionAction(id: number, input: SubscriptionInput) {
  const userId = await requireUserId();
  const data = parseSubscriptionInput(input);

  const current = db
    .select({ amount: subscriptions.amount, currency: subscriptions.currency })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .get();

  db.update(subscriptions)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .run();

  if (current && (current.amount !== data.amount || current.currency !== data.currency)) {
    recordPriceChange(id, data.amount, data.currency);
  }

  revalidateSubscriptionPaths();
}

export async function toggleSubscriptionActiveAction(id: number) {
  const userId = await requireUserId();
  const current = db
    .select({ isActive: subscriptions.isActive })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .get();

  if (!current) return;

  db.update(subscriptions)
    .set({ isActive: !current.isActive, updatedAt: sql`(current_timestamp)` })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .run();

  revalidateSubscriptionPaths();
}

export async function deleteSubscriptionAction(id: number) {
  const userId = await requireUserId();
  db.delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .run();
  revalidateSubscriptionPaths();
}

export async function getPriceHistoryAction(id: number): Promise<PriceHistoryEntry[]> {
  const userId = await requireUserId();
  const owns = db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .get();

  if (!owns) return [];
  return getPriceHistory(id);
}

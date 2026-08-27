"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/drizzle/schema";
import { auth } from "@/auth";
import { getPriceHistory, recordPriceChange, type PriceHistoryEntry } from "@/lib/price-history";
import { getStatusHistory, recordStatusChange, type StatusHistoryEntry } from "@/lib/status-history";
import { getPaymentLog, recordPayment, type PaymentLogEntry } from "@/lib/payment-log";
import { advanceDate } from "@/lib/calendar";

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
  splitCount: z.number().int().min(1).max(20),
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
  revalidatePath("/estadisticas");
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
  recordStatusChange(created.id, data.isActive);
  revalidateSubscriptionPaths();
}

export async function updateSubscriptionAction(id: number, input: SubscriptionInput) {
  const userId = await requireUserId();
  const data = parseSubscriptionInput(input);

  const current = db
    .select({
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      isActive: subscriptions.isActive,
    })
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

  if (current && current.isActive !== data.isActive) {
    recordStatusChange(id, data.isActive);
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

  recordStatusChange(id, !current.isActive);
  revalidateSubscriptionPaths();
}

export async function markAsPaidAction(id: number) {
  const userId = await requireUserId();
  const current = db
    .select({
      nextBillingDate: subscriptions.nextBillingDate,
      billingCycle: subscriptions.billingCycle,
      customIntervalDays: subscriptions.customIntervalDays,
      isTrial: subscriptions.isTrial,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      splitCount: subscriptions.splitCount,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .get();

  if (!current) return;

  const nextDate = advanceDate(
    new Date(`${current.nextBillingDate}T00:00:00`),
    current.billingCycle,
    current.customIntervalDays
  );

  db.update(subscriptions)
    .set({
      nextBillingDate: nextDate.toISOString().slice(0, 10),
      isTrial: false,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .run();

  const splitCount = current.splitCount > 0 ? current.splitCount : 1;
  recordPayment(id, current.amount / splitCount, current.currency, `${current.nextBillingDate}T00:00:00.000Z`);

  revalidateSubscriptionPaths();
}

export async function deleteSubscriptionAction(id: number) {
  const userId = await requireUserId();
  db.delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .run();
  revalidateSubscriptionPaths();
}

export async function getSubscriptionHistoryAction(
  id: number
): Promise<{ prices: PriceHistoryEntry[]; statuses: StatusHistoryEntry[]; payments: PaymentLogEntry[] }> {
  const userId = await requireUserId();
  const owns = db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .get();

  if (!owns) return { prices: [], statuses: [], payments: [] };
  return { prices: getPriceHistory(id), statuses: getStatusHistory(id), payments: getPaymentLog(id) };
}

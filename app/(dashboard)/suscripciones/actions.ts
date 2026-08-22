"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/drizzle/schema";
import { auth } from "@/auth";

const subscriptionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.enum(["CLP", "USD"]),
  billingCycle: z.enum(["weekly", "monthly", "yearly", "custom_days"]),
  customIntervalDays: z.number().int().positive().optional(),
  nextBillingDate: z.string().min(1),
  category: z.string().min(1),
  notificationDaysBefore: z.number().int().nonnegative(),
  appriseUrl: z.string().optional(),
  isActive: z.boolean(),
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
}

export async function createSubscriptionAction(input: SubscriptionInput) {
  const userId = await requireUserId();
  const data = subscriptionInputSchema.parse(input);
  db.insert(subscriptions).values({ ...data, userId }).run();
  revalidateSubscriptionPaths();
}

export async function updateSubscriptionAction(id: number, input: SubscriptionInput) {
  const userId = await requireUserId();
  const data = subscriptionInputSchema.parse(input);
  db.update(subscriptions)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
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

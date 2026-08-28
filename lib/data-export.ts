import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { priceHistory, settings, statusHistory, subscriptions, type BillingCycle } from "@/drizzle/schema";
import { isSafeAppriseUrl } from "@/lib/apprise-url";

const MAX_IMPORT_SUBSCRIPTIONS = 1000;
const MAX_IMPORT_PRICE_HISTORY = 1000;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

const EXPORT_VERSION = 1;

export type DataExport = {
  version: 1;
  exportedAt: string;
  settings: {
    defaultAppriseUrl: string | null;
    defaultCurrency: string;
    exchangeRateMode: "manual" | "auto";
    manualExchangeRate: number | null;
  } | null;
  subscriptions: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
    customIntervalDays: number | null;
    nextBillingDate: string;
    category: string;
    notificationDaysBefore: number;
    appriseUrl: string | null;
    isActive: boolean;
    isTrial: boolean;
    splitCount: number;
    priceHistory: { amount: number; currency: string; changedAt: string }[];
  }[];
};

export function buildExportForUser(userId: number): DataExport {
  const userSettings = db.select().from(settings).where(eq(settings.userId, userId)).get();
  const subs = db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).all();

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: userSettings
      ? {
          defaultAppriseUrl: userSettings.defaultAppriseUrl,
          defaultCurrency: userSettings.defaultCurrency,
          exchangeRateMode: userSettings.exchangeRateMode,
          manualExchangeRate: userSettings.manualExchangeRate,
        }
      : null,
    subscriptions: subs.map((sub) => ({
      name: sub.name,
      description: sub.description,
      logoUrl: sub.logoUrl,
      amount: sub.amount,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      customIntervalDays: sub.customIntervalDays,
      nextBillingDate: sub.nextBillingDate,
      category: sub.category,
      notificationDaysBefore: sub.notificationDaysBefore,
      appriseUrl: sub.appriseUrl,
      isActive: sub.isActive,
      isTrial: sub.isTrial,
      splitCount: sub.splitCount,
      priceHistory: db
        .select({
          amount: priceHistory.amount,
          currency: priceHistory.currency,
          changedAt: priceHistory.changedAt,
        })
        .from(priceHistory)
        .where(eq(priceHistory.subscriptionId, sub.id))
        .all(),
    })),
  };
}

const currencySchema = z.enum(["CLP", "USD"]);

const importSchema = z.object({
  version: z.literal(1),
  subscriptions: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        logoUrl: z
          .string()
          .max(2048)
          .refine((value) => value === "" || /^https?:\/\//i.test(value), "URL de logo no válida.")
          .nullable()
          .optional(),
        amount: z.number().nonnegative().finite(),
        currency: currencySchema,
        billingCycle: z.enum(["weekly", "monthly", "yearly", "custom_days"]),
        customIntervalDays: z.number().int().positive().max(3650).nullable().optional(),
        nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        category: z.string().min(1).max(100),
        notificationDaysBefore: z.number().int().nonnegative().max(365),
        appriseUrl: z
          .string()
          .refine((value) => value === "" || isSafeAppriseUrl(value), "URL de notificación no válida.")
          .nullable()
          .optional(),
        isActive: z.boolean(),
        isTrial: z.boolean(),
        splitCount: z.number().int().min(1).max(20).optional(),
        priceHistory: z
          .array(
            z.object({
              amount: z.number().nonnegative().finite(),
              currency: currencySchema,
              changedAt: z.string().regex(TIMESTAMP_RE),
            })
          )
          .max(MAX_IMPORT_PRICE_HISTORY)
          .optional(),
      })
    )
    .max(MAX_IMPORT_SUBSCRIPTIONS),
});

export function parseImportPayload(payload: unknown) {
  return importSchema.safeParse(payload);
}

export function importDataForUser(
  userId: number,
  data: z.infer<typeof importSchema>
): { subscriptions: number } {
  let importedSubscriptions = 0;

  db.transaction(() => {
    for (const sub of data.subscriptions) {
      const created = db
        .insert(subscriptions)
        .values({
          userId,
          name: sub.name,
          description: sub.description ?? null,
          logoUrl: sub.logoUrl ?? null,
          amount: sub.amount,
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          customIntervalDays: sub.customIntervalDays ?? null,
          nextBillingDate: sub.nextBillingDate,
          category: sub.category,
          notificationDaysBefore: sub.notificationDaysBefore,
          appriseUrl: sub.appriseUrl ?? null,
          isActive: sub.isActive,
          isTrial: sub.isTrial,
          splitCount: sub.splitCount ?? 1,
        })
        .returning({ id: subscriptions.id })
        .get();

      const history = sub.priceHistory?.length
        ? sub.priceHistory
        : [{ amount: sub.amount, currency: sub.currency, changedAt: new Date().toISOString() }];

      for (const entry of history) {
        db.insert(priceHistory)
          .values({
            subscriptionId: created.id,
            amount: entry.amount,
            currency: entry.currency,
            changedAt: entry.changedAt,
          })
          .run();
      }

      db.insert(statusHistory)
        .values({
          subscriptionId: created.id,
          isActive: sub.isActive,
          changedAt: history[0].changedAt,
        })
        .run();

      importedSubscriptions += 1;
    }
  });

  return { subscriptions: importedSubscriptions };
}

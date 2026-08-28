"use server";

import { requireUserId } from "@/lib/require-user-id";
import { revalidateSubscriptionPaths } from "@/lib/revalidate";
import { buildExportForUser, importDataForUser, parseImportPayload } from "@/lib/data-export";
import type { DataExport } from "@/lib/data-export";

export async function exportDataAction(): Promise<DataExport> {
  const userId = await requireUserId();
  return buildExportForUser(userId);
}

export type ImportDataState = {
  error?: string;
  success?: boolean;
  importedSubscriptions?: number;
};

export async function importDataAction(payload: unknown): Promise<ImportDataState> {
  const userId = await requireUserId();

  let parsedJson: unknown;
  try {
    parsedJson = typeof payload === "string" ? JSON.parse(payload) : payload;
  } catch {
    return { error: "El archivo no es un JSON válido." };
  }

  const result = parseImportPayload(parsedJson);
  if (!result.success) {
    return { error: "El archivo no tiene el formato esperado de una exportación de esta app." };
  }

  if (result.data.subscriptions.length === 0) {
    return { error: "El archivo no contiene suscripciones para importar." };
  }

  const imported = importDataForUser(userId, result.data);

  revalidateSubscriptionPaths();

  return {
    success: true,
    importedSubscriptions: imported.subscriptions,
  };
}

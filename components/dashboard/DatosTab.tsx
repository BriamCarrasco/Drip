"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { exportDataAction, importDataAction } from "@/app/(dashboard)/configuracion/data-actions";
import { InlineMessage } from "@/components/dashboard/InlineMessage";

export function DatosTab() {
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    startExport(async () => {
      const data = await exportDataAction();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suscripciones-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage(null);

    startImport(async () => {
      const text = await file.text();
      const result = await importDataAction(text);

      if (result.success) {
        const count = result.importedSubscriptions ?? 0;
        setImportMessage({
          type: "success",
          text: `Se ${count === 1 ? "importó" : "importaron"} ${count} ${count === 1 ? "suscripción" : "suscripciones"}.`,
        });
      } else {
        setImportMessage({ type: "error", text: result.error ?? "No se pudo importar el archivo." });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold">Exportar tus datos</h2>
          <p className="mt-1 text-[13px] text-muted">
            Descarga tus suscripciones, historial de precios y preferencias en un archivo JSON.
            Sirve como respaldo personal y para volver a importarlo cuando quieras.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {isExporting ? "Generando..." : "Exportar mis datos"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border-soft pt-6">
        <div>
          <h3 className="text-[15px] font-semibold">Importar</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Subí un archivo exportado desde acá. Todo se agrega como registros nuevos — no
            reemplaza ni borra lo que ya tenés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            disabled={isImporting}
            className="text-[13px] text-muted file:mr-3 file:rounded-[10px] file:border-0 file:bg-surface-muted file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-label hover:file:bg-border-soft"
          />
          {isImporting && <span className="text-[13px] text-muted">Importando...</span>}
        </div>
        {importMessage && (
          <InlineMessage pending={isImporting} tone={importMessage.type} text={importMessage.text} />
        )}
      </div>
    </div>
  );
}

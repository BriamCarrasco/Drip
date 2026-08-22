"use client";

import { useActionState, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import type { Settings } from "@/lib/settings";
import {
  updateSettingsAction,
  sendTestNotificationAction,
  type SettingsState,
  type TestNotificationState,
} from "@/app/(dashboard)/configuracion/actions";

const initialSettingsState: SettingsState = {};
const initialTestState: TestNotificationState = {};

type Tab = "cuenta" | "notificaciones" | "preferencias";

const tabs: { id: Tab; label: string }[] = [
  { id: "cuenta", label: "Cuenta" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "preferencias", label: "Preferencias" },
];

export function ConfiguracionForm({
  settings,
  username,
  signOutAction,
}: {
  settings: Settings;
  username: string;
  signOutAction: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("notificaciones");
  const [appriseUrl, setAppriseUrl] = useState(settings.defaultAppriseUrl ?? "");
  const [currency, setCurrency] = useState(settings.defaultCurrency);

  const [settingsState, settingsFormAction, settingsPending] = useActionState(
    updateSettingsAction,
    initialSettingsState
  );
  const [testState, testFormAction, testPending] = useActionState(
    sendTestNotificationAction,
    initialTestState
  );

  const inputClass =
    "rounded-[10px] border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none focus:border-accent";

  return (
    <div className="flex gap-10">
      <div className="flex w-[200px] shrink-0 flex-col gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "rounded-[10px] bg-accent-tint px-3.5 py-2.5 text-left text-sm font-semibold text-accent"
                : "rounded-[10px] px-3.5 py-2.5 text-left text-sm font-medium text-muted-strong hover:text-foreground"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-surface p-8">
        <div className={activeTab === "cuenta" ? "flex flex-col gap-6" : "hidden"}>
          <div>
            <h2 className="text-[17px] font-semibold">Cuenta</h2>
            <p className="mt-1 text-[13px] text-muted">
              Sesión iniciada como <span className="font-medium text-foreground">{username}</span>
            </p>
          </div>
          <form action={signOutAction}>
            <button className="text-[13.5px] font-semibold text-danger">Cerrar sesión</button>
          </form>
        </div>

        <form action={settingsFormAction}>
          <div className={activeTab === "notificaciones" ? "flex flex-col gap-6" : "hidden"}>
            <div>
              <h2 className="text-[17px] font-semibold">Notificaciones</h2>
              <p className="mt-1 text-[13px] text-muted">
                Canal de Apprise usado para avisos de cobro próximo.
              </p>
            </div>
            <label className="flex max-w-[480px] flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-label">URL de Apprise por defecto</span>
              <input
                name="defaultAppriseUrl"
                value={appriseUrl}
                onChange={(e) => setAppriseUrl(e.target.value)}
                placeholder="discord://webhook_id/webhook_token"
                className={inputClass}
              />
              <p className="mt-0.5 text-[12.5px] text-muted">
                Se usa en todas las suscripciones que no tengan su propia URL configurada.
              </p>
            </label>
            <div className="flex max-w-[480px] items-center gap-3 border-t border-border-soft pt-4">
              <button
                type="submit"
                formAction={testFormAction}
                disabled={testPending}
                className="text-[13px] font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {testPending ? "Enviando..." : "Enviar notificación de prueba"}
              </button>
              {testState.success && (
                <span className="text-[12.5px] font-medium text-success">Notificación enviada.</span>
              )}
              {testState.error && (
                <span className="text-[12.5px] font-medium text-danger">{testState.error}</span>
              )}
            </div>
          </div>

          <div className={activeTab === "preferencias" ? "flex flex-col gap-6" : "hidden"}>
            <div>
              <h2 className="text-[17px] font-semibold">Preferencias</h2>
              <p className="mt-1 text-[13px] text-muted">
                Valores por defecto al crear una nueva suscripción.
              </p>
            </div>
            <label className="flex w-60 flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-label">Moneda por defecto</span>
              <div className="relative">
                <select
                  name="defaultCurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={`${inputClass} w-full appearance-none pr-9`}
                >
                  <option value="CLP">CLP — Peso chileno</option>
                  <option value="USD">USD — Dólar estadounidense</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </label>
          </div>

          {activeTab !== "cuenta" && (
            <div className="mt-6 flex items-center justify-end gap-3">
              {settingsState.success && (
                <span className="text-[13px] font-medium text-success">Cambios guardados.</span>
              )}
              {settingsState.error && (
                <span className="text-[13px] font-medium text-danger">{settingsState.error}</span>
              )}
              <button
                type="submit"
                disabled={settingsPending}
                className="rounded-[10px] bg-accent px-5.5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {settingsPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

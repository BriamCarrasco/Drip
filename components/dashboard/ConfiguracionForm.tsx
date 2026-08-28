"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { CuentaTab } from "@/components/dashboard/CuentaTab";
import { DatosTab } from "@/components/dashboard/DatosTab";
import { InlineMessage } from "@/components/dashboard/InlineMessage";
import { inputClass } from "@/components/dashboard/form-styles";
import type { Settings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import { buildTelegramAppriseUrl, parseTelegramAppriseUrl } from "@/lib/telegram-apprise";
import { isDiscordAppriseUrl } from "@/lib/discord-apprise";
import { buildEmailAppriseUrl, parseEmailAppriseUrl, type EmailProvider } from "@/lib/email-apprise";
import {
  getStoredThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import {
  updateSettingsAction,
  sendTestNotificationAction,
  refreshExchangeRateAction,
  fetchTelegramChatIdAction,
  type SettingsState,
  type TestNotificationState,
  type RefreshExchangeRateState,
  type TelegramChatIdState,
} from "@/app/(dashboard)/configuracion/actions";

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

const exchangeRateModeOptions: { value: "manual" | "auto"; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Automático" },
];

const initialSettingsState: SettingsState = {};
const initialTestState: TestNotificationState = {};
const initialRefreshState: RefreshExchangeRateState = {};
const initialChatIdState: TelegramChatIdState = {};

type AppriseMode = "telegram" | "discord" | "email" | "manual";

const appriseModeOptions: { value: "telegram" | "discord" | "email"; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "email", label: "Correo" },
];

const emailProviderOptions: { value: EmailProvider; label: string }[] = [
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook" },
  { value: "yahoo", label: "Yahoo" },
  { value: "zoho", label: "Zoho" },
  { value: "custom", label: "Otro (SMTP)" },
];

type Tab = "cuenta" | "notificaciones" | "preferencias" | "datos";

const tabs: { id: Tab; label: string }[] = [
  { id: "cuenta", label: "Cuenta" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "preferencias", label: "Preferencias" },
  { id: "datos", label: "Datos" },
];

export function ConfiguracionForm({
  settings,
  username,
  signOutAction,
  storedExchangeRate,
}: {
  settings: Settings;
  username: string;
  signOutAction: () => Promise<void>;
  storedExchangeRate: { rate: number; updatedAt: string } | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("notificaciones");
  const rawAppriseUrl = settings.defaultAppriseUrl ?? "";
  const initialTelegram = parseTelegramAppriseUrl(rawAppriseUrl);
  const initialIsDiscord = !initialTelegram && isDiscordAppriseUrl(rawAppriseUrl);
  const initialEmail = !initialTelegram && !initialIsDiscord ? parseEmailAppriseUrl(rawAppriseUrl) : null;
  const isKnownFormat = Boolean(initialTelegram || initialIsDiscord || initialEmail);

  const [appriseMode, setAppriseMode] = useState<AppriseMode>(() => {
    if (initialTelegram) return "telegram";
    if (initialIsDiscord) return "discord";
    if (initialEmail) return "email";
    return rawAppriseUrl ? "manual" : "telegram";
  });
  const [manualAppriseUrl, setManualAppriseUrl] = useState(isKnownFormat ? "" : rawAppriseUrl);
  const [telegramToken, setTelegramToken] = useState(initialTelegram?.token ?? "");
  const [telegramChatId, setTelegramChatId] = useState(initialTelegram?.chatId ?? "");
  const [telegramThreadId, setTelegramThreadId] = useState(initialTelegram?.threadId ?? "");
  const [showToken, setShowToken] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(initialIsDiscord ? rawAppriseUrl : "");
  const [emailAddress, setEmailAddress] = useState(initialEmail?.email ?? "");
  const [emailPassword, setEmailPassword] = useState(initialEmail?.password ?? "");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(initialEmail?.provider ?? "gmail");
  const [emailSmtpHost, setEmailSmtpHost] = useState(initialEmail?.smtpHost ?? "");
  const [emailSmtpPort, setEmailSmtpPort] = useState(initialEmail?.smtpPort ?? "");
  const [emailRecipient, setEmailRecipient] = useState(initialEmail?.recipient ?? "");
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : "");
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [exchangeRateMode, setExchangeRateMode] = useState(settings.exchangeRateMode);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getStoredThemePreference());
  }, []);

  function handleThemeChange(preference: ThemePreference) {
    setTheme(preference);
    setThemePreference(preference);
  }

  const [settingsState, settingsFormAction, settingsPending] = useActionState(
    updateSettingsAction,
    initialSettingsState
  );
  const [testState, testFormAction, testPending] = useActionState(
    sendTestNotificationAction,
    initialTestState
  );
  const [refreshState, refreshFormAction, refreshPending] = useActionState(
    refreshExchangeRateAction,
    initialRefreshState
  );
  const [chatIdState, chatIdFormAction, chatIdPending] = useActionState(
    fetchTelegramChatIdAction,
    initialChatIdState
  );

  useEffect(() => {
    if (chatIdState.chatId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTelegramChatId(chatIdState.chatId);
    }
  }, [chatIdState]);

  function computeAppriseUrl(): string {
    switch (appriseMode) {
      case "telegram":
        return telegramToken.trim() && telegramChatId.trim()
          ? buildTelegramAppriseUrl(telegramToken, telegramChatId, telegramThreadId)
          : "";
      case "discord":
        return discordWebhookUrl.trim();
      case "email":
        return emailAddress.trim() && emailPassword.trim()
          ? buildEmailAppriseUrl({
              email: emailAddress,
              password: emailPassword,
              provider: emailProvider,
              smtpHost: emailSmtpHost,
              smtpPort: emailSmtpPort,
              recipient: emailRecipient,
            })
          : "";
      case "manual":
        return manualAppriseUrl;
    }
  }

  const computedAppriseUrl = computeAppriseUrl();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-10">
      <div className="flex gap-0.5 overflow-x-auto pb-1 md:w-[200px] md:shrink-0 md:flex-col md:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "shrink-0 rounded-[10px] bg-accent-tint px-3.5 py-2.5 text-left text-sm font-semibold text-accent"
                : "shrink-0 rounded-[10px] px-3.5 py-2.5 text-left text-sm font-medium text-muted-strong hover:text-foreground"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <div className={activeTab === "cuenta" ? "block" : "hidden"}>
          <CuentaTab username={username} signOutAction={signOutAction} />
        </div>

        <div className={activeTab === "datos" ? "block" : "hidden"}>
          <DatosTab />
        </div>

        <form action={settingsFormAction}>
          <div className={activeTab === "notificaciones" ? "flex flex-col gap-6" : "hidden"}>
            <div>
              <h2 className="text-[17px] font-semibold">Notificaciones</h2>
              <p className="mt-1 text-[13px] text-muted">
                Canal de Apprise usado para avisos de cobro próximo. Se usa en todas las
                suscripciones que no tengan su propia URL configurada.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex w-fit gap-0.5 rounded-[10px] bg-surface-muted p-1">
                {appriseModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAppriseMode(option.value)}
                    className={
                      appriseMode === option.value
                        ? "rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white"
                        : "rounded-lg px-4 py-2 text-[13px] font-medium text-muted-strong"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {appriseMode === "manual" ? (
                <button
                  type="button"
                  onClick={() => setAppriseMode("telegram")}
                  className="self-start text-[12px] font-medium text-muted hover:text-accent hover:underline"
                >
                  ← Volver a las opciones rápidas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAppriseMode("manual")}
                  className="self-start text-[12px] font-medium text-muted hover:text-accent hover:underline"
                >
                  ¿Usás otro servicio (Slack, ntfy, Matrix, etc.)? Configuralo con una URL de Apprise
                </button>
              )}
            </div>

            <input type="hidden" name="defaultAppriseUrl" value={computedAppriseUrl} />
            <input type="hidden" name="botToken" value={telegramToken} />

            {appriseMode === "telegram" ? (
              <div className="flex max-w-[480px] flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">Token de bot</span>
                  <div className="flex items-center gap-2">
                    <input
                      type={showToken ? "text" : "password"}
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="shrink-0 text-[12.5px] font-semibold text-accent hover:underline"
                    >
                      {showToken ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Lo conseguís hablando con{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      @BotFather
                    </a>{" "}
                    en Telegram.
                  </p>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">ID de chat</span>
                  <div className="flex items-center gap-2">
                    <input
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="submit"
                      formAction={chatIdFormAction}
                      disabled={chatIdPending}
                      className="shrink-0 rounded-[10px] border border-border px-3.5 py-2.5 text-[13px] font-semibold text-muted-strong hover:text-foreground disabled:opacity-50"
                    >
                      {chatIdPending ? "Buscando..." : "Obtener automáticamente"}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Escribile un mensaje a tu bot (o al grupo, con el bot ya agregado) y usá el
                    botón — necesita al menos un mensaje previo para encontrarlo.
                  </p>
                  {chatIdState.error && (
                    <InlineMessage pending={chatIdPending} tone="error" text={chatIdState.error} />
                  )}
                  {chatIdState.chatId && (
                    <InlineMessage
                      pending={chatIdPending}
                      tone="success"
                      text={`Encontrado: ${chatIdState.chatId}`}
                    />
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">
                    ID del hilo de mensajes (opcional)
                  </span>
                  <input
                    value={telegramThreadId}
                    onChange={(e) => setTelegramThreadId(e.target.value)}
                    placeholder="Solo para supergrupos con temas"
                    className={inputClass}
                  />
                </label>

                {computedAppriseUrl && (
                  <p className="truncate text-[11.5px] text-muted" title={computedAppriseUrl}>
                    URL generada: {computedAppriseUrl}
                  </p>
                )}
              </div>
            ) : appriseMode === "discord" ? (
              <label className="flex max-w-[480px] flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-label">URL del Webhook de Discord</span>
                <input
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/123456789/AbCdEf..."
                  className={inputClass}
                />
                <p className="mt-0.5 text-[12.5px] text-muted">
                  En el canal de Discord: Configuración → Integraciones → Webhooks → Copiar URL del
                  Webhook.
                </p>
              </label>
            ) : appriseMode === "email" ? (
              <div className="flex max-w-[480px] flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">Correo</span>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="tu_correo@gmail.com"
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">Contraseña de aplicación</span>
                  <div className="flex items-center gap-2">
                    <input
                      type={showEmailPassword ? "text" : "password"}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword((v) => !v)}
                      className="shrink-0 text-[12.5px] font-semibold text-accent hover:underline"
                    >
                      {showEmailPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Gmail, Yahoo y Outlook requieren una contraseña de aplicación, no la de tu
                    cuenta — se genera desde la configuración de seguridad de cada servicio.
                  </p>
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">Proveedor</span>
                  <div className="flex flex-wrap gap-1.5">
                    {emailProviderOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEmailProvider(option.value)}
                        className={
                          emailProvider === option.value
                            ? "rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white"
                            : "rounded-full bg-surface-muted px-3.5 py-1.5 text-[13px] font-medium text-muted-strong"
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Tiene que coincidir con el dominio de tu correo (ej. si es @gmail.com, elegí
                    Gmail) — si no coincide, el envío va a fallar.
                  </p>
                </div>

                {emailProvider === "custom" && (
                  <div className="flex gap-3">
                    <label className="flex flex-1 flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-label">Servidor SMTP</span>
                      <input
                        value={emailSmtpHost}
                        onChange={(e) => setEmailSmtpHost(e.target.value)}
                        placeholder="mail.tudominio.com"
                        className={inputClass}
                      />
                    </label>
                    <label className="flex w-24 flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-label">Puerto</span>
                      <input
                        value={emailSmtpPort}
                        onChange={(e) => setEmailSmtpPort(e.target.value)}
                        placeholder="587"
                        className={inputClass}
                      />
                    </label>
                  </div>
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-label">
                    Enviar a (opcional, si es distinto a tu correo)
                  </span>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="destino@ejemplo.com"
                    className={inputClass}
                  />
                </label>
              </div>
            ) : (
              <label className="flex max-w-[480px] flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-label">URL de Apprise por defecto</span>
                <input
                  value={manualAppriseUrl}
                  onChange={(e) => setManualAppriseUrl(e.target.value)}
                  placeholder="tgram://bot_token/chat_id/"
                  className={inputClass}
                />
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Para cualquier otro servicio de Apprise (Slack, ntfy, Matrix, etc.) — más de 80
                  opciones.
                </p>
              </label>
            )}

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
                <InlineMessage pending={testPending} tone="success" text="Notificación enviada." />
              )}
              {testState.error && (
                <InlineMessage pending={testPending} tone="error" text={testState.error} />
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

            <label className="flex max-w-[480px] flex-col gap-1.5 border-t border-border-soft pt-6">
              <span className="text-[13px] font-semibold text-label">Presupuesto mensual (opcional)</span>
              <input
                name="monthlyBudget"
                type="number"
                min="0"
                step="1"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder={`Ej. 50000 (${currency})`}
                className={`${inputClass} w-60`}
              />
              <p className="mt-0.5 text-[12.5px] text-muted">
                Te avisamos por Apprise si el gasto mensual de tus suscripciones activas supera este
                monto, en tu moneda por defecto. Dejar vacío para desactivar.
              </p>
            </label>

            <div className="flex max-w-[480px] flex-col gap-3 border-t border-border-soft pt-6">
              <div>
                <span className="text-[13px] font-semibold text-label">Tipo de cambio (USD/CLP)</span>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Se usa para combinar en tu moneda por defecto el gasto de suscripciones en otra
                  moneda.
                </p>
              </div>

              <div className="flex w-fit gap-0.5 rounded-[10px] bg-surface-muted p-1">
                {exchangeRateModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExchangeRateMode(option.value)}
                    className={
                      exchangeRateMode === option.value
                        ? "rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white"
                        : "rounded-lg px-4 py-2 text-[13px] font-medium text-muted-strong"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="exchangeRateMode" value={exchangeRateMode} />

              {exchangeRateMode === "auto" && (
                <div className="flex flex-col gap-2 rounded-[10px] bg-surface-muted p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-label">
                        {storedExchangeRate
                          ? `1 USD = ${formatMoney(storedExchangeRate.rate, "CLP")}`
                          : "Todavía no se obtuvo un tipo de cambio."}
                      </p>
                      {storedExchangeRate && (
                        <p className="text-[12px] text-muted">
                          Actualizado el {formatDate(storedExchangeRate.updatedAt.slice(0, 10))}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      formAction={refreshFormAction}
                      disabled={refreshPending}
                      className="shrink-0 text-[13px] font-semibold text-accent hover:underline disabled:opacity-50"
                    >
                      {refreshPending ? "Actualizando..." : "Actualizar ahora"}
                    </button>
                  </div>
                  {refreshState.error && (
                    <InlineMessage pending={refreshPending} tone="error" text={refreshState.error} />
                  )}
                  {refreshState.success && (
                    <InlineMessage pending={refreshPending} tone="success" text="Tipo de cambio actualizado." />
                  )}
                </div>
              )}

              <label className="flex w-60 flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-label">
                  {exchangeRateMode === "auto" ? "Respaldo manual (1 USD = CLP)" : "1 USD equivale a (CLP)"}
                </span>
                <input
                  name="manualExchangeRate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={settings.manualExchangeRate ?? ""}
                  placeholder="Ej. 950"
                  className={inputClass}
                />
                {exchangeRateMode === "auto" && (
                  <p className="text-[12px] text-muted">Se usa si falla la actualización automática.</p>
                )}
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-label">Tema</span>
              <div className="flex w-fit gap-0.5 rounded-[10px] bg-surface-muted p-1">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleThemeChange(option.value)}
                    className={
                      theme === option.value
                        ? "rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white"
                        : "rounded-lg px-4 py-2 text-[13px] font-medium text-muted-strong"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeTab !== "cuenta" && activeTab !== "datos" && (
            <div className="mt-6 flex items-center justify-end gap-3">
              {settingsState.success && (
                <InlineMessage pending={settingsPending} tone="success" text="Cambios guardados." />
              )}
              {settingsState.error && (
                <InlineMessage pending={settingsPending} tone="error" text={settingsState.error} />
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

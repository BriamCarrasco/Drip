import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfiguracionForm } from "./ConfiguracionForm";
import type { Settings } from "@/lib/settings";

vi.mock("@/app/(dashboard)/configuracion/actions", () => ({
  updateSettingsAction: vi.fn(),
  sendTestNotificationAction: vi.fn(),
  refreshExchangeRateAction: vi.fn(),
  fetchTelegramChatIdAction: vi.fn(),
  changePasswordAction: vi.fn(),
  changeUsernameAction: vi.fn(),
}));

vi.mock("@/app/(dashboard)/configuracion/data-actions", () => ({
  exportDataAction: vi.fn(),
  importDataAction: vi.fn(),
}));

import {
  fetchTelegramChatIdAction,
  refreshExchangeRateAction,
  sendTestNotificationAction,
  updateSettingsAction,
} from "@/app/(dashboard)/configuracion/actions";

const updateSettingsMock = vi.mocked(updateSettingsAction);
const sendTestMock = vi.mocked(sendTestNotificationAction);
const refreshMock = vi.mocked(refreshExchangeRateAction);
const chatIdMock = vi.mocked(fetchTelegramChatIdAction);

const baseSettings: Settings = {
  defaultAppriseUrl: null,
  defaultCurrency: "CLP",
  exchangeRateMode: "manual",
  manualExchangeRate: null,
  monthlyBudget: null,
  budgetAlertSentFor: null,
};

function renderForm(settings: Partial<Settings> = {}) {
  return render(
    <ConfiguracionForm
      settings={{ ...baseSettings, ...settings }}
      username="alice"
      signOutAction={vi.fn()}
      storedExchangeRate={null}
    />
  );
}

beforeEach(() => {
  updateSettingsMock.mockReset();
  sendTestMock.mockReset();
  refreshMock.mockReset();
  chatIdMock.mockReset();
  window.localStorage.clear();
});

describe("ConfiguracionForm tabs", () => {
  it("shows notificaciones by default and switches tabs on click", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cuenta" }));
    expect(screen.getByText("Sesión iniciada como")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Datos" }));
    expect(screen.getByText("Exportar tus datos")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preferencias" }));
    expect(screen.getByRole("heading", { name: "Preferencias" })).toBeInTheDocument();
  });
});

describe("notification channel selection", () => {
  it("defaults to telegram when there is no existing apprise url", () => {
    renderForm();
    expect(screen.getByText("Token de bot")).toBeInTheDocument();
  });

  it("switches to discord fields", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Discord" }));
    expect(screen.getByText("URL del Webhook de Discord")).toBeInTheDocument();
  });

  it("switches to email fields", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Correo" }));
    expect(screen.getByText("Contraseña de aplicación")).toBeInTheDocument();
  });

  it("switches to manual apprise url mode via the escape hatch link", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByText(/¿Usás otro servicio/));
    expect(screen.getByText("URL de Apprise por defecto")).toBeInTheDocument();
  });

  it("pre-fills telegram fields from an existing tgram url", () => {
    renderForm({ defaultAppriseUrl: "tgram://123:ABC/456789/" });
    expect(screen.getByDisplayValue("456789")).toBeInTheDocument();
  });

  it("pre-fills discord fields from an existing discord url", () => {
    renderForm({ defaultAppriseUrl: "https://discord.com/api/webhooks/123/token" });
    expect(screen.getByPlaceholderText(/discord\.com\/api\/webhooks\/123456789/)).toHaveValue(
      "https://discord.com/api/webhooks/123/token"
    );
  });

  it("pre-fills email fields from an existing mailto url", () => {
    renderForm({ defaultAppriseUrl: "mailto://alice:secret@gmail.com" });
    expect(screen.getByPlaceholderText("tu_correo@gmail.com")).toHaveValue("alice");
  });

  it("falls back to manual mode for an unrecognized apprise url", () => {
    renderForm({ defaultAppriseUrl: "custom://something" });
    expect(screen.getByPlaceholderText("tgram://bot_token/chat_id/")).toHaveValue("custom://something");
  });
});

describe("telegram chat id lookup", () => {
  it("fetches and fills the chat id", async () => {
    const user = userEvent.setup();
    chatIdMock.mockResolvedValue({ chatId: "999" });
    renderForm();

    await user.type(screen.getByPlaceholderText(/123456789:ABC/), "123:ABC");
    await user.click(screen.getByRole("button", { name: "Obtener automáticamente" }));

    expect(await screen.findByText("Encontrado: 999")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("999")).toBeInTheDocument();
  });

  it("shows an error when the lookup fails", async () => {
    const user = userEvent.setup();
    chatIdMock.mockResolvedValue({ error: "No se pudo conectar con Telegram. Revisa tu conexión." });
    renderForm();

    await user.click(screen.getByRole("button", { name: "Obtener automáticamente" }));

    expect(await screen.findByText("No se pudo conectar con Telegram. Revisa tu conexión.")).toBeInTheDocument();
  });
});

describe("test notification and save", () => {
  it("sends a test notification", async () => {
    const user = userEvent.setup();
    sendTestMock.mockResolvedValue({ success: true });
    renderForm();

    await user.click(screen.getByRole("button", { name: /Enviar notificación de prueba/ }));

    expect(await screen.findByText("Notificación enviada.")).toBeInTheDocument();
  });

  it("saves settings", async () => {
    const user = userEvent.setup();
    updateSettingsMock.mockResolvedValue({ success: true });
    renderForm();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalled());
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });
});

describe("preferencias tab", () => {
  it("shows the automatic exchange rate controls only in auto mode", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Preferencias" }));

    expect(screen.queryByRole("button", { name: "Actualizar ahora" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Automático" }));
    expect(screen.getByRole("button", { name: "Actualizar ahora" })).toBeInTheDocument();
  });

  it("refreshes the exchange rate", async () => {
    const user = userEvent.setup();
    refreshMock.mockResolvedValue({ success: true, rate: 950 });
    renderForm();
    await user.click(screen.getByRole("button", { name: "Preferencias" }));
    await user.click(screen.getByRole("button", { name: "Automático" }));

    await user.click(screen.getByRole("button", { name: "Actualizar ahora" }));

    expect(await screen.findByText("Tipo de cambio actualizado.")).toBeInTheDocument();
  });

  it("changes the theme preference and persists it", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Preferencias" }));

    await user.click(screen.getByRole("button", { name: "Oscuro" }));

    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

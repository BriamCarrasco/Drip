import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { settings, users } from "@/drizzle/schema";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/apprise", () => ({ sendNotification: vi.fn() }));

import { auth, signOut } from "@/auth";
import { sendNotification } from "@/lib/apprise";
import {
  changePasswordAction,
  changeUsernameAction,
  fetchTelegramChatIdAction,
  refreshExchangeRateAction,
  sendTestNotificationAction,
  signOutAction,
  updateSettingsAction,
} from "./actions";

const authMock = vi.mocked(auth);
const signOutMock = vi.mocked(signOut);
const sendNotificationMock = vi.mocked(sendNotification);

function sessionFor(userId: number) {
  return { user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>;
}

function insertUser(username = "alice", password = "current-pass"): { id: number; passwordHash: string } {
  const passwordHash = bcrypt.hashSync(password, 10);
  const id = db.insert(users).values({ username, passwordHash }).run().lastInsertRowid as number;
  return { id, passwordHash };
}

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  db.delete(settings).run();
  db.delete(users).run();
  authMock.mockReset();
  signOutMock.mockReset();
  sendNotificationMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signOutAction", () => {
  it("signs out and redirects to /login", async () => {
    await signOutAction();
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

describe("updateSettingsAction", () => {
  it("creates settings on first save", async () => {
    const { id: userId } = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await updateSettingsAction(
      {},
      formData({ defaultCurrency: "CLP", exchangeRateMode: "manual", manualExchangeRate: "950" })
    );

    expect(result.success).toBe(true);
    const [row] = db.select().from(settings).all();
    expect(row.manualExchangeRate).toBe(950);
  });

  it("updates existing settings on a later save", async () => {
    const { id: userId } = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));
    await updateSettingsAction(
      {},
      formData({ defaultCurrency: "CLP", exchangeRateMode: "manual", manualExchangeRate: "950" })
    );

    await updateSettingsAction(
      {},
      formData({ defaultCurrency: "USD", exchangeRateMode: "manual", manualExchangeRate: "1000" })
    );

    const rows = db.select().from(settings).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].defaultCurrency).toBe("USD");
    expect(rows[0].manualExchangeRate).toBe(1000);
  });

  it("rejects a non-positive manual exchange rate", async () => {
    const { id: userId } = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await updateSettingsAction(
      {},
      formData({ defaultCurrency: "CLP", exchangeRateMode: "manual", manualExchangeRate: "-5" })
    );

    expect(result.error).toBeDefined();
    expect(db.select().from(settings).all()).toEqual([]);
  });
});

describe("refreshExchangeRateAction", () => {
  it("returns the refreshed rate on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ serie: [{ valor: 950 }] }) } as Response)
    );

    const result = await refreshExchangeRateAction({}, new FormData());

    expect(result).toEqual({ success: true, rate: 950 });
  });

  it("returns an error when the rate could not be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await refreshExchangeRateAction({}, new FormData());

    expect(result.error).toMatch(/No se pudo obtener el tipo de cambio/);
  });
});

describe("fetchTelegramChatIdAction", () => {
  it("requires a bot token", async () => {
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "" }));
    expect(result.error).toMatch(/Ingresa el token/);
  });

  it("reports a rejected token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ ok: false }) } as Response));
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "abc" }));
    expect(result.error).toMatch(/rechazó el token/);
  });

  it("reports when there are no updates yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: [] }) } as Response));
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "abc" }));
    expect(result.error).toMatch(/No encontramos mensajes/);
  });

  it("extracts the chat id from the last message update", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, result: [{ message: { chat: { id: 123 } } }] }),
      } as Response)
    );
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "abc" }));
    expect(result.chatId).toBe("123");
  });

  it("extracts the chat id from a channel post when there is no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, result: [{ channel_post: { chat: { id: 456 } } }] }),
      } as Response)
    );
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "abc" }));
    expect(result.chatId).toBe("456");
  });

  it("returns a connection error when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await fetchTelegramChatIdAction({}, formData({ botToken: "abc" }));
    expect(result.error).toMatch(/No se pudo conectar con Telegram/);
  });
});

describe("sendTestNotificationAction", () => {
  it("requires a URL", async () => {
    const result = await sendTestNotificationAction({}, formData({ defaultAppriseUrl: "" }));
    expect(result.error).toMatch(/Ingresa una URL/);
  });

  it("returns success when the notification is sent", async () => {
    sendNotificationMock.mockResolvedValue(true);
    const result = await sendTestNotificationAction({}, formData({ defaultAppriseUrl: "tgram://a/b" }));
    expect(result.success).toBe(true);
  });

  it("returns an error when the notification fails to send", async () => {
    sendNotificationMock.mockResolvedValue(false);
    const result = await sendTestNotificationAction({}, formData({ defaultAppriseUrl: "tgram://a/b" }));
    expect(result.error).toBeDefined();
  });
});

describe("changePasswordAction", () => {
  it("rejects mismatched new passwords", async () => {
    const { id: userId } = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await changePasswordAction(
      {},
      formData({ currentPassword: "current-pass", newPassword: "newpassword", confirmNewPassword: "different" })
    );

    expect(result.error).toBe("Las contraseñas nuevas no coinciden.");
  });

  it("rejects an incorrect current password", async () => {
    const { id: userId } = insertUser();
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await changePasswordAction(
      {},
      formData({ currentPassword: "wrong", newPassword: "newpassword", confirmNewPassword: "newpassword" })
    );

    expect(result.error).toBe("La contraseña actual no es correcta.");
  });

  it("updates the password hash on success", async () => {
    const { id: userId } = insertUser("alice", "current-pass");
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await changePasswordAction(
      {},
      formData({ currentPassword: "current-pass", newPassword: "newpassword", confirmNewPassword: "newpassword" })
    );

    expect(result.success).toBe(true);
    const [user] = db.select().from(users).all();
    expect(bcrypt.compareSync("newpassword", user.passwordHash)).toBe(true);
  });
});

describe("changeUsernameAction", () => {
  it("rejects an incorrect current password", async () => {
    const { id: userId } = insertUser("alice", "current-pass");
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await changeUsernameAction(
      {},
      formData({ newUsername: "newname", currentPassword: "wrong" })
    );

    expect(result.error).toBe("Contraseña incorrecta.");
  });

  it("rejects a username that is already taken", async () => {
    const { id: userId } = insertUser("alice", "current-pass");
    insertUser("bob");
    authMock.mockResolvedValue(sessionFor(userId));

    const result = await changeUsernameAction(
      {},
      formData({ newUsername: "bob", currentPassword: "current-pass" })
    );

    expect(result.error).toBe("Ese nombre de usuario ya está en uso.");
  });

  it("renames the user and signs them out", async () => {
    const { id: userId } = insertUser("alice", "current-pass");
    authMock.mockResolvedValue(sessionFor(userId));

    await changeUsernameAction({}, formData({ newUsername: "alicia", currentPassword: "current-pass" }));

    const [user] = db.select().from(users).all();
    expect(user.username).toBe("alicia");
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/login?renamed=alicia" });
  });
});

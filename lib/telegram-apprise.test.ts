import { describe, expect, it } from "vitest";
import { buildTelegramAppriseUrl, parseTelegramAppriseUrl } from "@/lib/telegram-apprise";

describe("buildTelegramAppriseUrl", () => {
  it("builds a basic tgram url", () => {
    expect(buildTelegramAppriseUrl("123:ABC", "987654321")).toBe("tgram://123:ABC/987654321/");
  });

  it("appends the thread id when given", () => {
    expect(buildTelegramAppriseUrl("123:ABC", "987654321", "42")).toBe("tgram://123:ABC/987654321:42/");
  });

  it("trims surrounding whitespace", () => {
    expect(buildTelegramAppriseUrl("  123:ABC  ", "  987654321  ")).toBe("tgram://123:ABC/987654321/");
  });
});

describe("parseTelegramAppriseUrl", () => {
  it("round-trips a basic url", () => {
    const url = buildTelegramAppriseUrl("123:ABC", "987654321");
    expect(parseTelegramAppriseUrl(url)).toEqual({ token: "123:ABC", chatId: "987654321", threadId: "" });
  });

  it("round-trips a url with a thread id", () => {
    const url = buildTelegramAppriseUrl("123:ABC", "987654321", "42");
    expect(parseTelegramAppriseUrl(url)).toEqual({ token: "123:ABC", chatId: "987654321", threadId: "42" });
  });

  it("returns null for a non-telegram url", () => {
    expect(parseTelegramAppriseUrl("discord://abc/def")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseTelegramAppriseUrl("")).toBeNull();
  });
});

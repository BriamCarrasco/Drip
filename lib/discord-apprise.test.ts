import { describe, expect, it } from "vitest";
import { isDiscordAppriseUrl } from "@/lib/discord-apprise";

describe("isDiscordAppriseUrl", () => {
  it("recognizes a full discord.com webhook url", () => {
    expect(isDiscordAppriseUrl("https://discord.com/api/webhooks/123/abcDEF")).toBe(true);
  });

  it("recognizes the legacy discordapp.com domain", () => {
    expect(isDiscordAppriseUrl("https://discordapp.com/api/webhooks/123/abcDEF")).toBe(true);
  });

  it("recognizes the discord:// scheme", () => {
    expect(isDiscordAppriseUrl("discord://123/abcDEF/")).toBe(true);
  });

  it("rejects a telegram url", () => {
    expect(isDiscordAppriseUrl("tgram://123:ABC/987654321/")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isDiscordAppriseUrl("")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { assertSafeAppriseUrl, isSafeAppriseUrl } from "@/lib/apprise-url";

describe("assertSafeAppriseUrl", () => {
  it("accepts well-known service schemes", () => {
    expect(isSafeAppriseUrl("tgram://123456:AAbb/123456789")).toBe(true);
    expect(isSafeAppriseUrl("discord://webhook_id/webhook_token")).toBe(true);
    expect(isSafeAppriseUrl("slack://tokenA/tokenB/tokenC")).toBe(true);
    expect(isSafeAppriseUrl("mailto://user:pass@gmail.com")).toBe(true);
    expect(isSafeAppriseUrl("gotify://gotify.example.com/token")).toBe(true);
  });

  it("accepts raw https webhooks only for known providers", () => {
    expect(isSafeAppriseUrl("https://discord.com/api/webhooks/123/abcDEF")).toBe(true);
    expect(isSafeAppriseUrl("https://hooks.slack.com/services/T/B/x")).toBe(true);
    expect(isSafeAppriseUrl("https://evil.example.com/api/webhooks/123/abc")).toBe(false);
  });

  it("rejects values that would be parsed as CLI flags", () => {
    expect(isSafeAppriseUrl("--plugin-path=/tmp/x")).toBe(false);
    expect(isSafeAppriseUrl("-t")).toBe(false);
  });

  it("rejects generic http webhook schemes", () => {
    expect(isSafeAppriseUrl("json://example.com/hook")).toBe(false);
    expect(isSafeAppriseUrl("http://example.com/hook")).toBe(false);
    expect(isSafeAppriseUrl("https://example.com/hook")).toBe(false);
    expect(isSafeAppriseUrl("form://example.com")).toBe(false);
    expect(isSafeAppriseUrl("xml://example.com")).toBe(false);
  });

  it("rejects schemes pointing at internal or link-local hosts", () => {
    expect(isSafeAppriseUrl("gotify://127.0.0.1/token")).toBe(false);
    expect(isSafeAppriseUrl("gotify://localhost/token")).toBe(false);
    expect(isSafeAppriseUrl("gotify://169.254.169.254/token")).toBe(false);
    expect(isSafeAppriseUrl("gotify://10.0.0.5/token")).toBe(false);
    expect(isSafeAppriseUrl("gotify://192.168.1.10/token")).toBe(false);
    expect(isSafeAppriseUrl("gotify://172.16.0.1/token")).toBe(false);
    expect(isSafeAppriseUrl("matrixs://user@server.local/token")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isSafeAppriseUrl("")).toBe(false);
    expect(isSafeAppriseUrl("not-a-url")).toBe(false);
    expect(isSafeAppriseUrl("tgram:token")).toBe(false);
  });

  it("throws with a message describing the problem", () => {
    expect(() => assertSafeAppriseUrl("json://example.com")).toThrow(/webhooks HTTP/);
    expect(() => assertSafeAppriseUrl("gotify://127.0.0.1/t")).toThrow(/red interna/);
  });
});

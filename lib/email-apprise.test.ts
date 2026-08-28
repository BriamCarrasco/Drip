import { describe, expect, it } from "vitest";
import { buildEmailAppriseUrl, parseEmailAppriseUrl } from "@/lib/email-apprise";

describe("buildEmailAppriseUrl", () => {
  it("builds a gmail shorthand url", () => {
    const url = buildEmailAppriseUrl({ email: "user@gmail.com", password: "secret", provider: "gmail" });
    expect(url).toBe("mailto://user%40gmail.com:secret@gmail.com");
  });

  it("builds a custom smtp url with a port", () => {
    const url = buildEmailAppriseUrl({
      email: "user@midominio.com",
      password: "secret",
      provider: "custom",
      smtpHost: "mail.midominio.com",
      smtpPort: "587",
    });
    expect(url).toBe("mailots://user%40midominio.com:secret@mail.midominio.com:587");
  });

  it("appends the recipient as an extra path segment", () => {
    const url = buildEmailAppriseUrl({
      email: "user@gmail.com",
      password: "secret",
      provider: "gmail",
      recipient: "destino@ejemplo.com",
    });
    expect(url).toBe("mailto://user%40gmail.com:secret@gmail.com/destino%40ejemplo.com");
  });

  it("url-encodes special characters in the password", () => {
    const url = buildEmailAppriseUrl({ email: "user@gmail.com", password: "clave con @ y /", provider: "gmail" });
    expect(url).toContain(encodeURIComponent("clave con @ y /"));
  });
});

describe("parseEmailAppriseUrl", () => {
  it("round-trips every built-in provider", () => {
    for (const provider of ["gmail", "outlook", "yahoo", "zoho"] as const) {
      const url = buildEmailAppriseUrl({ email: "user@ejemplo.com", password: "secret", provider });
      expect(parseEmailAppriseUrl(url)).toEqual({
        email: "user@ejemplo.com",
        password: "secret",
        provider,
        smtpHost: "",
        smtpPort: "",
        recipient: "",
      });
    }
  });

  it("round-trips a custom smtp host and port", () => {
    const url = buildEmailAppriseUrl({
      email: "user@midominio.com",
      password: "secret",
      provider: "custom",
      smtpHost: "mail.midominio.com",
      smtpPort: "587",
    });
    expect(parseEmailAppriseUrl(url)).toEqual({
      email: "user@midominio.com",
      password: "secret",
      provider: "custom",
      smtpHost: "mail.midominio.com",
      smtpPort: "587",
      recipient: "",
    });
  });

  it("round-trips a recipient", () => {
    const url = buildEmailAppriseUrl({
      email: "user@gmail.com",
      password: "secret",
      provider: "gmail",
      recipient: "destino@ejemplo.com",
    });
    expect(parseEmailAppriseUrl(url)?.recipient).toBe("destino@ejemplo.com");
  });

  it("round-trips a password with special characters", () => {
    const url = buildEmailAppriseUrl({ email: "user@gmail.com", password: "clave con @ y /", provider: "gmail" });
    expect(parseEmailAppriseUrl(url)?.password).toBe("clave con @ y /");
  });

  it("returns null for a non-email url", () => {
    expect(parseEmailAppriseUrl("discord://abc/def")).toBeNull();
  });
});

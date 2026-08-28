const SCHEME_RE = /^([a-z][a-z0-9+.-]*):\/\//i;

const HTTPS_WEBHOOK_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
  "hooks.slack.com",
  "chat.googleapis.com",
  "notify-api.line.me",
  "api.telegram.org",
]);

const GENERIC_HTTP_SCHEMES = new Set([
  "http",
  "https",
  "json",
  "jsons",
  "xml",
  "xmls",
  "form",
  "forms",
  "post",
  "posts",
  "get",
  "gets",
  "rss",
]);

function isInternalHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").replace(/:\d+$/, "").toLowerCase();
  if (h === "") return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return true;
  if (h === "metadata" || h === "metadata.google.internal") return true;
  if (h === "0.0.0.0" || h === "::1" || h === "::") return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(h) || h.startsWith("fe80")) return true;
  return false;
}

function isAllowedHttpsWebhook(url: string): boolean {
  try {
    return HTTPS_WEBHOOK_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function extractHost(url: string, schemeLength: number): string {
  const authority = url.slice(schemeLength).split(/[/?#]/)[0];
  return authority.includes("@") ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
}

export function assertSafeAppriseUrl(raw: string): void {
  const url = raw.trim();

  if (url === "") throw new Error("La URL de notificación está vacía.");
  if (url.startsWith("-")) throw new Error("La URL de notificación no es válida.");

  const match = SCHEME_RE.exec(url);
  if (!match) {
    throw new Error("La URL de notificación debe tener el formato esquema://…");
  }

  const scheme = match[1].toLowerCase();

  if (scheme === "https" && isAllowedHttpsWebhook(url)) return;

  if (GENERIC_HTTP_SCHEMES.has(scheme)) {
    throw new Error(
      "Los webhooks HTTP genéricos no están permitidos. Usá el esquema del servicio (por ejemplo discord://, tgram://, slack://)."
    );
  }

  if (isInternalHost(extractHost(url, match[0].length))) {
    throw new Error("No se permiten direcciones de red internas en la URL de notificación.");
  }
}

export function isSafeAppriseUrl(raw: string): boolean {
  try {
    assertSafeAppriseUrl(raw);
    return true;
  } catch {
    return false;
  }
}

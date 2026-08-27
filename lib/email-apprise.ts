export type EmailProvider = "gmail" | "outlook" | "yahoo" | "zoho" | "custom";

const PROVIDER_DOMAINS: Record<Exclude<EmailProvider, "custom">, string> = {
  gmail: "gmail.com",
  outlook: "hotmail.com",
  yahoo: "yahoo.com",
  zoho: "zoho.com",
};

export function buildEmailAppriseUrl(input: {
  email: string;
  password: string;
  provider: EmailProvider;
  smtpHost?: string;
  smtpPort?: string;
  recipient?: string;
}): string {
  const user = encodeURIComponent(input.email.trim());
  const pass = encodeURIComponent(input.password.trim());
  const recipientSegment = input.recipient?.trim() ? `/${encodeURIComponent(input.recipient.trim())}` : "";

  if (input.provider === "custom") {
    const host = input.smtpHost?.trim() ?? "";
    const port = input.smtpPort?.trim();
    return `mailots://${user}:${pass}@${host}${port ? `:${port}` : ""}${recipientSegment}`;
  }

  return `mailto://${user}:${pass}@${PROVIDER_DOMAINS[input.provider]}${recipientSegment}`;
}

export function parseEmailAppriseUrl(url: string): {
  email: string;
  password: string;
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: string;
  recipient: string;
} | null {
  const match = url.trim().match(/^mailtos?:\/\/([^:]+):([^@]+)@([^/]+)(\/.*)?$/);
  if (!match) return null;

  const [, rawUser, rawPass, hostPart, recipientPart] = match;
  const email = decodeURIComponent(rawUser);
  const password = decodeURIComponent(rawPass);
  const recipient = recipientPart ? decodeURIComponent(recipientPart.slice(1).split("/")[0]) : "";

  const [host, port] = hostPart.split(":");
  const knownEntry = (Object.entries(PROVIDER_DOMAINS) as [EmailProvider, string][]).find(
    ([, domain]) => domain === host
  );

  if (knownEntry) {
    return { email, password, provider: knownEntry[0], smtpHost: "", smtpPort: "", recipient };
  }

  return { email, password, provider: "custom", smtpHost: host, smtpPort: port ?? "", recipient };
}

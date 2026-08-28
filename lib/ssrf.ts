import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type PinnedAddress = { address: string; family: 4 | 6 };

export function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80")) return true;
  if (/^f[cd]/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return false;
}

export function isPrivateAddress(address: string, family: 4 | 6): boolean {
  return family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
}

export async function resolvePublicAddresses(hostname: string): Promise<PinnedAddress[] | null> {
  const literal = isIP(hostname);
  if (literal === 4) return isPrivateIpv4(hostname) ? null : [{ address: hostname, family: 4 }];
  if (literal === 6) return isPrivateIpv6(hostname) ? null : [{ address: hostname, family: 6 }];

  try {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.length === 0) return null;
    const allPublic = addresses.every(({ address, family }) =>
      isPrivateAddress(address, family as 4 | 6) === false
    );
    if (!allPublic) return null;
    return addresses.map(({ address, family }) => ({ address, family: family as 4 | 6 }));
  } catch {
    return null;
  }
}

const allowedPorts = new Set(["", "80", "443"]);

export type SafeUrl = { url: URL; addresses: PinnedAddress[] };

export async function assertPublicHttpUrl(rawUrl: string): Promise<SafeUrl> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se permiten URLs http o https.");
  }

  if (!allowedPorts.has(parsed.port)) {
    throw new Error("Puerto no permitido.");
  }

  const addresses = await resolvePublicAddresses(parsed.hostname);
  if (!addresses) {
    throw new Error("No se permiten direcciones de red internas.");
  }

  return { url: parsed, addresses };
}

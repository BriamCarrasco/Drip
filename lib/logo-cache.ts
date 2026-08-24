import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logoCache } from "@/drizzle/schema";

const MAX_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

const allowedContentTypes = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
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

async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
  const literal = isIP(hostname);
  if (literal === 4) return !isPrivateIpv4(hostname);
  if (literal === 6) return !isPrivateIpv6(hostname);

  try {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.length === 0) return false;
    return addresses.every(({ address, family }) =>
      family === 4 ? !isPrivateIpv4(address) : !isPrivateIpv6(address)
    );
  } catch {
    return false;
  }
}

async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se permiten URLs http o https.");
  }

  if (!(await resolvesToPublicAddress(parsed.hostname))) {
    throw new Error("No se permiten direcciones de red internas.");
  }

  return parsed;
}

export type FetchedLogo = { contentType: string; data: Buffer };

async function fetchImage(rawUrl: string): Promise<FetchedLogo> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safeUrl = await assertSafeUrl(currentUrl);

    const response = await fetch(safeUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirección inválida.");
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`El servidor del logo respondió ${response.status}.`);
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!allowedContentTypes.includes(contentType)) {
      throw new Error("La URL no apunta a una imagen.");
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_BYTES) {
      throw new Error("La imagen es demasiado grande.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      throw new Error("La imagen es demasiado grande.");
    }

    return { contentType, data: buffer };
  }

  throw new Error("Demasiadas redirecciones.");
}

export function getCachedLogo(url: string): FetchedLogo | null {
  const row = db.select().from(logoCache).where(eq(logoCache.urlHash, hashUrl(url))).get();
  if (!row) return null;
  return { contentType: row.contentType, data: row.data };
}

export async function getOrFetchLogo(url: string): Promise<FetchedLogo> {
  const cached = getCachedLogo(url);
  if (cached) return cached;

  const fetched = await fetchImage(url);

  db.insert(logoCache)
    .values({
      urlHash: hashUrl(url),
      url,
      contentType: fetched.contentType,
      data: fetched.data,
      fetchedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();

  return fetched;
}

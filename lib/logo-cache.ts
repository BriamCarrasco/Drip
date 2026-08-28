import { createHash } from "node:crypto";
import { Agent } from "undici";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logoCache } from "@/drizzle/schema";
import { assertPublicHttpUrl } from "@/lib/ssrf";

type FetchWithDispatcher = (
  input: string | URL,
  init?: RequestInit & { dispatcher?: Agent }
) => Promise<Response>;

function fetchWithDispatcher(
  input: string | URL,
  init?: RequestInit & { dispatcher?: Agent }
): Promise<Response> {
  return (fetch as unknown as FetchWithDispatcher)(input, init);
}

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

export type FetchedLogo = { contentType: string; data: Buffer };

async function fetchImage(rawUrl: string): Promise<FetchedLogo> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const { url: safeUrl, addresses } = await assertPublicHttpUrl(currentUrl);

    const pinnedDispatcher = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) => {
          callback(null, addresses);
        },
      },
    });

    try {
      const response = await fetchWithDispatcher(safeUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "image/*" },
        dispatcher: pinnedDispatcher,
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
    } finally {
      await pinnedDispatcher.close();
    }
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

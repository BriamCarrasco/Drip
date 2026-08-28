import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { logoCache } from "@/drizzle/schema";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  return { lookup, default: { lookup } };
});

import { lookup } from "node:dns/promises";
import { getCachedLogo, getOrFetchLogo, hashUrl } from "@/lib/logo-cache";

const lookupMock = vi.mocked(lookup);

function imageResponse(contentType = "image/png", body = new Uint8Array([1, 2, 3])) {
  return {
    status: 200,
    ok: true,
    headers: new Headers({ "content-type": contentType, "content-length": String(body.byteLength) }),
    arrayBuffer: async () => body.buffer,
  } as unknown as Response;
}

function redirectResponse(location: string) {
  return {
    status: 302,
    ok: false,
    headers: new Headers({ location }),
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response;
}

beforeEach(() => {
  db.delete(logoCache).run();
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hashUrl", () => {
  it("is deterministic and looks like a sha256 hex digest", () => {
    const a = hashUrl("https://example.com/logo.png");
    const b = hashUrl("https://example.com/logo.png");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different urls", () => {
    expect(hashUrl("https://a.com")).not.toBe(hashUrl("https://b.com"));
  });
});

describe("getCachedLogo", () => {
  it("returns null when nothing is cached for the url", () => {
    expect(getCachedLogo("https://example.com/logo.png")).toBeNull();
  });

  it("returns the cached logo when present", () => {
    db.insert(logoCache)
      .values({
        urlHash: hashUrl("https://example.com/logo.png"),
        url: "https://example.com/logo.png",
        contentType: "image/png",
        data: Buffer.from([1, 2, 3]),
        fetchedAt: "2026-08-01T00:00:00.000Z",
      })
      .run();

    const cached = getCachedLogo("https://example.com/logo.png");
    expect(cached?.contentType).toBe("image/png");
    expect(cached?.data).toEqual(Buffer.from([1, 2, 3]));
  });
});

describe("getOrFetchLogo", () => {
  it("returns the cached logo without hitting the network", async () => {
    db.insert(logoCache)
      .values({
        urlHash: hashUrl("https://example.com/logo.png"),
        url: "https://example.com/logo.png",
        contentType: "image/png",
        data: Buffer.from([1, 2, 3]),
        fetchedAt: "2026-08-01T00:00:00.000Z",
      })
      .run();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await getOrFetchLogo("https://example.com/logo.png");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches and caches a new image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));

    const result = await getOrFetchLogo("https://example.com/logo.png");

    expect(result.contentType).toBe("image/png");
    expect(getCachedLogo("https://example.com/logo.png")).not.toBeNull();
  });

  it("follows a redirect to the final image", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse("https://cdn.example.com/logo.png"))
      .mockResolvedValueOnce(imageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await getOrFetchLogo("https://example.com/logo.png");

    expect(result.contentType).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a url whose hostname resolves to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "192.168.1.5", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn());

    await expect(getOrFetchLogo("https://internal.example.com/logo.png")).rejects.toThrow(
      "No se permiten direcciones de red internas."
    );
  });

  it("rejects a literal private IPv4 address without needing DNS", async () => {
    await expect(getOrFetchLogo("http://127.0.0.1/logo.png")).rejects.toThrow(
      "No se permiten direcciones de red internas."
    );
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) protocol", async () => {
    await expect(getOrFetchLogo("ftp://example.com/logo.png")).rejects.toThrow(
      "Solo se permiten URLs http o https."
    );
  });

  it("rejects an invalid URL", async () => {
    await expect(getOrFetchLogo("not a url")).rejects.toThrow("URL inválida.");
  });

  it("rejects a response that is not an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response)
    );

    await expect(getOrFetchLogo("https://example.com/page.html")).rejects.toThrow(
      "La URL no apunta a una imagen."
    );
  });

  it("rejects an image declared larger than the size limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({ "content-type": "image/png", "content-length": String(600 * 1024) }),
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response)
    );

    await expect(getOrFetchLogo("https://example.com/huge.png")).rejects.toThrow(
      "La imagen es demasiado grande."
    );
  });

  it("gives up after too many redirects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redirectResponse("https://example.com/logo.png")));

    await expect(getOrFetchLogo("https://example.com/logo.png")).rejects.toThrow(
      "Demasiadas redirecciones."
    );
  });
});

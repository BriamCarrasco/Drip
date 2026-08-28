import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logo-cache", () => ({ getOrFetchLogo: vi.fn() }));

import { auth } from "@/auth";
import { getOrFetchLogo } from "@/lib/logo-cache";
import { GET } from "./route";

const authMock = vi.mocked(auth);
const getOrFetchLogoMock = vi.mocked(getOrFetchLogo);

function sessionFor(userId: number) {
  return { user: { id: String(userId) } } as Awaited<ReturnType<typeof auth>>;
}

beforeEach(() => {
  authMock.mockReset();
  getOrFetchLogoMock.mockReset();
});

describe("GET /api/logo", () => {
  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/logo?u=https://example.com/logo.png"));
    expect(response.status).toBe(401);
  });

  it("requires the u query parameter", async () => {
    authMock.mockResolvedValue(sessionFor(1));
    const response = await GET(new Request("http://localhost/api/logo"));
    expect(response.status).toBe(400);
  });

  it("returns the fetched image with security headers", async () => {
    authMock.mockResolvedValue(sessionFor(1));
    getOrFetchLogoMock.mockResolvedValue({ contentType: "image/png", data: Buffer.from([1, 2, 3]) });

    const response = await GET(new Request("http://localhost/api/logo?u=https://example.com/logo.png"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("returns a 404 when the logo cannot be fetched", async () => {
    authMock.mockResolvedValue(sessionFor(1));
    getOrFetchLogoMock.mockRejectedValue(new Error("No se permiten direcciones de red internas."));

    const response = await GET(new Request("http://localhost/api/logo?u=http://127.0.0.1/logo.png"));

    expect(response.status).toBe(404);
  });
});

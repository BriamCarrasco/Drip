import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { headers } from "next/headers";
import { getClientIp } from "@/lib/client-ip";

const headersMock = vi.mocked(headers);

function headerBag(entries: Record<string, string>) {
  return { get: (key: string) => entries[key.toLowerCase()] ?? null } as unknown as Awaited<
    ReturnType<typeof headers>
  >;
}

beforeEach(() => {
  headersMock.mockReset();
});

describe("getClientIp", () => {
  it("uses the first x-forwarded-for entry", async () => {
    headersMock.mockResolvedValue(headerBag({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    expect(await getClientIp()).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", async () => {
    headersMock.mockResolvedValue(headerBag({ "x-real-ip": "203.0.113.9" }));
    expect(await getClientIp()).toBe("203.0.113.9");
  });

  it("returns 'unknown' when no ip header is present", async () => {
    headersMock.mockResolvedValue(headerBag({}));
    expect(await getClientIp()).toBe("unknown");
  });

  it("returns 'unknown' when headers() throws", async () => {
    headersMock.mockRejectedValue(new Error("outside request scope"));
    expect(await getClientIp()).toBe("unknown");
  });
});

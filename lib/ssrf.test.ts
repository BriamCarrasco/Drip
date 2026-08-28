import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn();
  return { lookup, default: { lookup } };
});

import { lookup } from "node:dns/promises";
import {
  assertPublicHttpUrl,
  isPrivateIpv4,
  isPrivateIpv6,
  resolvePublicAddresses,
} from "@/lib/ssrf";

const lookupMock = vi.mocked(lookup);

beforeEach(() => {
  lookupMock.mockReset();
});

describe("isPrivateIpv4", () => {
  it("flags loopback, private and link-local ranges", () => {
    expect(isPrivateIpv4("127.0.0.1")).toBe(true);
    expect(isPrivateIpv4("10.1.2.3")).toBe(true);
    expect(isPrivateIpv4("192.168.0.1")).toBe(true);
    expect(isPrivateIpv4("172.16.5.5")).toBe(true);
    expect(isPrivateIpv4("169.254.169.254")).toBe(true);
    expect(isPrivateIpv4("100.64.0.1")).toBe(true);
  });

  it("allows ordinary public addresses", () => {
    expect(isPrivateIpv4("93.184.216.34")).toBe(false);
    expect(isPrivateIpv4("8.8.8.8")).toBe(false);
  });
});

describe("isPrivateIpv6", () => {
  it("flags loopback, ULA and link-local", () => {
    expect(isPrivateIpv6("::1")).toBe(true);
    expect(isPrivateIpv6("fe80::1")).toBe(true);
    expect(isPrivateIpv6("fd00::1")).toBe(true);
    expect(isPrivateIpv6("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public v6", () => {
    expect(isPrivateIpv6("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });
});

describe("resolvePublicAddresses", () => {
  it("returns null when any resolved address is private", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    expect(await resolvePublicAddresses("example.com")).toBeNull();
  });

  it("returns pinned addresses when all are public", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    expect(await resolvePublicAddresses("example.com")).toEqual([
      { address: "93.184.216.34", family: 4 },
    ]);
  });

  it("does not hit DNS for a literal address", async () => {
    expect(await resolvePublicAddresses("127.0.0.1")).toBeNull();
    expect(lookupMock).not.toHaveBeenCalled();
  });
});

describe("assertPublicHttpUrl", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertPublicHttpUrl("ftp://example.com")).rejects.toThrow(/http o https/);
  });

  it("rejects non-standard ports", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertPublicHttpUrl("http://example.com:22/")).rejects.toThrow(/Puerto/);
  });

  it("rejects hosts that resolve to internal addresses", async () => {
    lookupMock.mockResolvedValue([{ address: "192.168.1.1", family: 4 }]);
    await expect(assertPublicHttpUrl("http://internal.example.com/")).rejects.toThrow(/red internas/);
  });

  it("accepts a public https url on the default port", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const { url } = await assertPublicHttpUrl("https://example.com/logo.png");
    expect(url.hostname).toBe("example.com");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { revalidateSettingsPaths, revalidateSubscriptionPaths } from "@/lib/revalidate";

const revalidatePathMock = vi.mocked(revalidatePath);

describe("revalidateSubscriptionPaths", () => {
  it("revalidates every page that shows subscription data", () => {
    revalidatePathMock.mockClear();
    revalidateSubscriptionPaths();
    expect(revalidatePathMock.mock.calls.map(([path]) => path)).toEqual([
      "/",
      "/suscripciones",
      "/calendario",
      "/estadisticas",
    ]);
  });
});

describe("revalidateSettingsPaths", () => {
  it("revalidates every page affected by a settings change", () => {
    revalidatePathMock.mockClear();
    revalidateSettingsPaths();
    expect(revalidatePathMock.mock.calls.map(([path]) => path)).toEqual(["/configuracion", "/", "/estadisticas"]);
  });
});

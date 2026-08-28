import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getStoredThemePreference, resolveTheme, setThemePreference } from "@/lib/theme";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches, media: "", addEventListener: vi.fn(), removeEventListener: vi.fn() })
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStoredThemePreference", () => {
  it("defaults to system when nothing is stored", () => {
    expect(getStoredThemePreference()).toBe("system");
  });

  it("returns a validly stored preference", () => {
    window.localStorage.setItem("theme", "dark");
    expect(getStoredThemePreference()).toBe("dark");
  });

  it("falls back to system for a garbage stored value", () => {
    window.localStorage.setItem("theme", "purple");
    expect(getStoredThemePreference()).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves an explicit light/dark preference as-is", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves system preference using the OS color scheme", () => {
    mockMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
    mockMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("applyTheme / setThemePreference", () => {
  it("toggles the dark class on the html element", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists the preference and applies it", () => {
    setThemePreference("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

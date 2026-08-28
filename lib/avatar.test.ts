import { describe, expect, it } from "vitest";
import { getAvatarStyle } from "@/lib/avatar";

describe("getAvatarStyle", () => {
  it("uses the uppercase first letter of the name", () => {
    expect(getAvatarStyle("netflix").letter).toBe("N");
  });

  it("is deterministic for the same name", () => {
    expect(getAvatarStyle("Spotify")).toEqual(getAvatarStyle("Spotify"));
  });

  it("picks a color/background pair from the palette", () => {
    const style = getAvatarStyle("Notion");
    expect(style.bg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(style.color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

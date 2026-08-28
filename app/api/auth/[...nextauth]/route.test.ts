import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("auth route handlers", () => {
  it("re-exports next-auth's GET and POST handlers", () => {
    expect(typeof GET).toBe("function");
    expect(typeof POST).toBe("function");
  });
});

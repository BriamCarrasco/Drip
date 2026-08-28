import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  return { execFile, default: { execFile } };
});

import { execFile } from "node:child_process";
import { sendNotification } from "@/lib/apprise";

const execFileMock = vi.mocked(execFile);

afterEach(() => {
  execFileMock.mockReset();
});

describe("sendNotification", () => {
  it("resolves true when the apprise CLI succeeds", async () => {
    execFileMock.mockImplementation(((...args: unknown[]) => {
      const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    }) as typeof execFile);

    const ok = await sendNotification({ url: "tgram://token/chat", title: "Hola", body: "Mundo" });

    expect(ok).toBe(true);
    expect(execFileMock).toHaveBeenCalledWith(
      "apprise",
      ["-t", "Hola", "-b", "Mundo", "tgram://token/chat"],
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function)
    );
  });

  it("resolves false when the apprise CLI fails", async () => {
    execFileMock.mockImplementation(((...args: unknown[]) => {
      const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
      callback(new Error("boom"), "", "invalid url");
      return {} as ReturnType<typeof execFile>;
    }) as typeof execFile);

    const ok = await sendNotification({ url: "bad://", title: "Hola", body: "Mundo" });

    expect(ok).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _getTrackedKeyCountForTests,
  clearAttempts,
  getLockRemainingMs,
  registerFailedAttempt,
} from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit", () => {
  it("does not lock before reaching the maximum attempts", () => {
    const key = "user-a";
    for (let i = 0; i < 4; i++) registerFailedAttempt(key);
    expect(getLockRemainingMs(key)).toBe(0);
  });

  it("locks the key after the maximum number of failed attempts within the window", () => {
    const key = "user-b";
    for (let i = 0; i < 5; i++) registerFailedAttempt(key);
    expect(getLockRemainingMs(key)).toBeGreaterThan(0);
  });

  it("releases the lock once the lock duration has elapsed", () => {
    const key = "user-c";
    for (let i = 0; i < 5; i++) registerFailedAttempt(key);
    expect(getLockRemainingMs(key)).toBeGreaterThan(0);

    vi.advanceTimersByTime(16 * 60 * 1000);

    expect(getLockRemainingMs(key)).toBe(0);
  });

  it("resets the attempt count once the tracking window has elapsed without a lock", () => {
    const key = "user-d";
    for (let i = 0; i < 3; i++) registerFailedAttempt(key);

    vi.advanceTimersByTime(16 * 60 * 1000);
    registerFailedAttempt(key);
    registerFailedAttempt(key);

    expect(getLockRemainingMs(key)).toBe(0);
  });

  it("clearAttempts removes any tracked state for the key", () => {
    const key = "user-e";
    for (let i = 0; i < 5; i++) registerFailedAttempt(key);
    clearAttempts(key);
    expect(getLockRemainingMs(key)).toBe(0);
  });

  it("prunes stale entries once tracked keys grow past the cap, preventing unbounded growth", () => {
    for (let i = 0; i < 1001; i++) registerFailedAttempt(`stale-${i}`);
    const afterFill = _getTrackedKeyCountForTests();

    vi.advanceTimersByTime(16 * 60 * 1000);
    registerFailedAttempt("trigger-prune");
    const afterPrune = _getTrackedKeyCountForTests();

    expect(afterPrune).toBeLessThan(afterFill);
  });

  it("does not prune an entry that is still actively locked", () => {
    for (let i = 0; i < 5; i++) registerFailedAttempt("still-locked");
    for (let i = 0; i < 1001; i++) registerFailedAttempt(`filler-${i}`);

    vi.advanceTimersByTime(5 * 60 * 1000);
    registerFailedAttempt("trigger-prune-2");

    expect(getLockRemainingMs("still-locked")).toBeGreaterThan(0);
  });
});

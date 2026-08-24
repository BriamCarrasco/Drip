type Attempt = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, Attempt>();

export function getLockRemainingMs(key: string): number {
  const entry = attempts.get(key);
  if (!entry?.lockedUntil) return 0;

  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    attempts.delete(key);
    return 0;
  }
  return remaining;
}

export function registerFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

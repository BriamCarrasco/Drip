import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { clearAttempts, getLockRemainingMs, registerFailedAttempt } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$hVHLqWA8TzLsgu.y5HrZPugdrow77oGsqMRNIr1yPfRe7BT4Bnj26";

export type VerifiedUser = { id: string; username: string };

export function loginRateLimitKeys(username: string, ip?: string | null): string[] {
  const keys = [`user:${username.toLowerCase()}`];
  if (ip && ip !== "unknown") keys.push(`ip:${ip}`);
  return keys;
}

export function isLoginLocked(username: string, ip?: string | null): number {
  let max = 0;
  for (const key of loginRateLimitKeys(username, ip)) {
    max = Math.max(max, getLockRemainingMs(key));
  }
  return max;
}

export async function verifyCredentials(
  username: string,
  password: string,
  ip?: string | null
): Promise<VerifiedUser | null> {
  const keys = loginRateLimitKeys(username, ip);

  if (keys.some((key) => getLockRemainingMs(key) > 0)) return null;

  const user = db.select().from(users).where(eq(users.username, username)).get();

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    keys.forEach(registerFailedAttempt);
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    keys.forEach(registerFailedAttempt);
    return null;
  }

  keys.forEach(clearAttempts);
  return { id: String(user.id), username: user.username };
}

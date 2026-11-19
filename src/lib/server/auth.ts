import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb, schema as s } from "@/db";

export const SESSION_COOKIE = "ft_session";
/** Sessions slide: each use within the last 30 days extends to 90 days. Keeps the installed PWA logged in. */
const SESSION_DAYS = 90;
const REFRESH_AFTER_DAYS = 30;
const DAY = 86_400_000;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, userAgent?: string | null): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.insert(s.sessions).values({ id: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) ?? null });
  // Opportunistic cleanup of expired sessions for this user.
  await db.delete(s.sessions).where(and(eq(s.sessions.userId, userId), lt(s.sessions.expiresAt, new Date())));
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Reads the session from the cookie (web/PWA) or `Authorization: Bearer` (future native app). */
async function readToken(): Promise<string | null> {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await readToken();
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const id = hashToken(token);
  const [row] = await db
    .select({ id: s.users.id, email: s.users.email, name: s.users.name, expiresAt: s.sessions.expiresAt })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.id, id), gt(s.sessions.expiresAt, new Date())));
  if (!row) return null;
  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS - REFRESH_AFTER_DAYS) * DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await db.update(s.sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(s.sessions.id, id));
    try {
      await setSessionCookie(token, expiresAt);
    } catch {
      // Cookies are read-only in Server Components; the next route-handler call will refresh it.
    }
  }
  return { id: row.id, email: row.email, name: row.name };
}

export async function destroySession() {
  const token = await readToken();
  if (token) {
    const db = await getDb();
    await db.delete(s.sessions).where(eq(s.sessions.id, hashToken(token)));
  }
  (await cookies()).delete(SESSION_COOKIE);
}

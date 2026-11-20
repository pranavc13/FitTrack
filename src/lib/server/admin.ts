import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, type Db } from "@/db";
import { ApiError, checkOrigin, errorResponse } from "./api";
import { rateLimit } from "./rate-limit";

/**
 * Owner-only admin access, separate from app accounts: ADMIN_EMAIL + a password checked against
 * ADMIN_PASSWORD_HASH ("<salt hex>:<scrypt hex>", no `$` so .env expansion can't mangle it).
 * A successful login sets a short-lived HMAC-signed cookie scoped to the admin API.
 */
export const ADMIN_COOKIE = "ft_admin";
const ADMIN_HOURS = 8;

export const adminConfigured = () => Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.AUTH_SECRET);

export function hashAdminPassword(password: string, saltHex: string) {
  return `${saltHex}:${scryptSync(password, Buffer.from(saltHex, "hex"), 32).toString("hex")}`;
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function verifyAdminCredentials(email: string, password: string) {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [salt] = stored.split(":");
  const passwordOk = Boolean(salt) && safeEqual(hashAdminPassword(password, salt!), stored);
  const emailOk = safeEqual(email.trim().toLowerCase(), (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase());
  return passwordOk && emailOk;
}

const sign = (payload: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(`admin:${payload}`).digest("base64url");

export function adminCookie() {
  const exp = Date.now() + ADMIN_HOURS * 3_600_000;
  const payload = `${(process.env.ADMIN_EMAIL ?? "").toLowerCase()}|${exp}`;
  return { value: `${exp}.${sign(payload)}`, expires: new Date(exp) };
}

function isAdmin(req: NextRequest) {
  if (!adminConfigured()) return false;
  const [exp, sig] = (req.cookies.get(ADMIN_COOKIE)?.value ?? "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`${process.env.ADMIN_EMAIL!.toLowerCase()}|${exp}`));
}

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

/** Wraps an admin-only route: CSRF check, admin cookie, rate limit and error mapping. */
export function adminRoute<P = Record<string, string>>(handler: (ctx: { req: NextRequest; db: Db; params: P }) => Promise<unknown>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      checkOrigin(req);
      if (!adminConfigured()) throw new ApiError(503, "Admin access isn't configured on this server");
      if (!isAdmin(req)) throw new ApiError(401, "Admin sign-in required");
      const db = await getDb();
      await rateLimit(db, `admin:${clientIp(req)}`, 120);
      const result = await handler({ req, db, params: (await context.params) ?? ({} as P) });
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

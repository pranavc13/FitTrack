import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { getDb } from "@/db";
import { ADMIN_COOKIE, adminConfigured, adminCookie, clientIp, verifyAdminCredentials } from "@/lib/server/admin";
import { ApiError, body, checkOrigin, errorResponse } from "@/lib/server/api";
import { rateLimit } from "@/lib/server/rate-limit";

const Input = z.object({ email: z.string().max(200), password: z.string().min(1).max(200) });
const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/v1/admin" };

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (!adminConfigured()) throw new ApiError(503, "Admin access isn't configured on this server");
    const db = await getDb();
    // Brute-force protection: 8 attempts per IP per 15 minutes.
    await rateLimit(db, `admin-login:${clientIp(req)}`, 8, 900);
    const input = await body(req, Input);
    if (!verifyAdminCredentials(input.email, input.password)) throw new ApiError(401, "Incorrect admin email or password");
    const { value, expires } = adminCookie();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, value, { ...cookieOpts, expires });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "", { ...cookieOpts, maxAge: 0 });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

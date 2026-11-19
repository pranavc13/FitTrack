import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { createSession, hashPassword, setSessionCookie } from "@/lib/server/auth";
import { ApiError, body, errorResponse } from "@/lib/server/api";
import { rateLimit } from "@/lib/server/rate-limit";

const Input = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  timezone: z.string().max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await rateLimit(db, `signup:${ip}`, 5, 600);
    const input = await body(req, Input);
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${input.email.toLowerCase()}`);
    if (exists) throw new ApiError(409, "An account with this email already exists");
    const [user] = await db.insert(s.users).values({ name: input.name, email: input.email.toLowerCase(), passwordHash: await hashPassword(input.password) }).returning();
    let tz = "Asia/Kolkata";
    try {
      if (input.timezone) {
        new Intl.DateTimeFormat("en", { timeZone: input.timezone });
        tz = input.timezone;
      }
    } catch {
      /* invalid tz: keep default */
    }
    await db.insert(s.userPreferences).values({ userId: user!.id, timezone: tz }).onConflictDoNothing();
    const { token, expiresAt } = await createSession(user!.id, req.headers.get("user-agent"));
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ user: { id: user!.id, name: user!.name, email: user!.email }, token });
  } catch (e) {
    return errorResponse(e);
  }
}

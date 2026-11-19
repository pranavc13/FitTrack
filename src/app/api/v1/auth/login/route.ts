import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { createSession, dummyHash, setSessionCookie, verifyPassword } from "@/lib/server/auth";
import { ApiError, body, errorResponse } from "@/lib/server/api";
import { rateLimit } from "@/lib/server/rate-limit";

const Input = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const input = await body(req, Input);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    // Brute-force protection per IP and per account.
    await rateLimit(db, `login:${ip}`, 20, 600);
    await rateLimit(db, `login:${input.email.toLowerCase()}`, 10, 600);
    const [user] = await db.select().from(s.users).where(sql`lower(${s.users.email}) = ${input.email.toLowerCase()}`);
    // Constant-ish work whether or not the user exists.
    const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !ok) throw new ApiError(401, "Incorrect email or password");
    const { token, expiresAt } = await createSession(user.id, req.headers.get("user-agent"));
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (e) {
    return errorResponse(e);
  }
}

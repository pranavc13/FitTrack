import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { createSession, SESSION_COOKIE } from "@/lib/server/auth";
import { finishGoogleAuth, GOOGLE_STATE_COOKIE, publicOrigin, type GoogleOAuthState } from "@/lib/server/google";
import { rateLimit } from "@/lib/server/rate-limit";

/**
 * Google redirects here. Signs in the account linked to this Google id; otherwise links an existing
 * account with the same (Google-verified) email; otherwise creates a new account and starts onboarding.
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(code)}`);
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/v1/auth/google" });
    return res;
  };
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return fail(q.get("error") === "access_denied" ? "google_cancelled" : "google_failed");
  let st: GoogleOAuthState;
  try {
    st = JSON.parse(req.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "");
  } catch {
    return fail("google_expired");
  }
  const code = q.get("code");
  if (!code || !st?.state || q.get("state") !== st.state) return fail("google_expired");

  try {
    const db = await getDb();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await rateLimit(db, `google:${ip}`, 20, 600);
    const g = await finishGoogleAuth(origin, code, st);

    let [user] = await db.select().from(s.users).where(eq(s.users.googleSub, g.sub));
    if (!user) {
      [user] = await db.select().from(s.users).where(sql`lower(${s.users.email}) = ${g.email}`);
      if (user) {
        [user] = await db.update(s.users).set({ googleSub: g.sub, avatarUrl: user.avatarUrl ?? g.picture, updatedAt: new Date() }).where(eq(s.users.id, user.id)).returning();
      } else {
        [user] = await db.insert(s.users).values({ email: g.email, name: g.name, googleSub: g.sub, avatarUrl: g.picture, passwordHash: null }).returning();
        let tz = "Asia/Kolkata";
        try {
          if (st.tz) {
            new Intl.DateTimeFormat("en", { timeZone: st.tz });
            tz = st.tz;
          }
        } catch {
          /* invalid tz: keep default */
        }
        await db.insert(s.userPreferences).values({ userId: user!.id, timezone: tz }).onConflictDoNothing();
      }
    }
    const [profile] = await db.select({ onboardedAt: s.userProfiles.onboardedAt }).from(s.userProfiles).where(eq(s.userProfiles.userId, user!.id));
    const { token, expiresAt } = await createSession(user!.id, req.headers.get("user-agent"));
    const res = NextResponse.redirect(`${origin}${profile?.onboardedAt ? (st.next ?? "/home") : "/onboarding"}`);
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/v1/auth/google" });
    return res;
  } catch (e) {
    console.error("[google-auth]", e);
    return fail("google_failed");
  }
}

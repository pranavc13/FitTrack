import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, googleConfigured, publicOrigin, startGoogleAuth } from "@/lib/server/google";

/** Starts "Sign in with Google": remembers state/PKCE in a short-lived cookie and redirects to Google. */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req);
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  const next = req.nextUrl.searchParams.get("next");
  const tz = req.nextUrl.searchParams.get("tz");
  const { url, cookie } = startGoogleAuth(origin, { next: next?.startsWith("/") && !next.startsWith("//") ? next : null, tz: tz?.slice(0, 60) ?? null });
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify(cookie), { httpOnly: true, secure: origin.startsWith("https://"), sameSite: "lax", path: "/api/v1/auth/google", maxAge: 600 });
  return res;
}

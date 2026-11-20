import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";

/**
 * "Sign in with Google" (OpenID Connect, authorization-code flow with PKCE).
 * Needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from a Google Cloud "OAuth client ID" (Web application)
 * whose Authorized redirect URI is `<origin>/api/v1/auth/google/callback`.
 */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_STATE_COOKIE = "ft_google_oauth";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Public origin for the redirect URI: APP_URL when the request comes from that host, else the request's own host. */
export function publicOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const fromRequest = `${proto}://${host}`;
  const app = process.env.APP_URL?.replace(/\/$/, "");
  return app && new URL(app).host === host ? app : fromRequest;
}

export const redirectUri = (origin: string) => `${origin}/api/v1/auth/google/callback`;

const b64url = (buf: Buffer) => buf.toString("base64url");

export interface GoogleOAuthState {
  state: string;
  nonce: string;
  verifier: string;
  next: string | null;
  tz: string | null;
}

export function startGoogleAuth(origin: string, opts: { next: string | null; tz: string | null }) {
  const st: GoogleOAuthState = { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), ...opts };
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state: st.state,
    nonce: st.nonce,
    code_challenge: b64url(createHash("sha256").update(st.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: `${AUTH_URL}?${params}`, cookie: st };
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Exchanges the code and validates the ID token claims (received directly from Google over TLS). */
export async function finishGoogleAuth(origin: string, code: string, st: GoogleOAuthState): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: st.verifier,
    }),
  });
  const tokens = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !tokens.id_token) throw new ApiError(400, `Google sign-in failed: ${tokens.error_description ?? tokens.error ?? res.status}`);
  const payload = tokens.id_token.split(".")[1];
  const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new ApiError(400, "Google sign-in failed: wrong audience");
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") throw new ApiError(400, "Google sign-in failed: wrong issuer");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new ApiError(400, "Google sign-in failed: token expired");
  if (claims.nonce !== st.nonce) throw new ApiError(400, "Google sign-in failed: please try again");
  if (claims.email_verified !== true || typeof claims.email !== "string") throw new ApiError(400, "Your Google account email isn't verified");
  return {
    sub: String(claims.sub),
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : claims.email.split("@")[0]!,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod/v4";
import { getDb, type Db } from "@/db";
import { getSessionUser, type SessionUser } from "./auth";
import { rateLimit } from "./rate-limit";

import { ApiError } from "@/lib/errors";

export { ApiError, notFound } from "@/lib/errors";

export interface Ctx<P = Record<string, string>> {
  req: NextRequest;
  user: SessionUser;
  db: Db;
  params: P;
}

interface Options {
  /** Requests per minute per user for this route. */
  limit?: number;
  auth?: boolean;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF protection for cookie-authenticated mutations: the Origin (or Referer) must match the host.
 * Bearer-token requests (native clients) are exempt because browsers never attach them implicitly.
 */
function checkOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method) || req.headers.get("authorization")?.startsWith("Bearer ")) return;
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) throw new ApiError(403, "Missing origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Bad origin");
  }
  if (originHost !== host) throw new ApiError(403, "Cross-origin request blocked");
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  if (e instanceof RangeError) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error("[api]", e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Wraps an authenticated route handler with auth, CSRF, rate limiting and error mapping. */
export function route<P = Record<string, string>>(
  handler: (ctx: Ctx<P>) => Promise<unknown>,
  opts: Options = {},
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      checkOrigin(req);
      const user = await getSessionUser();
      if (!user) throw new ApiError(401, "Not signed in");
      const db = await getDb();
      await rateLimit(db, `u:${user.id}:${req.nextUrl.pathname.split("/").slice(0, 5).join("/")}:${req.method}`, opts.limit ?? 120);
      const params = (await context.params) ?? ({} as P);
      const result = await handler({ req, user, db, params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function body<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Body must be JSON");
  }
  return schema.parse(json);
}

export function query<T extends z.ZodType>(req: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const zId = z.coerce.number().int().positive();

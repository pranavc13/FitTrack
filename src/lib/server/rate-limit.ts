import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { rowsOf } from "@/db/client";
import * as s from "@/db/schema";
import { ApiError } from "@/lib/errors";

/**
 * Fixed one-minute window counter stored in Postgres (works across serverless instances).
 * A single upsert increments the counter and resets it when the window has passed.
 */
export async function rateLimit(db: Db, key: string, perMinute: number, windowSec = 60) {
  const rows = (await db.execute(sql`
    INSERT INTO ${s.rateLimits} (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN ${s.rateLimits.resetAt} < now() THEN 1 ELSE ${s.rateLimits.count} + 1 END,
      reset_at = CASE WHEN ${s.rateLimits.resetAt} < now() THEN now() + make_interval(secs => ${windowSec}) ELSE ${s.rateLimits.resetAt} END
    RETURNING count`));
  const count = Number(rowsOf<{ count: number }>(rows)[0]?.count ?? 0);
  if (count > perMinute) throw new ApiError(429, "Too many requests — please slow down");
}

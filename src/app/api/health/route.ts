import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Liveness ping. Supabase pg_cron calls this every few minutes so a server instance and its database
 * connection stay warm, so the first tap after a quiet spell doesn't wait on a cold start. Public and cheap:
 * it reveals nothing beyond "up".
 */
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

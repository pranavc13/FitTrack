import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { sendDueReminders } from "@/lib/services/push";

/**
 * Called every 15 min by a scheduler. In production that's Supabase pg_cron + pg_net, because Vercel's Hobby
 * plan only allows daily crons. Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await sendDueReminders(await getDb()));
}

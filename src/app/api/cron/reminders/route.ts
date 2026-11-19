import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { sendDueReminders } from "@/lib/services/push";

/** Called by a scheduler (e.g. Vercel Cron, every 15 min). Requires `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await sendDueReminders(await getDb()));
}

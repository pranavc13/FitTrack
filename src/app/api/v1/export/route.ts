import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { query, route, zDate } from "@/lib/server/api";
import { exportCsv } from "@/lib/services/reports";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ kind: z.enum(["daily", "food", "activity", "weight", "measurements"]), from: zDate.optional(), to: zDate.optional() }));
  const from = q.from ?? addDays(today, -89);
  const to = q.to ?? today;
  const csv = await exportCsv(db, user.id, q.kind, from, to);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fittrack-${q.kind}-${from}-to-${to}.csv"`, "Cache-Control": "no-store" } });
}, { limit: 30 });

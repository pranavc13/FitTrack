import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { query, route, zDate } from "@/lib/server/api";
import { buildReport, reportPdf, weeklyReport } from "@/lib/services/reports";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ kind: z.enum(["daily", "weekly", "monthly", "transformation", "custom"]).default("weekly"), date: zDate.optional(), from: zDate.optional(), to: zDate.optional(), format: z.enum(["json", "pdf"]).default("json") }));
  const date = q.date ?? today;
  let report;
  let title: string;
  if (q.kind === "weekly") {
    report = await weeklyReport(db, user.id, date);
    title = "Weekly report";
  } else if (q.kind === "daily") {
    report = await buildReport(db, user.id, date, date);
    title = "Daily report";
  } else if (q.kind === "monthly") {
    const monthStart = date.slice(0, 8) + "01";
    const monthEnd = addDays(addDays(monthStart, 32).slice(0, 8) + "01", -1);
    report = await buildReport(db, user.id, monthStart, monthEnd < today ? monthEnd : today);
    title = "Monthly report";
  } else if (q.kind === "transformation") {
    report = await buildReport(db, user.id, q.from ?? addDays(today, -180), q.to ?? today);
    title = "Transformation report";
  } else {
    report = await buildReport(db, user.id, q.from ?? addDays(today, -29), q.to ?? today);
    title = "Progress report";
  }
  if (q.format === "pdf") {
    const pdf = await reportPdf(report, title);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="fittrack-${q.kind}-${report.from}.pdf"`, "Cache-Control": "no-store" } });
  }
  return { title, report };
});

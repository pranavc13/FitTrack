import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { addDays, weekStart } from "@/lib/dates";
import { round } from "@/lib/nutrition/engine";
import { getRange } from "./summary";
import { weightHistory, measurementHistory } from "./body";
import { workoutHistory } from "./workouts";
import { getProfileBundle } from "./profile";
import { listMilestones } from "./milestones";

export async function buildReport(db: Db, userId: string, from: string, to: string) {
  const [days, weights, measures, workouts, bundle, milestones] = await Promise.all([
    getRange(db, userId, from, to),
    weightHistory(db, userId, 730),
    measurementHistory(db, userId),
    workoutHistory(db, userId, from),
    getProfileBundle(db, userId),
    listMilestones(db, userId),
  ]);
  const logged = days.filter((d) => d.logged);
  const avg = (k: keyof (typeof days)[number], list = logged) => (list.length ? round(list.reduce((a, d) => a + Number(d[k]), 0) / list.length, 0) : null);
  const w = weights.filter((x) => x.date >= from && x.date <= to);
  const m = measures.filter((x) => x.date >= from && x.date <= to && x.waistCm != null);
  const t = bundle.targets;
  return {
    from,
    to,
    name: bundle.user?.name ?? "",
    daysInPeriod: days.length,
    daysLogged: logged.length,
    nutrition: { avgKcal: avg("kcalIn"), avgProteinG: avg("proteinG"), avgCarbsG: avg("carbsG"), avgFatG: avg("fatG"), avgFibreG: avg("fibreG"), targetKcal: t?.calories ?? null, targetProteinG: t?.proteinG ?? null, daysWithinCalorieTarget: t ? logged.filter((d) => Math.abs(d.kcalIn - t.calories) <= t.calories * 0.1).length : null, daysProteinMet: t ? logged.filter((d) => d.proteinG >= t.proteinG * 0.9).length : null },
    energy: { avgEstimatedExpenditure: avg("expenditure", logged), avgBalance: logged.length ? round(logged.reduce((a, d) => a + d.kcalIn - d.expenditure, 0) / logged.length, 0) : null },
    activity: { avgSteps: avg("steps", days), totalExerciseMin: round(days.reduce((a, d) => a + d.exerciseMinutes, 0), 0), activeDays: days.filter((d) => d.exerciseMinutes >= 20).length, workouts: workouts.filter((x) => String(x.date) <= to).length },
    wellness: { avgWaterMl: avg("waterMl", days.filter((d) => d.waterMl > 0)), avgSleepH: (() => { const sl = days.filter((d) => d.sleepMin > 0); return sl.length ? round(sl.reduce((a, d) => a + d.sleepMin, 0) / sl.length / 60, 1) : null; })() },
    body: {
      weightStart: w[0]?.weightKg ?? null,
      weightEnd: w.at(-1)?.weightKg ?? null,
      trendChange: w.length >= 2 ? round(w.at(-1)!.trendKg - w[0]!.trendKg, 2) : null,
      waistStart: m[0]?.waistCm ?? null,
      waistEnd: m.at(-1)?.waistCm ?? null,
    },
    milestones: milestones.filter((x) => x.achievedAt.toISOString().slice(0, 10) >= from && x.achievedAt.toISOString().slice(0, 10) <= to).map((x) => x.title),
    days,
  };
}

export async function weeklyReport(db: Db, userId: string, anyDate: string) {
  const start = weekStart(anyDate);
  const report = await buildReport(db, userId, start, addDays(start, 6));
  await db
    .insert(s.weeklyReports)
    .values({ userId, weekStart: start, data: report as unknown as Record<string, unknown> })
    .onConflictDoUpdate({ target: [s.weeklyReports.userId, s.weeklyReports.weekStart], set: { data: report as unknown as Record<string, unknown>, createdAt: new Date() } });
  return report;
}

const csvCell = (v: unknown) => {
  const str = v == null ? "" : String(v);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n");
}

export async function exportCsv(db: Db, userId: string, kind: "daily" | "food" | "activity" | "weight" | "measurements", from: string, to: string) {
  switch (kind) {
    case "daily":
      return toCsv((await getRange(db, userId, from, to)).map((d) => ({ ...d, kcalIn: round(d.kcalIn, 0), expenditure: round(d.expenditure, 0), exerciseNetKcal: round(d.exerciseNetKcal, 0) })));
    case "food": {
      const rows = await db
        .select({ date: s.meals.date, meal: s.meals.mealType, food: s.mealEntries.name, quantity: s.mealEntries.quantity, unit: s.mealEntries.unit, grams: s.mealEntries.grams, kcal: s.mealEntries.kcal, protein_g: s.mealEntries.proteinG, carbs_g: s.mealEntries.carbsG, fat_g: s.mealEntries.fatG, fibre_g: s.mealEntries.fibreG, sugar_g: s.mealEntries.sugarG, sodium_mg: s.mealEntries.sodiumMg, data_quality: s.mealEntries.dataQuality, source: s.mealEntries.source })
        .from(s.mealEntries)
        .innerJoin(s.meals, eq(s.meals.id, s.mealEntries.mealId))
        .where(and(eq(s.mealEntries.userId, userId), gte(s.meals.date, from), lte(s.meals.date, to)))
        .orderBy(asc(s.meals.date));
      return toCsv(rows.map((r) => ({ ...r, kcal: round(r.kcal, 0), protein_g: round(r.protein_g, 1), carbs_g: round(r.carbs_g, 1), fat_g: round(r.fat_g, 1) })));
    }
    case "activity": {
      const rows = await db.select().from(s.activityLogs).where(and(eq(s.activityLogs.userId, userId), gte(s.activityLogs.date, from), lte(s.activityLogs.date, to))).orderBy(asc(s.activityLogs.date));
      return toCsv(rows.map((r) => ({ date: r.date, activity: r.name, minutes: r.durationMin, distance_km: r.distanceKm, met: r.metUsed, gross_kcal_estimate: round(r.grossKcal, 0), net_kcal_estimate: round(r.netKcal, 0), device_kcal: r.deviceKcal, source: r.source })));
    }
    case "weight":
      return toCsv((await weightHistory(db, userId, 3650)).filter((w) => w.date >= from && w.date <= to).map((w) => ({ date: w.date, weight_kg: w.weightKg, trend_kg: w.trendKg, notes: w.notes })));
    case "measurements":
      return toCsv((await measurementHistory(db, userId)).filter((m) => m.date >= from && m.date <= to).map(({ id: _i, userId: _u, createdAt: _c, updatedAt: _up, ...r }) => r));
  }
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

const LIME = rgb(0.45, 0.62, 0.12);
const INK = rgb(0.1, 0.12, 0.1);
const MUTED = rgb(0.42, 0.45, 0.42);

/** Standard PDF fonts only cover WinAnsi; strip characters they cannot encode. */
const ascii = (t: string) => t.replace(/[–—]/g, "-").replace(/[≈]/g, "~").replace(/[^\x20-\x7E]/g, "");

function drawBars(page: PDFPage, font: PDFFont, x: number, y: number, w: number, h: number, values: number[], labels: string[], target: number | null, title: string) {
  page.drawText(ascii(title), { x, y: y + h + 8, size: 10, font, color: INK });
  const max = Math.max(1, ...values, target ?? 0) * 1.1;
  const bw = w / Math.max(1, values.length);
  values.forEach((v, i) => {
    const bh = (v / max) * h;
    page.drawRectangle({ x: x + i * bw + 2, y, width: Math.max(2, bw - 4), height: Math.max(0.5, bh), color: v > 0 ? LIME : rgb(0.85, 0.85, 0.85) });
    if (values.length <= 14) page.drawText(ascii(labels[i] ?? ""), { x: x + i * bw + 2, y: y - 10, size: 6, font, color: MUTED });
  });
  if (target) {
    const ty = y + (target / max) * h;
    page.drawLine({ start: { x, y: ty }, end: { x: x + w, y: ty }, thickness: 0.8, color: rgb(0.85, 0.4, 0.1), dashArray: [3, 2] });
  }
}

export async function reportPdf(report: Awaited<ReturnType<typeof buildReport>>, title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 790;
  page.drawText(ascii(title), { x: 40, y, size: 20, font: bold, color: INK });
  y -= 20;
  page.drawText(ascii(`${report.name} - ${report.from} to ${report.to} - food logged on ${report.daysLogged}/${report.daysInPeriod} days`), { x: 40, y, size: 10, font, color: MUTED });
  y -= 30;
  const line = (label: string, value: string) => {
    page.drawText(ascii(label), { x: 40, y, size: 10, font, color: MUTED });
    page.drawText(ascii(value), { x: 260, y, size: 10, font: bold, color: INK });
    y -= 16;
  };
  const section = (t: string) => {
    y -= 6;
    page.drawText(ascii(t), { x: 40, y, size: 12, font: bold, color: LIME });
    y -= 18;
  };
  const n = report.nutrition;
  section("Nutrition (averages on logged days)");
  line("Calories", n.avgKcal != null ? `${n.avgKcal} kcal${n.targetKcal ? ` (target ${n.targetKcal})` : ""}` : "No data");
  line("Protein", n.avgProteinG != null ? `${n.avgProteinG} g${n.targetProteinG ? ` (target ${n.targetProteinG} g)` : ""}` : "No data");
  line("Carbs / Fat / Fibre", n.avgCarbsG != null ? `${n.avgCarbsG} g / ${n.avgFatG} g / ${n.avgFibreG} g` : "No data");
  if (n.daysWithinCalorieTarget != null) line("Days within +/-10% of calorie target", `${n.daysWithinCalorieTarget}`);
  if (n.daysProteinMet != null) line("Days protein target met", `${n.daysProteinMet}`);
  section("Energy balance (estimated)");
  line("Avg estimated expenditure", report.energy.avgEstimatedExpenditure != null ? `${report.energy.avgEstimatedExpenditure} kcal` : "No data");
  line("Avg daily balance", report.energy.avgBalance != null ? `${report.energy.avgBalance > 0 ? "+" : ""}${report.energy.avgBalance} kcal` : "No data");
  section("Activity");
  line("Average steps", `${report.activity.avgSteps ?? 0}`);
  line("Exercise minutes (total)", `${report.activity.totalExerciseMin}`);
  line("Days with 20+ active minutes", `${report.activity.activeDays}`);
  line("Workouts", `${report.activity.workouts}`);
  section("Body");
  line("Weight", report.body.weightStart != null ? `${report.body.weightStart} -> ${report.body.weightEnd} kg` : "No weigh-ins");
  if (report.body.trendChange != null) line("Trend weight change", `${report.body.trendChange > 0 ? "+" : ""}${report.body.trendChange} kg`);
  if (report.body.waistStart != null) line("Waist", `${report.body.waistStart} -> ${report.body.waistEnd} cm`);
  section("Wellness");
  line("Average water", report.wellness.avgWaterMl != null ? `${report.wellness.avgWaterMl} ml` : "No data");
  line("Average sleep", report.wellness.avgSleepH != null ? `${report.wellness.avgSleepH} h` : "No data");
  if (report.milestones.length) {
    section("Milestones");
    for (const m of report.milestones.slice(0, 8)) line("-", m);
  }
  y -= 30;
  const recent = report.days.slice(-31);
  drawBars(page, font, 40, Math.max(80, y - 110), 515, 100, recent.map((d) => d.kcalIn), recent.map((d) => d.date.slice(8)), n.targetKcal, "Daily calories (dashed line = target)");
  page.drawText("Estimates (energy expenditure, calories burned, portion sizes) are approximations, not measurements. Not medical advice.", { x: 40, y: 30, size: 7, font, color: MUTED });
  return pdf.save();
}

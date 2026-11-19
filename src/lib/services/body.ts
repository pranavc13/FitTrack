import { and, asc, desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { addDays } from "@/lib/dates";
import { ApiError, notFound } from "@/lib/errors";
import { detectPlateau, ewma, predictWeeksToTarget } from "@/lib/analytics/trends";
import { recalculateTargets } from "./profile";
import { checkTransformationMilestones } from "./milestones";

export async function logWeight(db: Db, userId: string, date: string, weightKg: number, notes?: string | null) {
  if (!(weightKg > 20 && weightKg < 400)) throw new ApiError(400, "Weight must be between 20 and 400 kg");
  const values = { userId, date, weightKg, notes: notes ?? null, updatedAt: new Date() };
  const [row] = await db
    .insert(s.weightLogs)
    .values(values)
    .onConflictDoUpdate({ target: [s.weightLogs.userId, s.weightLogs.date], set: values })
    .returning();
  // Targets follow weight changes (unless the user set custom targets).
  try {
    await recalculateTargets(db, userId);
  } catch {
    /* profile incomplete: ignore */
  }
  await checkTransformationMilestones(db, userId);
  return row!;
}

export async function deleteWeight(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.weightLogs).where(and(eq(s.weightLogs.id, id), eq(s.weightLogs.userId, userId))).returning();
  if (!row) throw notFound("Weight entry");
}

export async function weightHistory(db: Db, userId: string, days = 365) {
  const from = addDays(new Date().toISOString().slice(0, 10), -days);
  const rows = await db
    .select()
    .from(s.weightLogs)
    .where(and(eq(s.weightLogs.userId, userId), gte(s.weightLogs.date, from)))
    .orderBy(asc(s.weightLogs.date));
  const trend = ewma(rows.map((r) => ({ date: r.date, value: r.weightKg })));
  return rows.map((r, i) => ({ id: r.id, date: r.date, weightKg: r.weightKg, trendKg: Math.round(trend[i]!.value * 100) / 100, notes: r.notes }));
}

export async function weightAnalysis(db: Db, userId: string) {
  const [profile] = await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  const history = await weightHistory(db, userId, 180);
  const points = history.map((h) => ({ date: h.date, value: h.weightKg }));
  const target = profile?.targetWeightKg ?? null;
  const current = history.at(-1)?.weightKg ?? profile?.currentWeightKg ?? null;
  const direction: "loss" | "gain" | "maintain" = target && current ? (target < current - 0.5 ? "loss" : target > current + 0.5 ? "gain" : "maintain") : "maintain";
  return {
    plateau: detectPlateau(points, direction),
    prediction: target ? predictWeeksToTarget(points, target) : null,
    direction,
    current,
    target,
  };
}

export type MeasurementInput = Partial<Pick<typeof s.bodyMeasurements.$inferInsert, "waistCm" | "chestCm" | "hipsCm" | "armCm" | "thighCm" | "neckCm" | "bodyFatPct" | "bodyFatMethod" | "notes">>;

export async function logMeasurements(db: Db, userId: string, date: string, input: MeasurementInput) {
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "number" && (v <= 0 || v > 300)) throw new ApiError(400, `${k} is out of range`);
  }
  if (input.bodyFatPct != null && (input.bodyFatPct < 2 || input.bodyFatPct > 70)) throw new ApiError(400, "Body fat % must be 2–70");
  const values = { userId, date, ...input, updatedAt: new Date() };
  const [row] = await db
    .insert(s.bodyMeasurements)
    .values(values)
    .onConflictDoUpdate({ target: [s.bodyMeasurements.userId, s.bodyMeasurements.date], set: values })
    .returning();
  await checkTransformationMilestones(db, userId);
  return row!;
}

export async function measurementHistory(db: Db, userId: string) {
  return db.select().from(s.bodyMeasurements).where(eq(s.bodyMeasurements.userId, userId)).orderBy(asc(s.bodyMeasurements.date));
}

export async function deleteMeasurement(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.bodyMeasurements).where(and(eq(s.bodyMeasurements.id, id), eq(s.bodyMeasurements.userId, userId))).returning();
  if (!row) throw notFound("Measurement");
}

export async function listPhotos(db: Db, userId: string) {
  return db.select().from(s.progressPhotos).where(eq(s.progressPhotos.userId, userId)).orderBy(desc(s.progressPhotos.date), asc(s.progressPhotos.pose));
}

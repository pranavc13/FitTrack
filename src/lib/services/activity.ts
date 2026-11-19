import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { calculateActivity } from "@/lib/activity/met";
import { ApiError, notFound } from "@/lib/errors";
import { normalizeQuery } from "./foods";
import { currentWeight } from "./profile";
import { recomputeDailySummary } from "./summary";

export async function searchActivities(db: Db, userId: string, q: string, category?: string, limit = 30) {
  const nq = normalizeQuery(q);
  const catFilter = category ? sql`AND category = ${category}` : sql``;
  const ownerFilter = sql`(owner_user_id IS NULL OR owner_user_id = ${userId})`;
  if (!nq) {
    return rowsOf(
      await db.execute(sql`SELECT id, code, name, category, met, intensity, is_proxy AS "isProxy", note, source, supports_distance AS "supportsDistance"
        FROM activity_types WHERE ${ownerFilter} ${catFilter} ORDER BY is_proxy DESC, met ASC LIMIT ${limit}`),
    );
  }
  return rowsOf(
    await db.execute(sql`SELECT id, code, name, category, met, intensity, is_proxy AS "isProxy", note, source, supports_distance AS "supportsDistance",
        word_similarity(${nq}, search_text) + CASE WHEN search_text LIKE ${nq + "%"} THEN 0.3 ELSE 0 END - length(name)/1500.0 AS score
      FROM activity_types
      WHERE ${ownerFilter} ${catFilter} AND (search_text LIKE ${"%" + nq + "%"} OR ${nq} <% search_text)
      ORDER BY score DESC LIMIT ${limit}`),
  );
}

export interface LogActivityInput {
  activityTypeId: number;
  date: string;
  durationMin: number;
  distanceKm?: number | null;
  avgHeartRate?: number | null;
  startedAt?: string | null;
  notes?: string | null;
  clientId?: string | null;
  /** Use walking/running speed to refine MET when distance is given. */
  useSpeed?: boolean;
  source?: "manual" | "workout" | "import";
  workoutId?: number | null;
  importedRecordId?: number | null;
  deviceKcal?: number | null;
  steps?: number | null;
}

export async function logActivity(db: Db, userId: string, input: LogActivityInput) {
  if (input.clientId) {
    const [dupe] = await db.select().from(s.activityLogs).where(and(eq(s.activityLogs.userId, userId), eq(s.activityLogs.clientId, input.clientId)));
    if (dupe) return dupe;
  }
  const [type] = await db
    .select()
    .from(s.activityTypes)
    .where(and(eq(s.activityTypes.id, input.activityTypeId), or(isNull(s.activityTypes.ownerUserId), eq(s.activityTypes.ownerUserId, userId))));
  if (!type) throw notFound("Activity type");
  const weight = await currentWeight(db, userId);
  if (!weight) throw new ApiError(400, "Add your body weight first — calorie estimates depend on it");
  const speedKind = input.useSpeed !== false && type.supportsDistance ? (type.category === "Running" ? "run" : type.category === "Walking" ? "walk" : null) : null;
  const calc = calculateActivity({ met: type.met, weightKg: weight, durationMin: input.durationMin, distanceKm: input.distanceKm, speedBased: speedKind });
  const [row] = await db
    .insert(s.activityLogs)
    .values({
      userId,
      activityTypeId: type.id,
      name: type.name,
      date: input.date,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      durationMin: input.durationMin,
      distanceKm: input.distanceKm ?? null,
      speedKmh: calc.speedKmh,
      avgHeartRate: input.avgHeartRate ?? null,
      steps: input.steps ?? null,
      weightKgUsed: weight,
      metUsed: calc.met,
      grossKcal: calc.grossKcal,
      netKcal: calc.netKcal,
      deviceKcal: input.deviceKcal ?? null,
      source: input.source ?? "manual",
      isEstimate: true,
      workoutId: input.workoutId ?? null,
      importedRecordId: input.importedRecordId ?? null,
      clientId: input.clientId ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  await recomputeDailySummary(db, userId, input.date);
  return row!;
}

export async function listActivities(db: Db, userId: string, from: string, to: string) {
  return db
    .select()
    .from(s.activityLogs)
    .where(and(eq(s.activityLogs.userId, userId), gte(s.activityLogs.date, from), lte(s.activityLogs.date, to)))
    .orderBy(desc(s.activityLogs.date), desc(s.activityLogs.createdAt));
}

export async function deleteActivity(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.activityLogs).where(and(eq(s.activityLogs.id, id), eq(s.activityLogs.userId, userId))).returning();
  if (!row) throw notFound("Activity");
  await recomputeDailySummary(db, userId, row.date);
}

export async function setSteps(db: Db, userId: string, date: string, steps: number, distanceKm?: number | null, source: "manual" | "import" = "manual") {
  if (!(steps >= 0 && steps < 200_000)) throw new ApiError(400, "Steps must be between 0 and 200,000");
  const values = { userId, date, steps, distanceKm: distanceKm ?? null, source, updatedAt: new Date() };
  await db.insert(s.stepLogs).values(values).onConflictDoUpdate({ target: [s.stepLogs.userId, s.stepLogs.date], set: values });
  await recomputeDailySummary(db, userId, date);
}

export async function createCustomActivity(db: Db, userId: string, input: { name: string; met: number; category: string }) {
  if (!(input.met >= 1 && input.met <= 25)) throw new ApiError(400, "MET must be between 1 and 25");
  const code = `U-${Date.now().toString(36)}`;
  const [row] = await db
    .insert(s.activityTypes)
    .values({
      code,
      name: input.name.trim(),
      category: input.category,
      met: input.met,
      intensity: input.met < 3 ? "light" : input.met < 6 ? "moderate" : "vigorous",
      source: "User-defined MET",
      ownerUserId: userId,
      searchText: normalizeQuery(input.name),
    })
    .returning();
  return row!;
}

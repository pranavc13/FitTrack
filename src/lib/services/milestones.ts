import { and, asc, eq, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { todayIn } from "@/lib/dates";
import { streak } from "@/lib/analytics/trends";

interface MilestoneDef {
  kind: string;
  title: string;
  value?: number;
}

/**
 * Evaluates consistency/transformation milestones from real records and stores newly achieved ones.
 * Returns the milestones achieved by this call.
 */
export async function checkTransformationMilestones(db: Db, userId: string): Promise<MilestoneDef[]> {
  const achieved: MilestoneDef[] = [];
  const weights = await db.select().from(s.weightLogs).where(eq(s.weightLogs.userId, userId)).orderBy(asc(s.weightLogs.date));
  const [profile] = await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  if (weights.length >= 2) {
    const start = weights[0]!.weightKg;
    const latest = weights.at(-1)!.weightKg;
    const lost = start - latest;
    const gained = latest - start;
    for (const kg of [1, 2, 5, 10, 15, 20]) {
      if (lost >= kg) achieved.push({ kind: `lost_${kg}kg`, title: `First ${kg} kg lost`, value: kg });
      if (gained >= kg && profile && ["muscle_gain", "strength"].includes(profile.primaryGoal)) achieved.push({ kind: `gained_${kg}kg`, title: `${kg} kg gained`, value: kg });
    }
    if (profile?.targetWeightKg && Math.abs(latest - profile.targetWeightKg) <= 0.5) achieved.push({ kind: "target_weight", title: "Target weight reached", value: latest });
  }
  const measures = await db.select().from(s.bodyMeasurements).where(eq(s.bodyMeasurements.userId, userId)).orderBy(asc(s.bodyMeasurements.date));
  const waists = measures.filter((m) => m.waistCm != null);
  if (waists.length >= 2) {
    const drop = waists[0]!.waistCm! - waists.at(-1)!.waistCm!;
    for (const cm of [2, 5, 10]) if (drop >= cm) achieved.push({ kind: `waist_minus_${cm}cm`, title: `Waist down ${cm} cm`, value: cm });
  }
  const loggedDays = rowsOf<{ date: string }>(
    await db.execute(sql`SELECT date::text AS date FROM daily_summaries WHERE user_id = ${userId} AND entries_count > 0`),
  ).map((r) => r.date);
  const [prefs] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  const today = todayIn(prefs?.timezone);
  const st = streak(loggedDays, today);
  for (const d of [7, 14, 30, 60, 100]) if (st >= d) achieved.push({ kind: `log_streak_${d}`, title: `${d}-day food logging streak`, value: d });
  const [w] = rowsOf<{ n: string }>(await db.execute(sql`SELECT count(*) n FROM workouts WHERE user_id = ${userId} AND ended_at IS NOT NULL`));
  for (const n of [1, 10, 25, 50, 100]) if (Number(w?.n ?? 0) >= n) achieved.push({ kind: `workouts_${n}`, title: n === 1 ? "First workout completed" : `${n} workouts completed`, value: n });
  const [pu] = rowsOf<{ n: string }>(
    await db.execute(sql`SELECT count(*) n FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id
      JOIN workouts wo ON wo.id = we.workout_id JOIN exercises e ON e.id = we.exercise_id
      WHERE wo.user_id = ${userId} AND e.slug = 'pull-up' AND es.reps >= 1 AND NOT es.is_warmup`),
  );
  if (Number(pu?.n ?? 0) > 0) achieved.push({ kind: "first_pull_up", title: "First pull-up" });

  const fresh: MilestoneDef[] = [];
  for (const m of achieved) {
    const [row] = await db
      .insert(s.transformationMilestones)
      .values({ userId, kind: m.kind, title: m.title, value: m.value ?? null, achievedAt: new Date() })
      .onConflictDoNothing()
      .returning();
    if (row) fresh.push(m);
  }
  return fresh;
}

export async function listMilestones(db: Db, userId: string) {
  return db.select().from(s.transformationMilestones).where(and(eq(s.transformationMilestones.userId, userId))).orderBy(asc(s.transformationMilestones.achievedAt));
}

import { and, asc, between, eq, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { dateRange } from "@/lib/dates";

export type DailySummary = typeof s.dailySummaries.$inferSelect;

/**
 * Recomputes the cached aggregate for one day from source records.
 * Energy out = baseline (BMR × lifestyle factor, from targets) + net exercise kcal from logged
 * activities. Steps and device-reported calories are stored for display only (no double counting).
 */
export async function recomputeDailySummary(db: Db, userId: string, date: string): Promise<DailySummary> {
  const [food] = rowsOf<Record<string, string | null>>(
    await db.execute(sql`
      SELECT coalesce(sum(kcal),0) kcal, coalesce(sum(protein_g),0) protein, coalesce(sum(carbs_g),0) carbs,
             coalesce(sum(fat_g),0) fat, coalesce(sum(fibre_g),0) fibre, coalesce(sum(sugar_g),0) sugar,
             coalesce(sum(sodium_mg),0) sodium, count(*) n
      FROM meal_entries me JOIN meals m ON m.id = me.meal_id
      WHERE me.user_id = ${userId} AND m.date = ${date}`),
  );
  const [act] = rowsOf<Record<string, string | null>>(
    await db.execute(sql`
      SELECT coalesce(sum(net_kcal),0) net, coalesce(sum(duration_min),0) minutes, coalesce(sum(distance_km),0) dist
      FROM activity_logs WHERE user_id = ${userId} AND date = ${date}`),
  );
  const [steps] = await db.select().from(s.stepLogs).where(and(eq(s.stepLogs.userId, userId), eq(s.stepLogs.date, date)));
  const [water] = rowsOf<{ ml: string | null }>(
    await db.execute(sql`SELECT coalesce(sum(ml),0) ml FROM hydration_logs WHERE user_id = ${userId} AND date = ${date}`),
  );
  // Prefer manual sleep entry over imports for the same night.
  const sleeps = await db.select().from(s.sleepLogs).where(and(eq(s.sleepLogs.userId, userId), eq(s.sleepLogs.date, date)));
  const sleep = sleeps.find((x) => x.source === "manual") ?? sleeps[0];
  const [targets] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId));
  const baseline = Number((targets?.computed as { baseline?: number } | undefined)?.baseline ?? 0);

  const values = {
    userId,
    date,
    kcalIn: Number(food?.kcal ?? 0),
    proteinG: Number(food?.protein ?? 0),
    carbsG: Number(food?.carbs ?? 0),
    fatG: Number(food?.fat ?? 0),
    fibreG: Number(food?.fibre ?? 0),
    sugarG: Number(food?.sugar ?? 0),
    sodiumMg: Number(food?.sodium ?? 0),
    entriesCount: Number(food?.n ?? 0),
    exerciseNetKcal: Number(act?.net ?? 0),
    exerciseMinutes: Number(act?.minutes ?? 0),
    steps: steps?.steps ?? 0,
    distanceKm: (steps?.distanceKm ?? 0) || Number(act?.dist ?? 0),
    waterMl: Number(water?.ml ?? 0),
    sleepMin: sleep?.durationMin ?? 0,
    baselineKcal: baseline,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(s.dailySummaries)
    .values(values)
    .onConflictDoUpdate({ target: [s.dailySummaries.userId, s.dailySummaries.date], set: values })
    .returning();
  return row!;
}

export async function getSummary(db: Db, userId: string, date: string): Promise<DailySummary> {
  const [row] = await db.select().from(s.dailySummaries).where(and(eq(s.dailySummaries.userId, userId), eq(s.dailySummaries.date, date)));
  return row ?? recomputeDailySummary(db, userId, date);
}

/** Summaries for each day in range (missing days are zero-filled, flagged `logged: false`). */
export async function getRange(db: Db, userId: string, from: string, to: string) {
  const rows = await db
    .select()
    .from(s.dailySummaries)
    .where(and(eq(s.dailySummaries.userId, userId), between(s.dailySummaries.date, from, to)))
    .orderBy(asc(s.dailySummaries.date));
  const by = new Map(rows.map((r) => [r.date, r]));
  return dateRange(from, to).map((date) => {
    const r = by.get(date);
    return {
      date,
      logged: (r?.entriesCount ?? 0) > 0,
      kcalIn: r?.kcalIn ?? 0,
      proteinG: r?.proteinG ?? 0,
      carbsG: r?.carbsG ?? 0,
      fatG: r?.fatG ?? 0,
      fibreG: r?.fibreG ?? 0,
      sugarG: r?.sugarG ?? 0,
      sodiumMg: r?.sodiumMg ?? 0,
      exerciseNetKcal: r?.exerciseNetKcal ?? 0,
      exerciseMinutes: r?.exerciseMinutes ?? 0,
      steps: r?.steps ?? 0,
      distanceKm: r?.distanceKm ?? 0,
      waterMl: r?.waterMl ?? 0,
      sleepMin: r?.sleepMin ?? 0,
      baselineKcal: r?.baselineKcal ?? 0,
      expenditure: (r?.baselineKcal ?? 0) + (r?.exerciseNetKcal ?? 0),
    };
  });
}

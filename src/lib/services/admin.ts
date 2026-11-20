import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { rowsOf } from "@/db/client";
import * as s from "@/db/schema";
import { addDays } from "@/lib/dates";
import { notFound } from "@/lib/errors";
import { userToday } from "@/lib/server/context";
import { getProfileBundle } from "./profile";
import { getRange } from "./summary";

/** Every account with its goal and how much it has logged (owner-only admin view). */
export async function adminListUsers(db: Db) {
  return rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      SELECT u.id, u.name, u.email, u.created_at AS "createdAt",
             (u.google_sub IS NOT NULL) AS "google",
             p.primary_goal AS "goal", p.onboarded_at IS NOT NULL AS "onboarded",
             t.calories AS "targetKcal", t.protein_g AS "targetProteinG",
             (SELECT w.weight_kg FROM weight_logs w WHERE w.user_id = u.id ORDER BY w.date DESC LIMIT 1) AS "latestWeightKg",
             (SELECT count(*)::int FROM meal_entries m WHERE m.user_id = u.id) AS "foodEntries",
             (SELECT count(*)::int FROM weight_logs w WHERE w.user_id = u.id) AS "weighIns",
             (SELECT count(*)::int FROM fit_journal f WHERE f.user_id = u.id) AS "fitDays",
             (SELECT max(d.date) FROM daily_summaries d WHERE d.user_id = u.id AND d.entries_count > 0) AS "lastLoggedDate",
             (SELECT max(se.last_seen_at) FROM sessions se WHERE se.user_id = u.id) AS "lastSeenAt"
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN nutrition_targets t ON t.user_id = u.id
      ORDER BY u.created_at DESC`),
  );
}

/** One user's profile, targets, last 30 days, weigh-ins, Google Fit journal and recent food log. */
export async function adminUserDetail(db: Db, userId: string) {
  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.id, userId));
  if (!exists) throw notFound("User");
  const { today } = await userToday(db, userId);
  const from = addDays(today, -29);
  const [bundle, days, weights, fit, food] = await Promise.all([
    getProfileBundle(db, userId),
    getRange(db, userId, from, today),
    db.select({ date: s.weightLogs.date, weightKg: s.weightLogs.weightKg }).from(s.weightLogs).where(eq(s.weightLogs.userId, userId)).orderBy(desc(s.weightLogs.date)).limit(60),
    db.select().from(s.fitJournal).where(and(eq(s.fitJournal.userId, userId), gte(s.fitJournal.date, addDays(today, -13)))).orderBy(desc(s.fitJournal.date)),
    db
      .select({ date: s.meals.date, meal: s.meals.mealType, name: s.mealEntries.name, grams: s.mealEntries.grams, kcal: s.mealEntries.kcal, proteinG: s.mealEntries.proteinG, source: s.mealEntries.source })
      .from(s.mealEntries)
      .innerJoin(s.meals, eq(s.meals.id, s.mealEntries.mealId))
      .where(and(eq(s.mealEntries.userId, userId), gte(s.meals.date, from)))
      .orderBy(desc(s.meals.date), desc(s.mealEntries.loggedAt))
      .limit(200),
  ]);
  return { today, ...bundle, days, weights, fit, food };
}

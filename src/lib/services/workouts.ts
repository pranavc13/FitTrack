import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { estimateOneRepMax } from "@/lib/activity/met";
import { addDays } from "@/lib/dates";
import { ApiError, notFound } from "@/lib/errors";
import { logActivity } from "./activity";
import { checkTransformationMilestones } from "./milestones";

async function owned(db: Db, userId: string, workoutId: number) {
  const [w] = await db.select().from(s.workouts).where(and(eq(s.workouts.id, workoutId), eq(s.workouts.userId, userId)));
  if (!w) throw notFound("Workout");
  return w;
}

export async function listExercises(db: Db, opts: { muscle?: string; equipment?: string; location?: string; q?: string }) {
  const conds = [];
  if (opts.muscle) conds.push(sql`(${s.exercises.primaryMuscle} = ${opts.muscle} OR ${opts.muscle} = ANY(${s.exercises.secondaryMuscles}))`);
  if (opts.location && opts.location !== "both") conds.push(sql`${s.exercises.location} IN (${opts.location}, 'both')`);
  if (opts.equipment === "none") conds.push(sql`cardinality(${s.exercises.equipment}) = 0`);
  if (opts.q) conds.push(sql`lower(${s.exercises.name}) LIKE ${"%" + opts.q.toLowerCase() + "%"}`);
  return db.select().from(s.exercises).where(conds.length ? and(...conds) : undefined).orderBy(asc(s.exercises.primaryMuscle), asc(s.exercises.name));
}

export async function getExercise(db: Db, userId: string, slug: string) {
  const [ex] = await db.select().from(s.exercises).where(eq(s.exercises.slug, slug));
  if (!ex) throw notFound("Exercise");
  const alternatives = ex.alternatives.length ? await db.select({ slug: s.exercises.slug, name: s.exercises.name }).from(s.exercises).where(inArray(s.exercises.slug, ex.alternatives)) : [];
  const history = rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      SELECT wo.date, es.set_number AS "setNumber", es.reps, es.weight_kg AS "weightKg", es.duration_sec AS "durationSec"
      FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id JOIN workouts wo ON wo.id = we.workout_id
      WHERE wo.user_id = ${userId} AND we.exercise_id = ${ex.id} AND NOT es.is_warmup
      ORDER BY wo.date DESC, es.set_number LIMIT 60`),
  );
  const records = await db.select().from(s.personalRecords).where(and(eq(s.personalRecords.userId, userId), eq(s.personalRecords.exerciseId, ex.id)));
  return { exercise: ex, alternatives, history, records, suggestion: await overloadSuggestion(db, userId, ex) };
}

/**
 * Progressive overload: if every working set last time reached the top of the rep range, suggest
 * a small load increase (2.5 kg upper / 5 kg lower body; +1–2 reps for bodyweight).
 */
async function overloadSuggestion(db: Db, userId: string, ex: typeof s.exercises.$inferSelect) {
  const [last] = rowsOf<{ workout_id: number }>(
    await db.execute(sql`SELECT wo.id AS workout_id FROM workouts wo JOIN workout_exercises we ON we.workout_id = wo.id
      WHERE wo.user_id = ${userId} AND we.exercise_id = ${ex.id} AND wo.ended_at IS NOT NULL ORDER BY wo.date DESC, wo.id DESC LIMIT 1`),
  );
  if (!last) return null;
  const sets = rowsOf<{ reps: number | null; weight_kg: number | null }>(
    await db.execute(sql`SELECT es.reps, es.weight_kg FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id
      WHERE we.workout_id = ${last.workout_id} AND we.exercise_id = ${ex.id} AND NOT es.is_warmup`),
  );
  if (!sets.length) return null;
  const top = Number(/(\d+)\s*$/.exec(ex.defaultReps.split("-").pop() ?? "")?.[1] ?? NaN);
  const heaviest = Math.max(...sets.map((x) => x.weight_kg ?? 0));
  const allHit = Number.isFinite(top) && sets.every((x) => (x.reps ?? 0) >= top);
  const lower = ["quadriceps", "hamstrings", "glutes", "calves"].includes(ex.primaryMuscle) || ex.slug.includes("deadlift");
  if (!allHit) return { action: "repeat", text: `Repeat ${heaviest ? heaviest + " kg" : "the same difficulty"} and aim for ${ex.defaultReps} reps on every set.`, weightKg: heaviest || null };
  if (heaviest > 0) {
    const inc = lower ? 5 : 2.5;
    return { action: "increase", text: `You hit the top of the range on all sets — try ${heaviest + inc} kg next time.`, weightKg: heaviest + inc };
  }
  return { action: "progress", text: "All sets at the top of the range — add 1–2 reps, slow the tempo, or move to a harder variation.", weightKg: null };
}

export async function startWorkout(db: Db, userId: string, input: { date: string; name?: string; planDay?: string | null }) {
  const [open] = await db.select().from(s.workouts).where(and(eq(s.workouts.userId, userId), isNull(s.workouts.endedAt)));
  if (open) return getWorkout(db, userId, open.id);
  const [plan] = await db.select().from(s.workoutPlans).where(and(eq(s.workoutPlans.userId, userId), eq(s.workoutPlans.isActive, true)));
  const day = input.planDay && plan ? plan.days.find((d) => d.day === input.planDay) : null;
  const [w] = await db
    .insert(s.workouts)
    .values({ userId, date: input.date, name: input.name?.trim() || (day ? `${plan!.name.split(" (")[0]} — ${day.day}` : "Workout"), planId: day ? plan!.id : null, planDay: day?.day ?? null })
    .returning();
  if (day) {
    const exs = await db.select().from(s.exercises).where(inArray(s.exercises.slug, day.exercises.map((e) => e.slug)));
    const bySlug = new Map(exs.map((e) => [e.slug, e]));
    const rows = day.exercises.flatMap((e, i) => (bySlug.get(e.slug) ? [{ workoutId: w!.id, exerciseId: bySlug.get(e.slug)!.id, sort: i, notes: `${e.sets} × ${e.reps} · rest ${e.restSec}s` }] : []));
    if (rows.length) await db.insert(s.workoutExercises).values(rows);
  }
  return getWorkout(db, userId, w!.id);
}

export async function getWorkout(db: Db, userId: string, id: number) {
  const w = await owned(db, userId, id);
  const exs = await db
    .select({ we: s.workoutExercises, ex: s.exercises })
    .from(s.workoutExercises)
    .innerJoin(s.exercises, eq(s.exercises.id, s.workoutExercises.exerciseId))
    .where(eq(s.workoutExercises.workoutId, id))
    .orderBy(asc(s.workoutExercises.sort));
  const sets = exs.length
    ? await db.select().from(s.exerciseSets).where(inArray(s.exerciseSets.workoutExerciseId, exs.map((e) => e.we.id))).orderBy(asc(s.exerciseSets.setNumber))
    : [];
  const out = [];
  for (const { we, ex } of exs) {
    out.push({
      id: we.id,
      notes: we.notes,
      exercise: { id: ex.id, slug: ex.slug, name: ex.name, primaryMuscle: ex.primaryMuscle, defaultSets: ex.defaultSets, defaultReps: ex.defaultReps, defaultRestSec: ex.defaultRestSec, equipment: ex.equipment },
      sets: sets.filter((st) => st.workoutExerciseId === we.id),
      suggestion: await overloadSuggestion(db, userId, ex),
    });
  }
  return { workout: w, exercises: out };
}

export async function addExerciseToWorkout(db: Db, userId: string, workoutId: number, exerciseSlug: string) {
  await owned(db, userId, workoutId);
  const [ex] = await db.select().from(s.exercises).where(eq(s.exercises.slug, exerciseSlug));
  if (!ex) throw notFound("Exercise");
  const [{ n }] = rowsOf<{ n: number }>(await db.execute(sql`SELECT count(*)::int n FROM workout_exercises WHERE workout_id = ${workoutId}`)) as [{ n: number }];
  await db.insert(s.workoutExercises).values({ workoutId, exerciseId: ex.id, sort: n });
  return getWorkout(db, userId, workoutId);
}

export async function removeWorkoutExercise(db: Db, userId: string, workoutId: number, workoutExerciseId: number) {
  await owned(db, userId, workoutId);
  await db.delete(s.workoutExercises).where(and(eq(s.workoutExercises.id, workoutExerciseId), eq(s.workoutExercises.workoutId, workoutId)));
}

export async function logSet(
  db: Db,
  userId: string,
  workoutId: number,
  input: { workoutExerciseId: number; reps?: number | null; weightKg?: number | null; durationSec?: number | null; rpe?: number | null; isWarmup?: boolean },
) {
  const w = await owned(db, userId, workoutId);
  if (w.endedAt) throw new ApiError(409, "This workout is finished");
  const [we] = await db.select().from(s.workoutExercises).where(and(eq(s.workoutExercises.id, input.workoutExerciseId), eq(s.workoutExercises.workoutId, workoutId)));
  if (!we) throw notFound("Exercise in workout");
  if (input.reps == null && input.durationSec == null) throw new ApiError(400, "Enter reps or duration");
  if (input.weightKg != null && (input.weightKg < 0 || input.weightKg > 500)) throw new ApiError(400, "Weight out of range");
  const [{ n }] = rowsOf<{ n: number }>(await db.execute(sql`SELECT count(*)::int n FROM exercise_sets WHERE workout_exercise_id = ${we.id}`)) as [{ n: number }];
  const [set] = await db
    .insert(s.exerciseSets)
    .values({ workoutExerciseId: we.id, setNumber: n + 1, reps: input.reps ?? null, weightKg: input.weightKg ?? null, durationSec: input.durationSec ?? null, rpe: input.rpe ?? null, isWarmup: input.isWarmup ?? false })
    .returning();
  const records = input.isWarmup ? [] : await updatePersonalRecords(db, userId, we.exerciseId, set!);
  return { set: set!, newRecords: records };
}

export async function deleteSet(db: Db, userId: string, workoutId: number, setId: number) {
  await owned(db, userId, workoutId);
  await db.execute(sql`DELETE FROM exercise_sets WHERE id = ${setId} AND workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ${workoutId})`);
}

async function updatePersonalRecords(db: Db, userId: string, exerciseId: number, set: typeof s.exerciseSets.$inferSelect) {
  const out: { kind: string; value: number }[] = [];
  const candidates: { kind: string; value: number; detail: string }[] = [];
  if (set.weightKg && set.reps) {
    candidates.push({ kind: "max_weight", value: set.weightKg, detail: `${set.weightKg} kg × ${set.reps}` });
    if (set.reps <= 12) candidates.push({ kind: "e1rm", value: Math.round(estimateOneRepMax(set.weightKg, set.reps) * 10) / 10, detail: `Estimated from ${set.weightKg} kg × ${set.reps} (Epley)` });
  } else if (set.reps) candidates.push({ kind: "max_reps", value: set.reps, detail: `${set.reps} reps` });
  else if (set.durationSec) candidates.push({ kind: "max_duration_sec", value: set.durationSec, detail: `${set.durationSec} s` });
  for (const c of candidates) {
    const [best] = await db
      .select()
      .from(s.personalRecords)
      .where(and(eq(s.personalRecords.userId, userId), eq(s.personalRecords.exerciseId, exerciseId), eq(s.personalRecords.kind, c.kind)))
      .orderBy(desc(s.personalRecords.value))
      .limit(1);
    if (!best || c.value > best.value) {
      await db.insert(s.personalRecords).values({ userId, exerciseId, kind: c.kind, value: c.value, detail: c.detail, achievedAt: new Date(), setId: set.id });
      if (best) out.push({ kind: c.kind, value: c.value }); // only celebrate improvements, not the first entry
    }
  }
  return out;
}

/**
 * Finishes a workout: stores duration and logs one activity entry (resistance training MET, weighted by
 * the exercises performed) so energy is counted exactly once.
 */
export async function finishWorkout(db: Db, userId: string, workoutId: number, notes?: string | null) {
  const w = await owned(db, userId, workoutId);
  if (w.endedAt) return getWorkout(db, userId, workoutId);
  const endedAt = new Date();
  const durationMin = Math.max(1, Math.round((endedAt.getTime() - w.startedAt.getTime()) / 60000));
  await db.update(s.workouts).set({ endedAt, durationMin, notes: notes ?? w.notes, updatedAt: new Date() }).where(eq(s.workouts.id, workoutId));
  const [counts] = rowsOf<{ sets: number; met: number | null }>(
    await db.execute(sql`SELECT count(es.id)::int sets, avg(e.met) met FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
      LEFT JOIN exercise_sets es ON es.workout_exercise_id = we.id WHERE we.workout_id = ${workoutId}`),
  );
  if (counts && counts.sets > 0) {
    const met = Number(counts.met ?? 3.5);
    // Use the Compendium resistance-training codes: vigorous free weights (02050, 6.0) or general (02054, 3.5).
    const code = met >= 5 ? "02050" : met >= 4 ? "02052" : "02054";
    const [type] = await db.select().from(s.activityTypes).where(and(eq(s.activityTypes.code, code), isNull(s.activityTypes.ownerUserId)));
    if (type) await logActivity(db, userId, { activityTypeId: type.id, date: w.date, durationMin: Math.min(durationMin, 240), source: "workout", workoutId, notes: w.name });
  }
  await checkTransformationMilestones(db, userId);
  return getWorkout(db, userId, workoutId);
}

export async function deleteWorkout(db: Db, userId: string, workoutId: number) {
  const w = await owned(db, userId, workoutId);
  await db.delete(s.activityLogs).where(and(eq(s.activityLogs.userId, userId), eq(s.activityLogs.workoutId, workoutId)));
  await db.delete(s.workouts).where(eq(s.workouts.id, workoutId));
  const { recomputeDailySummary } = await import("./summary");
  await recomputeDailySummary(db, userId, w.date);
}

export async function workoutHistory(db: Db, userId: string, from: string) {
  return rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      SELECT wo.id, wo.name, wo.date, wo.duration_min AS "durationMin", wo.ended_at AS "endedAt",
             count(DISTINCT we.id)::int AS exercises, count(es.id)::int AS sets,
             coalesce(sum(es.reps * coalesce(es.weight_kg, 0)), 0) AS volume
      FROM workouts wo LEFT JOIN workout_exercises we ON we.workout_id = wo.id LEFT JOIN exercise_sets es ON es.workout_exercise_id = we.id AND NOT es.is_warmup
      WHERE wo.user_id = ${userId} AND wo.date >= ${from}
      GROUP BY wo.id ORDER BY wo.date DESC, wo.id DESC`),
  );
}

/**
 * Recovery-aware suggestion: picks the next plan day whose primary muscles were not trained in the
 * last 48 hours, rotating through the plan in order.
 */
export async function nextWorkoutSuggestion(db: Db, userId: string, today: string) {
  const [plan] = await db.select().from(s.workoutPlans).where(and(eq(s.workoutPlans.userId, userId), eq(s.workoutPlans.isActive, true)));
  if (!plan) return { plan: null, suggestion: null, reason: "No active plan — choose one in Goals" };
  const recent = await db.select().from(s.workouts).where(and(eq(s.workouts.userId, userId), gte(s.workouts.date, addDays(today, -14)))).orderBy(desc(s.workouts.date), desc(s.workouts.id));
  const trainedRecently = rowsOf<{ muscle: string }>(
    await db.execute(sql`SELECT DISTINCT e.primary_muscle AS muscle FROM workouts wo JOIN workout_exercises we ON we.workout_id = wo.id
      JOIN exercises e ON e.id = we.exercise_id WHERE wo.user_id = ${userId} AND wo.date >= ${addDays(today, -1)}`),
  ).map((r) => r.muscle);
  const lastDay = recent.find((r) => r.planId === plan.id)?.planDay;
  const order = plan.days.map((d) => d.day);
  const startIdx = lastDay ? (order.indexOf(lastDay) + 1) % order.length : 0;
  const exercises = await db.select({ slug: s.exercises.slug, muscle: s.exercises.primaryMuscle }).from(s.exercises);
  const muscleOf = new Map(exercises.map((e) => [e.slug, e.muscle]));
  const doneToday = recent.some((r) => r.date === today && r.endedAt);
  for (let i = 0; i < order.length; i++) {
    const day = plan.days[(startIdx + i) % order.length]!;
    const muscles = new Set(day.exercises.map((e) => muscleOf.get(e.slug)).filter(Boolean));
    const overlap = [...muscles].filter((m) => trainedRecently.includes(m!));
    if (overlap.length <= 1) {
      return { plan, suggestion: day, doneToday, reason: overlap.length ? `Light overlap with yesterday (${overlap.join(", ")})` : lastDay ? `Next in rotation after ${lastDay}` : "First session of your plan" };
    }
  }
  return { plan, suggestion: null, doneToday, reason: "All plan days overlap with muscles trained in the last 48 h — consider a rest day, walk or mobility session." };
}

export async function trainingCalendar(db: Db, userId: string, from: string, to: string) {
  return rowsOf<{ date: string; workouts: number; activities: number; minutes: number }>(
    await db.execute(sql`
      SELECT d::date::text AS date,
        (SELECT count(*)::int FROM workouts w WHERE w.user_id = ${userId} AND w.date = d::date AND w.ended_at IS NOT NULL) AS workouts,
        (SELECT count(*)::int FROM activity_logs a WHERE a.user_id = ${userId} AND a.date = d::date) AS activities,
        (SELECT coalesce(sum(duration_min),0)::float FROM activity_logs a WHERE a.user_id = ${userId} AND a.date = d::date) AS minutes
      FROM generate_series(${from}::date, ${to}::date, interval '1 day') d`),
  );
}

export async function personalRecords(db: Db, userId: string) {
  return rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      SELECT DISTINCT ON (pr.exercise_id, pr.kind) pr.kind, pr.value, pr.detail, pr.achieved_at AS "achievedAt", e.name AS exercise, e.slug
      FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id
      WHERE pr.user_id = ${userId}
      ORDER BY pr.exercise_id, pr.kind, pr.value DESC`),
  );
}

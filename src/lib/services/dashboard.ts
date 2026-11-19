import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { addDays } from "@/lib/dates";
import { streak } from "@/lib/analytics/trends";
import { round } from "@/lib/nutrition/engine";
import { getDay } from "./diary";
import { getRange } from "./summary";
import { getProfileBundle } from "./profile";
import { activeGoal } from "./goals";
import { nextWorkoutSuggestion } from "./workouts";
import { weightHistory } from "./body";
import { proteinGap } from "./insights";

/** Rule-based daily recommendations built only from the user's real data (no AI call needed). */
function recommendations(ctx: {
  hour: number;
  kcalLeft: number | null;
  proteinLeft: number | null;
  fibre: number;
  fibreTarget: number;
  water: number;
  waterTarget: number;
  steps: number;
  stepGoal: number;
  entries: number;
  workoutSuggestion: string | null;
  weighedToday: boolean;
}) {
  const out: { id: string; text: string; href: string; priority: number }[] = [];
  if (ctx.entries === 0) out.push({ id: "log", text: ctx.hour < 11 ? "Log your breakfast — snap a photo to get started" : "Nothing logged yet today — add your meals", href: "/scan", priority: 1 });
  if (ctx.proteinLeft != null && ctx.proteinLeft > 25 && ctx.hour >= 14) out.push({ id: "protein", text: `${Math.round(ctx.proteinLeft)} g protein left — see high-protein options`, href: "/food/insights", priority: 2 });
  if (ctx.water < ctx.waterTarget * (ctx.hour / 24) * 0.7 && ctx.hour >= 10) out.push({ id: "water", text: `Water is behind schedule (${(ctx.water / 1000).toFixed(1)} L so far)`, href: "/wellness", priority: 3 });
  if (ctx.steps < ctx.stepGoal * 0.5 && ctx.hour >= 17) out.push({ id: "steps", text: `${(ctx.stepGoal - ctx.steps).toLocaleString("en-IN")} steps to your goal — a 20-min walk adds ~2,000`, href: "/activity", priority: 4 });
  if (ctx.fibre < ctx.fibreTarget * 0.5 && ctx.hour >= 18 && ctx.entries > 0) out.push({ id: "fibre", text: "Fibre is low today — add dal, salad, fruit or sprouts", href: "/food/insights", priority: 5 });
  if (ctx.workoutSuggestion) out.push({ id: "workout", text: ctx.workoutSuggestion, href: "/activity/workout", priority: 6 });
  if (!ctx.weighedToday && ctx.hour < 11) out.push({ id: "weigh", text: "Morning weigh-in (after the bathroom, before eating) gives the cleanest trend", href: "/progress", priority: 7 });
  if (ctx.kcalLeft != null && ctx.kcalLeft < -300) out.push({ id: "over", text: "Over today's target — that's fine; your weekly average matters more", href: "/food/insights", priority: 8 });
  return out.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

export async function dashboard(db: Db, userId: string, date: string, hour: number) {
  const [bundle, day, week, goal, next, weights, pGap, steps] = await Promise.all([
    getProfileBundle(db, userId),
    getDay(db, userId, date),
    getRange(db, userId, addDays(date, -6), date),
    activeGoal(db, userId),
    nextWorkoutSuggestion(db, userId, date),
    weightHistory(db, userId, 90),
    proteinGap(db, userId, date),
    db.select().from(s.stepLogs).where(and(eq(s.stepLogs.userId, userId), eq(s.stepLogs.date, date))),
  ]);
  const t = bundle.targets;
  const today = week.at(-1)!;
  const loggedDates = (await getRange(db, userId, addDays(date, -120), date)).filter((d) => d.logged).map((d) => d.date);
  const [fast] = await db.select().from(s.fastingLogs).where(and(eq(s.fastingLogs.userId, userId), isNull(s.fastingLogs.endedAt))).orderBy(desc(s.fastingLogs.startedAt)).limit(1);
  const stepGoal = bundle.preferences?.stepGoal ?? 8000;
  const expenditure = today.baselineKcal + today.exerciseNetKcal;
  return {
    date,
    user: bundle.user,
    onboarded: Boolean(bundle.profile?.onboardedAt),
    targets: t,
    today: {
      kcalIn: round(day.totals.kcal, 0),
      proteinG: day.totals.proteinG,
      carbsG: day.totals.carbsG,
      fatG: day.totals.fatG,
      fibreG: day.totals.fibreG,
      exerciseNetKcal: round(today.exerciseNetKcal, 0),
      exerciseMinutes: round(today.exerciseMinutes, 0),
      steps: steps[0]?.steps ?? 0,
      stepSource: steps[0]?.source ?? null,
      distanceKm: round(today.distanceKm, 1),
      waterMl: today.waterMl,
      sleepMin: today.sleepMin,
      estimatedExpenditure: round(expenditure, 0),
      kcalRemaining: t ? round(t.calories - day.totals.kcal, 0) : null,
    },
    meals: day.meals.map((m) => ({ mealType: m.mealType, name: m.name, kcal: m.totals.kcal, proteinG: m.totals.proteinG, items: m.entries.map((e) => e.name) })),
    week: week.map((d) => ({ date: d.date, kcalIn: round(d.kcalIn, 0), logged: d.logged, steps: d.steps, exerciseMinutes: round(d.exerciseMinutes, 0) })),
    weight: { latest: weights.at(-1) ?? null, trend: weights.slice(-30).map((w) => ({ date: w.date, weightKg: w.weightKg, trendKg: w.trendKg })) },
    goal: goal ? { type: goal.goal.type, label: (goal.goal.plan as { label?: string }).label, progress: goal.progress, targetWeightKg: goal.goal.targetWeightKg, startWeightKg: goal.goal.startWeightKg, nextMilestone: goal.milestones.find((m) => !m.achievedAt)?.title ?? null } : null,
    workout: next.suggestion ? { day: next.suggestion.day, focus: next.suggestion.focus, reason: next.reason, doneToday: next.doneToday ?? false } : { day: null, focus: null, reason: next.reason, doneToday: next.doneToday ?? false },
    streak: streak(loggedDates, date),
    fasting: fast ? { startedAt: fast.startedAt, targetHours: fast.targetHours } : null,
    proteinSuggestions: pGap.suggestions.slice(0, 3),
    recommendations: recommendations({
      hour,
      kcalLeft: t ? t.calories - day.totals.kcal : null,
      proteinLeft: pGap.remaining,
      fibre: day.totals.fibreG,
      fibreTarget: t?.fibreG ?? 30,
      water: today.waterMl,
      waterTarget: t?.waterMl ?? 2500,
      steps: steps[0]?.steps ?? 0,
      stepGoal,
      entries: day.totals.count,
      workoutSuggestion: next.suggestion && !next.doneToday ? `Today's training: ${next.suggestion.day} — ${next.suggestion.focus}` : null,
      weighedToday: weights.at(-1)?.date === date,
    }),
  };
}

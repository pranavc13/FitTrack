import { and, desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { addDays } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { analyzeFitDay, type FitPerson } from "@/lib/nutrition/fit-journal";
import { ageFromDob, bmrMifflin, calculateTargets, type ActivityLevel, type GoalType, type Sex } from "@/lib/nutrition/targets";
import { setSteps } from "./activity";
import { currentWeight } from "./profile";
import { getRange, getSummary } from "./summary";

export type FitJournalInput = {
  date: string;
  steps?: number | null;
  heartPoints?: number | null;
  moveMinutes?: number | null;
  distanceKm?: number | null;
  caloriesBurned?: number | null;
  avgHeartRate?: number | null;
  goal?: GoalType | null;
  isFullDay?: boolean;
  notes?: string | null;
};

/** Share of the local day that had passed at `at` in timezone `tz` (1 for past days or full-day entries). */
function dayFraction(date: string, at: Date, tz: string, isFullDay: boolean) {
  if (isFullDay) return 1;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((p) => [p.type, p.value]));
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (localDate > date) return 1;
  if (localDate < date) return 0;
  return (Number(parts.hour) * 60 + Number(parts.minute)) / 1440;
}

async function person(db: Db, userId: string) {
  const [[profile], [prefs], [targets]] = await Promise.all([
    db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId)),
    db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId)),
    db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId)),
  ]);
  if (!profile?.heightCm || !profile.dateOfBirth) throw new ApiError(400, "Finish your profile (height and date of birth) first");
  const weightKg = (await currentWeight(db, userId)) ?? profile.currentWeightKg;
  if (!weightKg) throw new ApiError(400, "Add your current weight first");
  const sex = profile.sex as Sex;
  const age = ageFromDob(profile.dateOfBirth);
  const fallback = targets ? null : calculateTargets({ weightKg, heightCm: profile.heightCm, ageYears: age, sex, activityLevel: profile.activityLevel as ActivityLevel, goal: profile.primaryGoal as GoalType });
  const p: FitPerson = {
    weightKg,
    heightCm: profile.heightCm,
    bmr: bmrMifflin(weightKg, profile.heightCm, age, sex),
    sex,
    dietPreference: profile.dietPreference,
    stepGoal: prefs?.stepGoal ?? 8000,
    proteinTargetG: targets?.proteinG ?? fallback!.proteinG,
    fibreTargetG: targets?.fibreG ?? fallback!.fibreG,
  };
  return { p, tz: prefs?.timezone ?? "Asia/Kolkata", profileGoal: profile.primaryGoal as GoalType };
}

export async function getFitDay(db: Db, userId: string, date: string) {
  const { p, tz, profileGoal } = await person(db, userId);
  const [entry] = await db.select().from(s.fitJournal).where(and(eq(s.fitJournal.userId, userId), eq(s.fitJournal.date, date)));
  const sum = await getSummary(db, userId, date);
  const intake = { kcal: sum.kcalIn, proteinG: sum.proteinG, carbsG: sum.carbsG, fatG: sum.fatG, fibreG: sum.fibreG, sugarG: sum.sugarG, entries: sum.entriesCount };
  const goal = (entry?.goal as GoalType | undefined) ?? profileGoal;
  const frac = entry ? dayFraction(date, entry.recordedAt, tz, entry.isFullDay) : dayFraction(date, new Date(), tz, false);
  const analysis = analyzeFitDay(
    {
      steps: entry?.steps ?? (sum.steps || null),
      heartPoints: entry?.heartPoints ?? null,
      moveMinutes: entry?.moveMinutes ?? null,
      distanceKm: entry?.distanceKm ?? (sum.distanceKm || null),
      caloriesBurned: entry?.caloriesBurned ?? null,
      avgHeartRate: entry?.avgHeartRate ?? null,
      goal,
      dayFraction: frac,
    },
    p,
    intake,
  );
  return { date, entry: entry ?? null, profileGoal, weightKg: p.weightKg, bmr: Math.round(p.bmr), analysis };
}

export async function saveFitDay(db: Db, userId: string, input: FitJournalInput) {
  const { profileGoal } = await person(db, userId);
  const values = {
    userId,
    date: input.date,
    steps: input.steps ?? null,
    heartPoints: input.heartPoints ?? null,
    moveMinutes: input.moveMinutes ?? null,
    distanceKm: input.distanceKm ?? null,
    caloriesBurned: input.caloriesBurned ?? null,
    avgHeartRate: input.avgHeartRate ?? null,
    goal: input.goal ?? profileGoal,
    recordedAt: new Date(),
    isFullDay: input.isFullDay ?? false,
    notes: input.notes ?? null,
    updatedAt: new Date(),
  };
  await db.insert(s.fitJournal).values(values).onConflictDoUpdate({ target: [s.fitJournal.userId, s.fitJournal.date], set: values });
  // Keep the dashboard's step count in sync with what Google Fit says.
  if (input.steps != null) await setSteps(db, userId, input.date, input.steps, input.distanceKm ?? null);
  return getFitDay(db, userId, input.date);
}

export async function deleteFitDay(db: Db, userId: string, date: string) {
  await db.delete(s.fitJournal).where(and(eq(s.fitJournal.userId, userId), eq(s.fitJournal.date, date)));
}

/** Recent journal days with intake vs tracker burn, newest first. */
export async function fitHistory(db: Db, userId: string, today: string, days = 14) {
  const from = addDays(today, -(days - 1));
  const rows = await db.select().from(s.fitJournal).where(and(eq(s.fitJournal.userId, userId), gte(s.fitJournal.date, from))).orderBy(desc(s.fitJournal.date));
  if (!rows.length) return [];
  const sums = new Map((await getRange(db, userId, from, today)).map((r) => [r.date, r]));
  return rows.map((r) => {
    const sum = sums.get(r.date);
    return { date: r.date, steps: r.steps, heartPoints: r.heartPoints, distanceKm: r.distanceKm, caloriesBurned: r.caloriesBurned, goal: r.goal, isFullDay: r.isFullDay, kcalIn: Math.round(sum?.kcalIn ?? 0), proteinG: Math.round(sum?.proteinG ?? 0), logged: sum?.logged ?? false };
  });
}

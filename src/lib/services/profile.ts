import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { ageFromDob, calculateTargets, type ActivityLevel, type GoalType, type Sex } from "@/lib/nutrition/targets";
import { ApiError } from "@/lib/errors";

export type ProfileInput = Partial<Omit<typeof s.userProfiles.$inferInsert, "userId" | "createdAt" | "updatedAt">>;

export async function getProfileBundle(db: Db, userId: string) {
  const [[user], [profile], [prefs], [targets]] = await Promise.all([
    db.select({ id: s.users.id, email: s.users.email, name: s.users.name, avatarUrl: s.users.avatarUrl, hasPassword: sql<boolean>`${s.users.passwordHash} is not null`, googleLinked: sql<boolean>`${s.users.googleSub} is not null`, createdAt: s.users.createdAt }).from(s.users).where(eq(s.users.id, userId)),
    db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId)),
    db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId)),
    db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId)),
  ]);
  return { user: user ?? null, profile: profile ?? null, preferences: prefs ?? null, targets: targets ?? null };
}

export async function upsertProfile(db: Db, userId: string, input: ProfileInput) {
  await db
    .insert(s.userProfiles)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: s.userProfiles.userId, set: { ...input, updatedAt: new Date() } });
  await db.insert(s.userPreferences).values({ userId }).onConflictDoNothing();
}

/** Latest logged weight, falling back to the profile weight. */
export async function currentWeight(db: Db, userId: string): Promise<number | null> {
  const [w] = await db.select().from(s.weightLogs).where(eq(s.weightLogs.userId, userId)).orderBy(desc(s.weightLogs.date)).limit(1);
  if (w) return w.weightKg;
  const [p] = await db.select({ w: s.userProfiles.currentWeightKg }).from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  return p?.w ?? null;
}

/** Average planned net exercise kcal/day from workout availability (used only for the TDEE display). */
function plannedExerciseKcal(weightKg: number, daysPerWeek: number, minutes: number) {
  // Assume a moderate resistance/cardio mix of about 5 MET: net (5 - 1) x 3.5 x kg / 200 per minute.
  return ((4 * 3.5 * weightKg) / 200) * minutes * (daysPerWeek / 7);
}

/** Recomputes targets from the profile unless the user has set custom targets (unless `force`). */
export async function recalculateTargets(db: Db, userId: string, opts: { force?: boolean } = {}) {
  const [profile] = await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  if (!profile?.heightCm || !profile.dateOfBirth) throw new ApiError(400, "Complete your profile (height and date of birth) first");
  const weight = (await currentWeight(db, userId)) ?? profile.currentWeightKg;
  if (!weight) throw new ApiError(400, "Add your current weight first");
  const [existing] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId));
  const t = calculateTargets({
    weightKg: weight,
    heightCm: profile.heightCm,
    ageYears: ageFromDob(profile.dateOfBirth),
    sex: profile.sex as Sex,
    activityLevel: profile.activityLevel as ActivityLevel,
    goal: profile.primaryGoal as GoalType,
    targetWeightKg: profile.targetWeightKg,
    plannedExerciseKcalPerDay: plannedExerciseKcal(weight, profile.workoutDaysPerWeek, profile.workoutMinutes),
  });
  const computed = {
    bmi: t.bmi,
    bmiCategory: t.bmiCategory,
    bmr: Math.round(t.bmr),
    baseline: Math.round(t.baseline),
    tdee: Math.round(t.tdee),
    energyAdjustment: t.energyAdjustment,
    rationale: t.rationale,
    method: t.method,
    weightUsed: weight,
    calculatedAt: new Date().toISOString(),
    recommended: { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, fibreG: t.fibreG, waterMl: t.waterMl },
  };
  if (existing?.isCustom && !opts.force) {
    // Keep the user's custom numbers but refresh the transparency info (BMR/TDEE/recommendations).
    await db.update(s.nutritionTargets).set({ computed, updatedAt: new Date() }).where(eq(s.nutritionTargets.userId, userId));
    return { ...existing, computed };
  }
  const values = {
    userId,
    calories: t.calories,
    proteinG: t.proteinG,
    carbsG: t.carbsG,
    fatG: t.fatG,
    fibreG: t.fibreG,
    waterMl: t.waterMl,
    sleepMinutes: Math.round((profile.sleepHours && profile.sleepHours >= 7 ? profile.sleepHours : 7.5) * 60),
    isCustom: false,
    computed,
  };
  const [row] = await db
    .insert(s.nutritionTargets)
    .values(values)
    .onConflictDoUpdate({ target: s.nutritionTargets.userId, set: { ...values, updatedAt: new Date() } })
    .returning();
  return row!;
}

export async function setCustomTargets(
  db: Db,
  userId: string,
  input: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number; sleepMinutes?: number },
) {
  const [existing] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId));
  if (!existing) throw new ApiError(400, "Complete onboarding first");
  const bmr = Number((existing.computed as { bmr?: number }).bmr ?? 0);
  const warnings: string[] = [];
  if (bmr && input.calories < bmr * 0.9) warnings.push(`Calories are below your estimated BMR (${bmr} kcal). Very low intakes are hard to sustain and can cost muscle.`);
  const macroKcal = input.proteinG * 4 + input.carbsG * 4 + input.fatG * 9;
  if (Math.abs(macroKcal - input.calories) > input.calories * 0.1) warnings.push(`Macros add up to ${macroKcal} kcal, which differs from the calorie target by more than 10%.`);
  const [row] = await db
    .update(s.nutritionTargets)
    .set({ ...input, isCustom: true, updatedAt: new Date() })
    .where(eq(s.nutritionTargets.userId, userId))
    .returning();
  return { targets: row!, warnings };
}

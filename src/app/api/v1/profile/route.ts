import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { body, route } from "@/lib/server/api";
import { getProfileBundle, recalculateTargets, upsertProfile } from "@/lib/services/profile";
import { logWeight } from "@/lib/services/body";
import { userToday } from "@/lib/server/context";

const Profile = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  dateOfBirth: z.iso.date().optional(),
  sex: z.enum(["male", "female", "unspecified"]).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  currentWeightKg: z.number().min(20).max(400).optional(),
  targetWeightKg: z.number().min(20).max(400).nullable().optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  trainingExperience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  trainingLocation: z.enum(["gym", "home", "both"]).optional(),
  equipment: z.array(z.string().max(40)).max(30).optional(),
  sleepHours: z.number().min(3).max(14).nullable().optional(),
  lifestyle: z.string().max(300).nullable().optional(),
  dietPreference: z.enum(["vegetarian", "vegan", "eggetarian", "non_vegetarian", "pescatarian", "jain"]).optional(),
  allergies: z.array(z.string().max(40)).max(20).optional(),
  intolerances: z.array(z.string().max(40)).max(20).optional(),
  primaryGoal: z.enum(["weight_loss", "fat_loss", "belly_fat_reduction", "muscle_gain", "recomposition", "visible_abs", "strength", "endurance", "general_fitness", "maintenance"]).optional(),
  objectives: z.array(z.string().max(60)).max(10).optional(),
  workoutDaysPerWeek: z.number().int().min(0).max(7).optional(),
  workoutMinutes: z.number().int().min(10).max(240).optional(),
  completeOnboarding: z.boolean().optional(),
  preferences: z
    .object({
      timezone: z.string().max(60).optional(),
      stepGoal: z.number().int().min(1000).max(50000).optional(),
      waterGlassMl: z.number().int().min(50).max(1000).optional(),
      foodBudgetWeeklyInr: z.number().int().min(0).max(100000).nullable().optional(),
    })
    .optional(),
});

export const GET = route(async ({ db, user }) => getProfileBundle(db, user.id));

export const PUT = route(async ({ db, user, req }) => {
  const { name, completeOnboarding, preferences, ...profile } = await body(req, Profile);
  if (name) await db.update(s.users).set({ name, updatedAt: new Date() }).where(eq(s.users.id, user.id));
  await upsertProfile(db, user.id, { ...profile, ...(completeOnboarding ? { onboardedAt: new Date() } : {}) });
  if (preferences) await db.update(s.userPreferences).set({ ...preferences, updatedAt: new Date() }).where(eq(s.userPreferences.userId, user.id));
  if (profile.currentWeightKg) {
    const { today } = await userToday(db, user.id);
    await logWeight(db, user.id, today, profile.currentWeightKg);
  }
  let updated = false;
  try {
    await recalculateTargets(db, user.id);
    updated = true;
  } catch {
    /* incomplete profile: targets are computed once height, DOB and weight exist */
  }
  return { ...(await getProfileBundle(db, user.id)), targetsUpdated: updated };
});

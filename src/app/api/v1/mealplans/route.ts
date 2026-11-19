import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { ApiError, body, route, zDate } from "@/lib/server/api";
import { generateMealPlan, listMealPlans, saveMealPlan } from "@/lib/services/mealplan";

export const GET = route(async ({ db, user }) => ({ plans: await listMealPlans(db, user.id) }));

export const POST = route(async ({ db, user, req }) => {
  const b = await body(
    req,
    z.object({
      days: z.number().int().min(1).max(14),
      startDate: zDate,
      maxCookMinutes: z.number().int().min(10).max(240).nullable().optional(),
      budgetPerDayInr: z.number().int().min(50).max(5000).nullable().optional(),
      region: z.string().max(40).nullable().optional(),
      diet: z.enum(["vegetarian", "vegan", "eggetarian", "non_vegetarian", "pescatarian", "jain"]).optional(),
      availableIngredients: z.array(z.string().max(40)).max(30).optional(),
      save: z.boolean().optional(),
      name: z.string().max(80).optional(),
    }),
  );
  const [profile] = await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, user.id));
  const [targets] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, user.id));
  if (!profile || !targets) throw new ApiError(400, "Complete onboarding so the planner knows your targets");
  const [plan] = await db.select().from(s.workoutPlans).where(eq(s.workoutPlans.userId, user.id));
  const prefs = {
    days: b.days,
    startDate: b.startDate,
    calories: targets.calories,
    proteinG: targets.proteinG,
    diet: b.diet ?? profile.dietPreference,
    allergies: [...profile.allergies, ...profile.intolerances],
    maxCookMinutes: b.maxCookMinutes ?? null,
    budgetPerDayInr: b.budgetPerDayInr ?? null,
    region: b.region ?? null,
    availableIngredients: b.availableIngredients ?? [],
    trainingDays: plan?.isActive ? plan.schedule : [],
  };
  const result = await generateMealPlan(db, prefs);
  const saved = b.save ? await saveMealPlan(db, user.id, b.name || `Plan from ${b.startDate}`, prefs, result) : null;
  return { ...result, saved };
});

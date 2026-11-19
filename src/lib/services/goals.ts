import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { PLAN_TEMPLATES } from "@/data/workout-plans";
import { todayIn } from "@/lib/dates";
import { ApiError, notFound } from "@/lib/errors";
import type { GoalType } from "@/lib/nutrition/targets";
import { currentWeight, recalculateTargets, upsertProfile } from "./profile";

export const GOAL_INFO: Record<GoalType, { label: string; summary: string; rate: string; walkingSteps: number; cardio: string; notes: string[] }> = {
  weight_loss: { label: "Weight loss", summary: "Steady loss through a moderate calorie deficit, regular movement and strength training.", rate: "0.25–0.75 kg/week is a realistic, sustainable range", walkingSteps: 8000, cardio: "150–300 min/week moderate cardio (brisk walking counts)", notes: ["Keep protein high to protect muscle.", "Expect week-to-week fluctuations from water and salt."] },
  fat_loss: { label: "Fat loss", summary: "Lose fat while keeping muscle: deficit + high protein + progressive strength training.", rate: "≈0.5–1% of body weight per week", walkingSteps: 9000, cardio: "2–3 cardio sessions plus daily walking", notes: ["Strength training 3×/week signals the body to keep muscle.", "Track waist as well as weight."] },
  belly_fat_reduction: { label: "Belly fat reduction", summary: "Abdominal fat reduces with overall fat loss. Spot reduction (losing fat only from the belly by doing ab exercises) is not possible.", rate: "Waist typically drops ~1 cm per 1–1.5 kg lost, varying by person", walkingSteps: 9000, cardio: "Daily walking + 2–3 cardio sessions/week", notes: ["Core training builds strength, not local fat loss.", "Sleep and stress management help adherence."] },
  visible_abs: { label: "Visible abs", summary: "Abs become visible at a lower body-fat level that varies widely by person and genetics; it requires fat loss plus a trained core.", rate: "Can take many months; no guaranteed timeline", walkingSteps: 10000, cardio: "Daily walking + 2 cardio sessions/week", notes: ["Very low body fat is hard to maintain and isn't necessary for health.", "Train abs 2–3×/week with progressive loading."] },
  recomposition: { label: "Body recomposition", summary: "Build muscle and lose fat simultaneously with a small deficit, high protein and progressive overload.", rate: "Weight may barely move — track waist, strength and photos", walkingSteps: 8000, cardio: "Mostly walking; 1–2 cardio sessions", notes: ["Works best for beginners and those returning to training.", "Progress shows in measurements before the scale."] },
  muscle_gain: { label: "Muscle gain", summary: "A small surplus, high protein and progressive overload with adequate sleep.", rate: "≈0.25–0.5 kg/week for most (slower for experienced lifters)", walkingSteps: 7000, cardio: "1–2 easy sessions for heart health", notes: ["Add weight or reps every week where possible.", "If waist grows quickly, reduce the surplus."] },
  strength: { label: "Strength", summary: "Low-rep compound lifts with progressive overload and good recovery.", rate: "Track lifts — beginners often add 2.5–5 kg/week on main lifts", walkingSteps: 7000, cardio: "Light cardio for recovery", notes: ["Prioritise technique; deload every 4–8 weeks."] },
  endurance: { label: "Endurance", summary: "Mostly easy aerobic training with one or two harder sessions per week.", rate: "Improvements measured in pace/distance", walkingSteps: 8000, cardio: "3–5 sessions/week, ~80% easy", notes: ["Fuel longer sessions with carbohydrate.", "Increase weekly volume ≤10% per week."] },
  general_fitness: { label: "General fitness", summary: "Balanced strength, cardio and mobility habits.", rate: "Consistency matters more than pace", walkingSteps: 8000, cardio: "150 min/week moderate activity", notes: ["2–3 strength sessions/week for all major muscles."] },
  maintenance: { label: "Weight maintenance", summary: "Hold weight within a 1–2 kg band while keeping training consistent.", rate: "Weekly average weight stays within ±1 kg", walkingSteps: 8000, cardio: "150 min/week", notes: ["Use the weekly calorie budget rather than strict daily numbers."] },
};

const LOSS_GOALS: GoalType[] = ["weight_loss", "fat_loss", "belly_fat_reduction", "visible_abs"];

function pickPlanTemplate(goal: GoalType, location: string, days: number, experience: string) {
  const loc = location === "home" ? "home" : "gym";
  const candidates = PLAN_TEMPLATES.filter((p) => p.goals.includes(goal) && (loc === "home" ? p.location === "home" : true));
  const byDays = candidates.filter((p) => p.daysPerWeek <= Math.max(days, 3));
  const byLevel = byDays.filter((p) => experience === "advanced" || p.level !== "advanced");
  return byLevel[0] ?? byDays[0] ?? candidates[0] ?? PLAN_TEMPLATES.find((p) => p.key === (loc === "home" ? "home-bodyweight" : "full-body-beginner"))!;
}

/** Generates the full goal plan (nutrition, training, walking, recovery, milestones) from profile data. */
export async function createGoal(db: Db, userId: string, input: { type: GoalType; targetWeightKg?: number | null; targetWaistCm?: number | null }) {
  const [profile] = await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  if (!profile) throw new ApiError(400, "Complete onboarding first");
  const [prefs] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  const weight = await currentWeight(db, userId);
  const [waist] = await db.select().from(s.bodyMeasurements).where(eq(s.bodyMeasurements.userId, userId)).orderBy(desc(s.bodyMeasurements.date)).limit(1);

  if (input.targetWeightKg && weight && LOSS_GOALS.includes(input.type) && input.targetWeightKg >= weight) throw new ApiError(400, "For a loss goal, the target weight should be below your current weight");
  if (input.targetWeightKg && profile.heightCm) {
    const targetBmi = input.targetWeightKg / (profile.heightCm / 100) ** 2;
    if (targetBmi < 18.5) throw new ApiError(400, `That target corresponds to a BMI of ${targetBmi.toFixed(1)}, which is underweight. Choose a higher target.`);
  }

  await upsertProfile(db, userId, { primaryGoal: input.type, targetWeightKg: input.targetWeightKg ?? profile.targetWeightKg });
  const targets = await recalculateTargets(db, userId);
  const template = pickPlanTemplate(input.type, profile.trainingLocation, profile.workoutDaysPerWeek, profile.trainingExperience);
  const info = GOAL_INFO[input.type];

  const milestones: { title: string; metric: string; targetValue: number }[] = [];
  if (weight && input.targetWeightKg) {
    const diff = input.targetWeightKg - weight;
    const step = Math.sign(diff) * Math.max(1, Math.min(5, Math.abs(diff) / 4));
    for (let v = weight + step; Math.sign(diff) * (input.targetWeightKg - v) > 0.3; v += step) milestones.push({ title: `Reach ${v.toFixed(1)} kg`, metric: "weight_kg", targetValue: Math.round(v * 10) / 10 });
    milestones.push({ title: `Target: ${input.targetWeightKg} kg`, metric: "weight_kg", targetValue: input.targetWeightKg });
  }
  if (waist?.waistCm && input.targetWaistCm) milestones.push({ title: `Waist ${input.targetWaistCm} cm`, metric: "waist_cm", targetValue: input.targetWaistCm });
  milestones.push({ title: "30-day logging streak", metric: "streak_days", targetValue: 30 });
  milestones.push({ title: "12 workouts completed", metric: "workouts", targetValue: 12 });

  const plan = {
    goal: input.type,
    label: info.label,
    summary: info.summary,
    expectedRate: info.rate,
    nutrition: { calories: targets.calories, proteinG: targets.proteinG, carbsG: targets.carbsG, fatG: targets.fatG, fibreG: targets.fibreG, waterMl: targets.waterMl, rationale: (targets.computed as { rationale?: string[] }).rationale ?? [] },
    training: { templateKey: template.key, templateName: template.name, daysPerWeek: template.daysPerWeek, description: template.description },
    walking: { dailySteps: Math.max(info.walkingSteps, prefs?.stepGoal ?? 0) },
    cardio: info.cardio,
    recovery: ["7–9 hours of sleep", "At least 1–2 rest or light-activity days per week", "Deload or lighter week every 4–8 weeks of hard training"],
    sleepHours: 7.5,
    notes: info.notes,
    disclaimer: "Estimates only — individual results vary. Not medical advice; consult a professional if you have a health condition.",
  };

  await db.update(s.fitnessGoals).set({ status: "archived", updatedAt: new Date() }).where(and(eq(s.fitnessGoals.userId, userId), eq(s.fitnessGoals.status, "active")));
  const [goal] = await db
    .insert(s.fitnessGoals)
    .values({
      userId,
      type: input.type,
      startDate: todayIn(prefs?.timezone),
      startWeightKg: weight,
      targetWeightKg: input.targetWeightKg ?? null,
      startWaistCm: waist?.waistCm ?? null,
      targetWaistCm: input.targetWaistCm ?? null,
      plan,
    })
    .returning();
  if (milestones.length) await db.insert(s.goalMilestones).values(milestones.map((m, i) => ({ ...m, goalId: goal!.id, sort: i })));
  await activatePlan(db, userId, template.key);
  return goal!;
}

export async function activeGoal(db: Db, userId: string) {
  const [goal] = await db.select().from(s.fitnessGoals).where(and(eq(s.fitnessGoals.userId, userId), eq(s.fitnessGoals.status, "active"))).orderBy(desc(s.fitnessGoals.createdAt)).limit(1);
  if (!goal) return null;
  const milestones = await db.select().from(s.goalMilestones).where(eq(s.goalMilestones.goalId, goal.id)).orderBy(s.goalMilestones.sort);
  const weight = await currentWeight(db, userId);
  // Mark weight milestones achieved from real data.
  for (const m of milestones) {
    if (m.achievedAt || m.metric !== "weight_kg" || weight == null || goal.startWeightKg == null) continue;
    const loss = goal.startWeightKg > m.targetValue;
    if ((loss && weight <= m.targetValue) || (!loss && weight >= m.targetValue)) {
      m.achievedAt = new Date();
      await db.update(s.goalMilestones).set({ achievedAt: m.achievedAt }).where(eq(s.goalMilestones.id, m.id));
    }
  }
  const progress =
    goal.startWeightKg != null && goal.targetWeightKg != null && weight != null && goal.startWeightKg !== goal.targetWeightKg
      ? Math.max(0, Math.min(1, (goal.startWeightKg - weight) / (goal.startWeightKg - goal.targetWeightKg)))
      : null;
  return { goal, milestones, currentWeightKg: weight, progress };
}

export async function activatePlan(db: Db, userId: string, templateKey: string) {
  const t = PLAN_TEMPLATES.find((p) => p.key === templateKey);
  if (!t) throw notFound("Plan template");
  await db.update(s.workoutPlans).set({ isActive: false }).where(eq(s.workoutPlans.userId, userId));
  const schedules: Record<number, number[]> = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] };
  const [row] = await db
    .insert(s.workoutPlans)
    .values({ userId, templateKey: t.key, name: t.name, days: t.days, schedule: schedules[t.daysPerWeek] ?? [1, 3, 5], isActive: true })
    .returning();
  return row!;
}

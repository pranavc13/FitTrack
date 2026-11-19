import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { activeGoal, createGoal, GOAL_INFO } from "@/lib/services/goals";

export const GET = route(async ({ db, user }) => ({ active: await activeGoal(db, user.id), info: GOAL_INFO }));
export const POST = route(async ({ db, user, req }) => ({
  goal: await createGoal(
    db,
    user.id,
    await body(
      req,
      z.object({
        type: z.enum(["weight_loss", "fat_loss", "belly_fat_reduction", "muscle_gain", "recomposition", "visible_abs", "strength", "endurance", "general_fitness", "maintenance"]),
        targetWeightKg: z.number().min(30).max(300).nullable().optional(),
        targetWaistCm: z.number().min(40).max(200).nullable().optional(),
      }),
    ),
  ),
}));

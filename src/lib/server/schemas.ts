import { z } from "zod/v4";

export const RecipeInput = z.object({
  name: z.string().trim().min(1).max(120),
  servings: z.number().positive().max(100),
  servingLabel: z.string().max(80).optional(),
  cookedWeightG: z.number().positive().max(50000).nullable().optional(),
  cookingMethod: z.string().max(80).nullable().optional(),
  region: z.string().max(60).nullable().optional(),
  instructions: z.array(z.string().max(500)).max(30).optional(),
  ingredients: z
    .array(
      z.object({
        foodId: z.number().int().positive().nullable(),
        name: z.string().min(1).max(120),
        grams: z.number().positive().max(20000),
        role: z.enum(["main", "fat", "sugar", "water", "spice"]).optional(),
        isEstimated: z.boolean().optional(),
        display: z.string().max(60).nullable().optional(),
      }),
    )
    .min(1)
    .max(60),
});

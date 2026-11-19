import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { createCustomFood } from "@/lib/services/foods";

const n = z.number().min(0).nullable().optional();
const Input = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().max(80).nullable().optional(),
  servingLabel: z.string().max(80).nullable().optional(),
  servingGrams: z.number().positive().max(5000).nullable().optional(),
  per100g: z.object({ kcal: z.number().min(0).max(902), proteinG: n, carbsG: n, fatG: n, fibreG: n, sugarG: n, satFatG: n, sodiumMg: n, potassiumMg: n, calciumMg: n, ironMg: n }),
  foodType: z.enum(["custom", "packaged", "supplement"]).optional(),
});

export const POST = route(async ({ db, user, req }) => ({ food: await createCustomFood(db, user.id, await body(req, Input)) }));

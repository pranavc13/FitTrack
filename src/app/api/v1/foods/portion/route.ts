import { z } from "zod/v4";
import { query, route, zId } from "@/lib/server/api";
import { portionNutrition } from "@/lib/services/foods";

export const GET = route(
  async ({ db, user, req }) => {
    const q = query(req, z.object({ foodId: zId, quantity: z.coerce.number().positive().max(100000), unit: z.string().max(20) }));
    const p = await portionNutrition(db, user.id, q.foodId, q.quantity, q.unit);
    return { grams: p.grams, isEstimate: p.isEstimate, basis: p.basis, nutrients: p.nutrients };
  },
  { limit: 400 },
);

import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { copyDay, MEAL_TYPES } from "@/lib/services/diary";

export const POST = route(async ({ db, user, req }) => {
  const b = await body(req, z.object({ from: zDate, to: zDate, mealType: z.enum(MEAL_TYPES).optional() }));
  return copyDay(db, user.id, b.from, b.to, b.mealType);
});

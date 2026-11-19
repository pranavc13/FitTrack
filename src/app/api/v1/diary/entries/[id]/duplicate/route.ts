import { z } from "zod/v4";
import { body, route, zDate, zId } from "@/lib/server/api";
import { duplicateEntry, MEAL_TYPES } from "@/lib/services/diary";

export const POST = route<{ id: string }>(async ({ db, user, params, req }) => {
  const t = await body(req, z.object({ date: zDate.optional(), mealType: z.enum(MEAL_TYPES).optional() }));
  return { entry: await duplicateEntry(db, user.id, zId.parse(params.id), t) };
});

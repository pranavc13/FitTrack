import { z } from "zod/v4";
import { body, route, zDate, zId } from "@/lib/server/api";
import { deleteEntry, MEAL_TYPES, updateEntry } from "@/lib/services/diary";

const Patch = z.object({ quantity: z.number().positive().max(100000).optional(), unit: z.string().max(30).optional(), mealType: z.enum(MEAL_TYPES).optional(), date: zDate.optional() });

export const PATCH = route<{ id: string }>(async ({ db, user, params, req }) => ({ entry: await updateEntry(db, user.id, zId.parse(params.id), await body(req, Patch)) }));
export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteEntry(db, user.id, zId.parse(params.id));
  return { ok: true };
});

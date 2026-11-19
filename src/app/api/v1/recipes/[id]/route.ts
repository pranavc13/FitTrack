import { z } from "zod/v4";
import { body, query, route, zId } from "@/lib/server/api";
import { deleteRecipe, getRecipe, saveRecipe } from "@/lib/services/recipes";
import { RecipeInput } from "@/lib/server/schemas";

export const GET = route<{ id: string }>(async ({ db, user, params, req }) => {
  const q = query(req, z.object({ servings: z.coerce.number().positive().max(100).optional() }));
  return getRecipe(db, user.id, zId.parse(params.id), q.servings);
});

/** Editing creates a new version (history preserved). */
export const PUT = route<{ id: string }>(async ({ db, user, params, req }) => ({ recipe: await saveRecipe(db, user.id, await body(req, RecipeInput), zId.parse(params.id)) }));

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteRecipe(db, user.id, zId.parse(params.id));
  return { ok: true };
});

import { z } from "zod/v4";
import { query, route } from "@/lib/server/api";
import { compareRecipes } from "@/lib/services/recipes";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ ids: z.string().regex(/^\d+(,\d+)*$/) }));
  return { recipes: await compareRecipes(db, user.id, q.ids.split(",").map(Number)) };
});

import { z } from "zod/v4";
import { body, query, route } from "@/lib/server/api";
import { listRecipes, popularRegions, saveRecipe } from "@/lib/services/recipes";
import { RecipeInput } from "@/lib/server/schemas";

export const GET = route(async ({ db, user, req }) => {
  const q = query(
    req,
    z.object({
      q: z.string().max(80).optional(),
      region: z.string().max(60).optional(),
      diet: z.string().max(30).optional(),
      style: z.string().max(20).optional(),
      mine: z.enum(["1", "0"]).optional(),
      favorites: z.enum(["1", "0"]).optional(),
      highProtein: z.enum(["1", "0"]).optional(),
    }),
  );
  const [recipes, regions] = await Promise.all([
    listRecipes(db, user.id, { q: q.q, region: q.region, diet: q.diet, style: q.style, mine: q.mine === "1", favorites: q.favorites === "1", highProtein: q.highProtein === "1" }),
    popularRegions(db),
  ]);
  return { recipes, regions };
});

export const POST = route(async ({ db, user, req }) => ({ recipe: await saveRecipe(db, user.id, await body(req, RecipeInput)) }));

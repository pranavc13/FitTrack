import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { parseRecipeText } from "@/lib/ai/vision";
import { matchIngredient, previewRecipe, roleFor } from "@/lib/services/recipes";

/**
 * AI recipe recognition: free text → ingredients (with assumed quantities flagged) → matched to food
 * records → nutrition computed by the backend engine (never by the model).
 */
export const POST = route(
  async ({ db, user, req }) => {
    const { text } = await body(req, z.object({ text: z.string().min(5).max(2000) }));
    const { data } = await parseRecipeText(text);
    const ingredients = [];
    for (const ing of data.ingredients) {
      const isWater = /^water\b|^pani\b/i.test(ing.name);
      const candidates = isWater ? [] : await matchIngredient(db, user.id, ing.name.replace(/\(.*?\)/g, "").trim());
      const match = candidates[0] ?? null;
      ingredients.push({
        name: ing.name,
        stated: ing.quantity_as_stated,
        grams: Math.max(0.5, Math.round(ing.grams * 10) / 10),
        quantityWasGiven: ing.quantity_was_given,
        assumption: ing.assumption,
        role: isWater ? "water" : ing.is_cooking_fat ? "fat" : match ? roleFor(match) : "main",
        foodId: match?.id ?? null,
        foodName: match?.name ?? null,
        candidates: candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name, kcal100: c.kcal })),
      });
    }
    const preview = await previewRecipe(db, user.id, {
      name: data.dish_name,
      servings: data.servings > 0 ? data.servings : 1,
      ingredients: ingredients.map((i) => ({ foodId: i.foodId, name: i.name, grams: i.grams, role: i.role as "main" | "fat" | "sugar" | "water" | "spice" })),
    });
    return { dishName: data.dish_name, servings: data.servings > 0 ? data.servings : 1, cookingMethod: data.cooking_method, questions: data.questions, ingredients, preview };
  },
  { limit: 20 },
);

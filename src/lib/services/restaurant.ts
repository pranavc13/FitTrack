import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { INGREDIENTS, type IngredientKey } from "@/data/ingredients";
import { round, scaleNutrients } from "@/lib/nutrition/engine";
import { notFound } from "@/lib/errors";
import { per100 } from "./foods";

export async function listRestaurantDishes(db: Db, q?: string) {
  const rows = await db
    .select({ r: s.restaurantFoods, f: s.foods })
    .from(s.restaurantFoods)
    .innerJoin(s.foods, eq(s.foods.id, s.restaurantFoods.foodId))
    .where(q ? sql`lower(${s.restaurantFoods.dishName}) LIKE ${"%" + q.toLowerCase() + "%"}` : undefined)
    .orderBy(asc(s.restaurantFoods.dishName));
  return rows.map(({ r, f }) => ({
    id: r.id,
    dishName: r.dishName,
    style: r.style,
    portionLabel: r.portionLabel,
    foodId: f.id,
    recipeId: r.recipeId,
    kcalRange: [round(((f.kcal ?? 0) * r.portionGLow) / 100, 0), round(((f.kcal ?? 0) * r.portionGHigh) / 100, 0)],
    typicalKcal: round(((f.kcal ?? 0) * r.portionGTypical) / 100, 0),
    addOns: r.addOns,
    verified: r.verified,
  }));
}

/**
 * Nutrition RANGE for an outside-food order: dish portion (low/typical/high or custom grams) plus add-ons.
 * Restaurant food varies a lot; the range is the honest answer, and the typical value is what gets logged.
 */
export async function estimateRestaurant(db: Db, input: { restaurantFoodId: number; portion: "low" | "typical" | "high" | "custom"; customGrams?: number | null; addOns: string[] }) {
  const [row] = await db.select({ r: s.restaurantFoods, f: s.foods }).from(s.restaurantFoods).innerJoin(s.foods, eq(s.foods.id, s.restaurantFoods.foodId)).where(eq(s.restaurantFoods.id, input.restaurantFoodId));
  if (!row) throw notFound("Dish");
  const { r, f } = row;
  const grams = input.portion === "custom" && input.customGrams ? input.customGrams : input.portion === "low" ? r.portionGLow : input.portion === "high" ? r.portionGHigh : r.portionGTypical;
  const chosen = r.addOns.filter((a) => input.addOns.includes(a.name));
  const descs = chosen.map((a) => INGREDIENTS[a.foodRef as IngredientKey]?.usda).filter(Boolean) as string[];
  const addFoods = descs.length ? await db.select().from(s.foods).where(and(inArray(s.foods.name, descs), isNull(s.foods.ownerUserId))) : [];
  const addNutrition = chosen.map((a) => {
    const food = addFoods.find((x) => x.name === INGREDIENTS[a.foodRef as IngredientKey]?.usda);
    return { name: a.name, grams: a.grams, foodId: food?.id ?? null, nutrients: food ? scaleNutrients(per100(food), a.grams) : null };
  });
  const base = (g: number) => scaleNutrients(per100(f), g);
  const extraKcal = addNutrition.reduce((acc, a) => acc + (a.nutrients?.kcal ?? 0), 0);
  const main = base(grams);
  return {
    dish: r.dishName,
    foodId: f.id,
    grams,
    kcal: round((main.kcal ?? 0) + extraKcal, 0),
    proteinG: round((main.proteinG ?? 0) + addNutrition.reduce((acc, a) => acc + (a.nutrients?.proteinG ?? 0), 0), 1),
    range: {
      kcalLow: round((base(r.portionGLow).kcal ?? 0) + extraKcal * 0.7, 0),
      kcalHigh: round((base(r.portionGHigh).kcal ?? 0) + extraKcal * 1.3, 0),
    },
    addOns: addNutrition.map((a) => ({ name: a.name, grams: a.grams, foodId: a.foodId, kcal: round(a.nutrients?.kcal ?? 0, 0) })),
    basis: r.verified ? "Verified restaurant nutrition" : "Estimated: restaurant-style recipe calculated from USDA ingredients × typical portion range. Actual restaurant food varies widely.",
  };
}

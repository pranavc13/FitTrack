import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { computeRecipeNutrition, CORE_NUTRIENTS, round, scaleNutrients, type IngredientRole, type Nutrients } from "@/lib/nutrition/engine";
import { ApiError, notFound } from "@/lib/errors";
import { normalizeQuery, per100, searchFoods } from "./foods";

type FoodRow = typeof s.foods.$inferSelect;

const visible = (userId: string) => or(isNull(s.recipes.ownerUserId), eq(s.recipes.ownerUserId, userId));

export async function listRecipes(
  db: Db,
  userId: string,
  opts: { q?: string; region?: string; diet?: string; style?: string; mine?: boolean; favorites?: boolean; highProtein?: boolean; limit?: number },
) {
  const conds = [visible(userId), eq(s.recipes.isCurrent, true)];
  if (opts.region) conds.push(eq(s.recipes.region, opts.region));
  if (opts.diet) conds.push(sql`${opts.diet} = ANY(${s.recipes.dietTags})`);
  if (opts.style) conds.push(eq(s.recipes.style, opts.style));
  if (opts.mine) conds.push(eq(s.recipes.ownerUserId, userId));
  if (opts.favorites) conds.push(sql`${s.recipes.id} IN (SELECT recipe_id FROM recipe_favorites WHERE user_id = ${userId})`);
  if (opts.q) {
    const q = normalizeQuery(opts.q);
    conds.push(sql`(lower(${s.recipes.name}) LIKE ${"%" + q + "%"} OR ${q} <% lower(${s.recipes.name}) OR lower(coalesce(${s.recipes.region},'')) LIKE ${"%" + q + "%"}
      OR ${s.recipes.foodId} IN (SELECT food_id FROM food_synonyms WHERE lower(name) LIKE ${"%" + q + "%"}))`);
  }
  const rows = await db
    .select({
      id: s.recipes.id,
      slug: s.recipes.slug,
      name: s.recipes.name,
      nameHi: s.recipes.nameHi,
      region: s.recipes.region,
      style: s.recipes.style,
      servings: s.recipes.servings,
      servingLabel: s.recipes.servingLabel,
      cookedWeightG: s.recipes.cookedWeightG,
      dietTags: s.recipes.dietTags,
      tags: s.recipes.tags,
      variantKey: s.recipes.variantKey,
      variantLabel: s.recipes.variantLabel,
      ownerUserId: s.recipes.ownerUserId,
      prepMinutes: s.recipes.prepMinutes,
      cookMinutes: s.recipes.cookMinutes,
      foodId: s.recipes.foodId,
      kcal100: s.foods.kcal,
      protein100: s.foods.proteinG,
      fibre100: s.foods.fibreG,
      servingG: sql<number>`(SELECT grams FROM food_servings WHERE food_id = ${s.recipes.foodId} AND is_default LIMIT 1)`,
    })
    .from(s.recipes)
    .leftJoin(s.foods, eq(s.foods.id, s.recipes.foodId))
    .where(and(...conds))
    .orderBy(asc(s.recipes.name))
    .limit(opts.limit ?? 200);
  const out = rows.map((r) => {
    const g = Number(r.servingG ?? 0);
    return {
      ...r,
      perServing: {
        kcal: r.kcal100 != null ? Math.round((r.kcal100 * g) / 100) : null,
        proteinG: r.protein100 != null ? round((r.protein100 * g) / 100) : null,
        fibreG: r.fibre100 != null ? round((r.fibre100 * g) / 100) : null,
        grams: g,
      },
    };
  });
  return opts.highProtein ? out.filter((r) => r.perServing.kcal && r.perServing.proteinG && (r.perServing.proteinG * 4) / r.perServing.kcal >= 0.2) : out;
}

export async function getRecipe(db: Db, userId: string, id: number, scaleServings?: number) {
  const [recipe] = await db.select().from(s.recipes).where(and(eq(s.recipes.id, id), visible(userId)));
  if (!recipe) throw notFound("Recipe");
  const ings = await db
    .select({ ing: s.recipeIngredients, food: s.foods })
    .from(s.recipeIngredients)
    .leftJoin(s.foods, eq(s.foods.id, s.recipeIngredients.foodId))
    .where(eq(s.recipeIngredients.recipeId, id))
    .orderBy(asc(s.recipeIngredients.sort));
  const factor = scaleServings && scaleServings > 0 ? scaleServings / recipe.servings : 1;
  const servings = recipe.servings * factor;
  const cooked = recipe.cookedWeightG ? recipe.cookedWeightG * factor : null;
  const nutrition = computeRecipeNutrition(
    ings.map(({ ing, food }) => ({ name: ing.name, grams: ing.quantityG * factor, per100g: food ? per100(food) : null, role: ing.role as IngredientRole })),
    { servings, cookedWeightG: cooked },
  );
  const ingredients = ings.map(({ ing, food }) => {
    const grams = ing.quantityG * factor;
    const contrib = food ? scaleNutrients(per100(food), grams) : null;
    return {
      id: ing.id,
      foodId: ing.foodId,
      name: ing.name,
      foodName: food?.name ?? null,
      grams: round(grams, 1),
      display: ing.displayUnit,
      role: ing.role,
      isEstimated: ing.isEstimated,
      note: ing.note,
      kcal: contrib?.kcal != null ? round(contrib.kcal, 0) : 0,
      proteinG: contrib?.proteinG != null ? round(contrib.proteinG, 1) : 0,
      kcalShare: nutrition.total.kcal > 0 && contrib?.kcal ? round((contrib.kcal / nutrition.total.kcal) * 100, 0) : 0,
      dataQuality: food?.dataQuality ?? null,
    };
  });
  const variants = recipe.variantKey
    ? await db
        .select({ id: s.recipes.id, name: s.recipes.name, variantLabel: s.recipes.variantLabel, style: s.recipes.style })
        .from(s.recipes)
        .where(and(eq(s.recipes.variantKey, recipe.variantKey), visible(userId), eq(s.recipes.isCurrent, true)))
    : [];
  const [fav] = await db.select().from(s.recipeFavorites).where(and(eq(s.recipeFavorites.userId, userId), eq(s.recipeFavorites.recipeId, id)));
  const versions = recipe.ownerUserId ? await recipeVersions(db, recipe) : [];
  return {
    recipe,
    scale: { factor, servings },
    ingredients,
    nutrition: {
      rawWeightG: round(nutrition.rawWeightG, 0),
      cookedWeightG: round(nutrition.cookedWeightG, 0),
      cookedWeightIsAssumed: !cooked,
      yieldFactor: round(nutrition.yieldFactor, 2),
      servingWeightG: round(nutrition.servingWeightG, 0),
      total: roundAll(nutrition.total),
      perServing: roundAll(nutrition.perServing),
      per100g: roundAll(nutrition.per100g),
      addedFatKcal: round(nutrition.addedFatKcal, 0),
      addedSugarKcal: round(nutrition.addedSugarKcal, 0),
      coverage: nutrition.coverage,
      unmatched: nutrition.unmatched,
    },
    variants,
    isFavorite: Boolean(fav),
    versions,
  };
}

function roundAll(n: Record<(typeof CORE_NUTRIENTS)[number], number>) {
  return Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, round(n[k] ?? 0, k === "kcal" ? 0 : 1)]));
}

async function recipeVersions(db: Db, recipe: typeof s.recipes.$inferSelect) {
  // Walk back through parents (bounded).
  const out: { id: number; version: number; updatedAt: Date }[] = [];
  let cur: typeof recipe | undefined = recipe;
  for (let i = 0; cur && i < 20; i++) {
    out.push({ id: cur.id, version: cur.version, updatedAt: cur.updatedAt });
    if (!cur.parentRecipeId) break;
    [cur] = await db.select().from(s.recipes).where(eq(s.recipes.id, cur.parentRecipeId));
  }
  return out;
}

export interface RecipeInput {
  name: string;
  servings: number;
  servingLabel?: string;
  cookedWeightG?: number | null;
  cookingMethod?: string | null;
  region?: string | null;
  instructions?: string[];
  ingredients: { foodId: number | null; name: string; grams: number; role?: IngredientRole; isEstimated?: boolean; display?: string | null }[];
}

async function foodsById(db: Db, userId: string, ids: number[]) {
  if (!ids.length) return new Map<number, FoodRow>();
  const rows = await db
    .select()
    .from(s.foods)
    .where(and(inArray(s.foods.id, ids), or(isNull(s.foods.ownerUserId), eq(s.foods.ownerUserId, userId))));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Preview nutrition for an unsaved recipe (used by the builder and AI parser). */
export async function previewRecipe(db: Db, userId: string, input: RecipeInput) {
  const foods = await foodsById(db, userId, input.ingredients.flatMap((i) => (i.foodId ? [i.foodId] : [])));
  const n = computeRecipeNutrition(
    input.ingredients.map((i) => ({
      name: i.name,
      grams: i.grams,
      per100g: i.role === "water" ? null : i.foodId && foods.get(i.foodId) ? per100(foods.get(i.foodId)!) : null,
      role: i.role ?? (i.foodId && foods.get(i.foodId) ? roleFor(foods.get(i.foodId)!) : "main"),
    })),
    { servings: input.servings, cookedWeightG: input.cookedWeightG },
  );
  return {
    rawWeightG: round(n.rawWeightG, 0),
    cookedWeightG: round(n.cookedWeightG, 0),
    servingWeightG: round(n.servingWeightG, 0),
    total: roundAll(n.total),
    perServing: roundAll(n.perServing),
    per100g: roundAll(n.per100g),
    addedFatKcal: round(n.addedFatKcal, 0),
    addedSugarKcal: round(n.addedSugarKcal, 0),
    coverage: n.coverage,
    unmatched: n.unmatched,
  };
}

/** Infers the hidden-calorie role of an ingredient food from its name. */
export function roleFor(food: Pick<FoodRow, "name">): IngredientRole {
  const n = food.name.toLowerCase();
  if (/^oil,|\boil\b|ghee|^butter,|clarified butter|margarine|shortening|lard/.test(n) && !/oil-roasted|in oil/.test(n)) return "fat";
  if (/^sugars?,|honey|jaggery|syrup|ketchup/.test(n)) return "sugar";
  if (/^spices,|^salt,/.test(n)) return "spice";
  if (/^water\b/.test(n)) return "water";
  return "main";
}

/**
 * Saves a user recipe. When `previousId` is given, a new version row is created that points at the
 * previous one (history is preserved; the old version is marked not current).
 */
export async function saveRecipe(db: Db, userId: string, input: RecipeInput, previousId?: number) {
  if (!input.ingredients.length) throw new ApiError(400, "Add at least one ingredient");
  let parent: typeof s.recipes.$inferSelect | undefined;
  if (previousId) {
    [parent] = await db.select().from(s.recipes).where(and(eq(s.recipes.id, previousId), eq(s.recipes.ownerUserId, userId)));
    if (!parent) throw notFound("Recipe");
  }
  const preview = await previewRecipe(db, userId, input);
  if (preview.coverage < 0.6) throw new ApiError(400, "Too many ingredients are unmatched to nutrition records — match them before saving", preview.unmatched);
  const foods = await foodsById(db, userId, input.ingredients.flatMap((i) => (i.foodId ? [i.foodId] : [])));
  const anyEstimated = input.ingredients.some((i) => i.isEstimated);

  const [food] = await db
    .insert(s.foods)
    .values({
      name: input.name.trim(),
      ownerUserId: userId,
      foodType: "dish",
      state: "prepared",
      ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, preview.per100g[k]])),
      dataQuality: "calculated",
      confidence: anyEstimated || preview.coverage < 1 ? 0.6 : 0.75,
      searchText: normalizeQuery(input.name),
      popularity: 60,
    })
    .returning();
  const [recipe] = await db
    .insert(s.recipes)
    .values({
      ownerUserId: userId,
      name: input.name.trim(),
      region: input.region ?? null,
      cuisine: "Indian",
      servings: input.servings,
      servingLabel: input.servingLabel?.trim() || "serving",
      cookedWeightG: input.cookedWeightG ?? null,
      cookingMethod: input.cookingMethod ?? null,
      instructions: input.instructions ?? [],
      foodId: food!.id,
      parentRecipeId: parent?.id ?? null,
      version: (parent?.version ?? 0) + 1,
      variantKey: parent?.variantKey ?? null,
      dietTags: [],
      sourceNote: "Your recipe — nutrition calculated from ingredients",
    })
    .returning();
  await db.update(s.foods).set({ recipeId: recipe!.id }).where(eq(s.foods.id, food!.id));
  await db.insert(s.recipeIngredients).values(
    input.ingredients.map((i, idx) => ({
      recipeId: recipe!.id,
      foodId: i.foodId,
      name: i.name,
      quantityG: i.grams,
      displayUnit: i.display ?? null,
      role: i.role ?? (i.foodId && foods.get(i.foodId) ? roleFor(foods.get(i.foodId)!) : "main"),
      isEstimated: Boolean(i.isEstimated),
      sort: idx,
    })),
  );
  await db.insert(s.foodServings).values([
    { foodId: food!.id, label: `1 ${input.servingLabel?.trim() || "serving"}`, unit: "serving", amount: 1, grams: Math.round(preview.servingWeightG), isDefault: true, source: "recipe" },
    { foodId: food!.id, label: `Whole recipe (${input.servings} servings)`, unit: "recipe", amount: 1, grams: Math.round(preview.cookedWeightG), source: "recipe" },
  ]);
  if (parent) {
    await db.update(s.recipes).set({ isCurrent: false }).where(eq(s.recipes.id, parent.id));
    await db.update(s.recipeFavorites).set({ recipeId: recipe!.id }).where(and(eq(s.recipeFavorites.userId, userId), eq(s.recipeFavorites.recipeId, parent.id)));
  }
  return recipe!;
}

/** Copies a catalogue recipe into the user's library so they can edit quantities. */
export async function forkRecipe(db: Db, userId: string, id: number) {
  const detail = await getRecipe(db, userId, id);
  return saveRecipe(db, userId, {
    name: `${detail.recipe.name} (my version)`,
    servings: detail.recipe.servings,
    servingLabel: detail.recipe.servingLabel,
    cookedWeightG: detail.recipe.cookedWeightG,
    cookingMethod: detail.recipe.cookingMethod,
    region: detail.recipe.region,
    instructions: detail.recipe.instructions,
    ingredients: detail.ingredients.map((i) => ({ foodId: i.foodId, name: i.name, grams: i.grams, role: i.role as IngredientRole, isEstimated: i.isEstimated, display: i.display })),
  });
}

export async function deleteRecipe(db: Db, userId: string, id: number) {
  const [r] = await db.select().from(s.recipes).where(and(eq(s.recipes.id, id), eq(s.recipes.ownerUserId, userId)));
  if (!r) throw notFound("Recipe");
  // Soft delete: logged entries keep their nutrition snapshots and versions stay in history.
  await db.update(s.recipes).set({ isCurrent: false }).where(eq(s.recipes.id, id));
  await db.delete(s.recipeFavorites).where(eq(s.recipeFavorites.recipeId, id));
}

export async function setRecipeFavorite(db: Db, userId: string, recipeId: number, on: boolean) {
  if (on) await db.insert(s.recipeFavorites).values({ userId, recipeId }).onConflictDoNothing();
  else await db.delete(s.recipeFavorites).where(and(eq(s.recipeFavorites.userId, userId), eq(s.recipeFavorites.recipeId, recipeId)));
}

/** Per-serving nutrition for several recipes side by side (variants, alternatives). */
export async function compareRecipes(db: Db, userId: string, ids: number[]) {
  const out = [];
  for (const id of ids.slice(0, 6)) {
    const d = await getRecipe(db, userId, id);
    out.push({ id, name: d.recipe.name, style: d.recipe.style, variantLabel: d.recipe.variantLabel, servingLabel: d.recipe.servingLabel, perServing: d.nutrition.perServing, servingWeightG: d.nutrition.servingWeightG, addedFatKcalPerServing: round(d.nutrition.addedFatKcal / d.recipe.servings, 0) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Substitutions                                                       */
/* ------------------------------------------------------------------ */

/** Nutritionally-motivated swap suggestions, expressed as ingredient-name pairs resolved against the catalogue. */
const SWAPS: { from: RegExp; to: string; why: string; goal: "lower_kcal" | "higher_protein" | "higher_fibre" }[] = [
  { from: /cream, fluid, heavy/i, to: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", why: "Hung curd/Greek yogurt gives creaminess with far less fat", goal: "lower_kcal" },
  { from: /^butter, salted/i, to: "Oil, soybean, salad or cooking", why: "Same fat energy — the real saving comes from using less; measure it", goal: "lower_kcal" },
  { from: /rice, white/i, to: "Rice, brown, long-grain, raw (Includes foods for USDA's Food Distribution Program)", why: "Brown rice has ~3× the fibre", goal: "higher_fibre" },
  { from: /wheat flour, white/i, to: "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)", why: "Whole wheat atta adds fibre and micronutrients", goal: "higher_fibre" },
  { from: /potatoes, flesh/i, to: "Cauliflower, raw", why: "Cauliflower has a fraction of the energy for the same volume", goal: "lower_kcal" },
  { from: /cheese, paneer/i, to: "Tofu, raw, firm, prepared with calcium sulfate", why: "Firm tofu has fewer calories per gram of protein", goal: "lower_kcal" },
  { from: /chickpeas|pigeon peas|lentils|mung/i, to: "Soy flour, defatted", why: "Adding soya chunks raises protein substantially", goal: "higher_protein" },
  { from: /yogurt, plain, whole/i, to: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", why: "Greek/hung curd roughly doubles protein per gram", goal: "higher_protein" },
  { from: /milk, whole/i, to: "Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)", why: "Skimmed milk keeps the protein, drops most fat", goal: "lower_kcal" },
  { from: /sugars, granulated/i, to: "__reduce__", why: "Halving added sugar is the simplest saving", goal: "lower_kcal" },
  { from: /^oil,|clarified butter/i, to: "__reduce__", why: "Measuring oil (1 tsp ≈ 40 kcal) is the biggest lever in most Indian dishes", goal: "lower_kcal" },
];

export async function suggestSubstitutions(db: Db, userId: string, recipeId: number) {
  const detail = await getRecipe(db, userId, recipeId);
  const targets = Array.from(new Set(SWAPS.filter((sw) => sw.to !== "__reduce__").map((sw) => sw.to)));
  const swapFoods = await db.select().from(s.foods).where(and(inArray(s.foods.name, targets), isNull(s.foods.ownerUserId)));
  const byName = new Map(swapFoods.map((f) => [f.name, f]));
  const suggestions = [];
  for (const ing of detail.ingredients) {
    if (!ing.foodName || !ing.foodId) continue;
    const [food] = await db.select().from(s.foods).where(eq(s.foods.id, ing.foodId));
    if (!food) continue;
    for (const sw of SWAPS) {
      if (!sw.from.test(ing.foodName)) continue;
      const before = scaleNutrients(per100(food), ing.grams);
      if (sw.to === "__reduce__") {
        if (ing.grams < 5) continue;
        const after = scaleNutrients(per100(food), ing.grams / 2);
        suggestions.push({ ingredient: ing.name, grams: ing.grams, swapTo: `Half the ${ing.name} (${round(ing.grams / 2, 0)} g)`, why: sw.why, goal: sw.goal, deltaPerServing: delta(before, after, detail.recipe.servings * detail.scale.factor) });
        continue;
      }
      const target = byName.get(sw.to);
      if (!target) continue;
      const after = scaleNutrients(per100(target), ing.grams);
      suggestions.push({ ingredient: ing.name, grams: ing.grams, swapTo: target.name, swapFoodId: target.id, why: sw.why, goal: sw.goal, deltaPerServing: delta(before, after, detail.recipe.servings * detail.scale.factor) });
    }
  }
  return suggestions;
}

function delta(before: Nutrients, after: Nutrients, servings: number) {
  return {
    kcal: round(((after.kcal ?? 0) - (before.kcal ?? 0)) / servings, 0),
    proteinG: round(((after.proteinG ?? 0) - (before.proteinG ?? 0)) / servings, 1),
    fibreG: round(((after.fibreG ?? 0) - (before.fibreG ?? 0)) / servings, 1),
  };
}

/** Candidate catalogue foods for a free-text ingredient name (for AI recipe parsing / scan matching). */
export async function matchIngredient(db: Db, userId: string, name: string, preferRaw = true) {
  const results = await searchFoods(db, userId, name, { limit: 8 });
  // Prefer raw ingredients for recipe building (cooked/prepared dishes double-count cooking).
  const ranked = preferRaw
    ? [...results].sort((a, b) => Number(b.state === "raw" || b.foodType === "ingredient") - Number(a.state === "raw" || a.foodType === "ingredient"))
    : results;
  return ranked.slice(0, 5);
}

export async function popularRegions(db: Db) {
  return rowsOf<{ region: string; n: number }>(
    await db.execute(sql`SELECT region, count(*)::int n FROM recipes WHERE owner_user_id IS NULL AND region IS NOT NULL GROUP BY region ORDER BY n DESC`),
  );
}


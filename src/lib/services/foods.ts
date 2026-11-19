import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { CORE_NUTRIENTS, scaleNutrients, validatePer100g, type Nutrients } from "@/lib/nutrition/engine";
import { GENERIC_MEASURES, resolveGrams, type ServingOption } from "@/lib/nutrition/units";
import { ApiError, notFound } from "@/lib/errors";

export const normalizeQuery = (q: string) =>
  q.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

export interface FoodSearchResult {
  id: number;
  name: string;
  nameHi: string | null;
  brand: string | null;
  foodType: string;
  state: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  dataQuality: string;
  confidence: number;
  source: string | null;
  recipeId: number | null;
  isCustom: boolean;
  matchedSynonym: string | null;
  defaultServing: { label: string; grams: number } | null;
}

/**
 * Ranked fuzzy search across names, Hindi/regional synonyms and aliases.
 * Score = best of (word similarity on the name/search text, synonym similarity) + small boosts for
 * exact prefix matches, curated/popular items and the user's own foods.
 * Private custom foods are only visible to their owner.
 */
export async function searchFoods(
  db: Db,
  userId: string,
  rawQuery: string,
  opts: { limit?: number; type?: string; offset?: number } = {},
): Promise<FoodSearchResult[]> {
  const q = normalizeQuery(rawQuery);
  if (q.length < 2 && !/[ऀ-ॿ]/.test(rawQuery)) return [];
  const limit = Math.min(opts.limit ?? 25, 50);
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const typeFilter = opts.type ? sql`AND f.food_type = ${opts.type}` : sql``;
  const rows = rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      WITH syn AS (
        SELECT food_id, max(similarity(lower(name), ${q})) AS sim,
               (array_agg(name ORDER BY similarity(lower(name), ${q}) DESC))[1] AS matched
        FROM food_synonyms
        WHERE lower(name) % ${q} OR lower(name) LIKE ${like} OR ${rawQuery.trim()} = name
        GROUP BY food_id
      ),
      candidates AS (
        SELECT f.id, greatest(word_similarity(${q}, f.search_text), coalesce(syn.sim, 0)) AS base, syn.matched
        FROM foods f
        LEFT JOIN syn ON syn.food_id = f.id
        WHERE (f.owner_user_id IS NULL OR f.owner_user_id = ${userId})
          AND f.kcal IS NOT NULL
          AND (syn.food_id IS NOT NULL OR f.search_text LIKE ${like} OR ${q} <% f.search_text)
          ${typeFilter}
      )
      SELECT f.id, f.name, f.name_hi AS "nameHi", f.brand, f.food_type AS "foodType", f.state, f.kcal,
             f.protein_g AS "proteinG", f.carbs_g AS "carbsG", f.fat_g AS "fatG", f.fibre_g AS "fibreG",
             f.data_quality AS "dataQuality", f.confidence, src.name AS source, f.recipe_id AS "recipeId",
             (f.owner_user_id IS NOT NULL) AS "isCustom", c.matched AS "matchedSynonym",
             (c.base
               + CASE WHEN f.search_text LIKE ${prefix} OR lower(f.name) LIKE ${prefix} THEN 0.35 ELSE 0 END
               + CASE WHEN c.matched IS NOT NULL AND lower(c.matched) = ${q} THEN 0.5 ELSE 0 END
               + least(f.popularity, 100) / 400.0
               + CASE WHEN f.owner_user_id IS NOT NULL THEN 0.2 ELSE 0 END
               - CASE WHEN f.name ILIKE '%restaurant,%' OR f.name ILIKE '%baby food%' OR f.name ILIKE '%infant%' THEN 0.15 ELSE 0 END
               - length(f.name) / 2000.0) AS score
      FROM candidates c
      JOIN foods f ON f.id = c.id
      LEFT JOIN food_sources src ON src.id = f.source_id
      ORDER BY score DESC, f.id
      LIMIT ${limit} OFFSET ${opts.offset ?? 0}`),
  );
  const ids = rows.map((r) => Number(r.id));
  const servings = ids.length
    ? await db.select().from(s.foodServings).where(and(inArray(s.foodServings.foodId, ids), eq(s.foodServings.isDefault, true)))
    : [];
  const servingBy = new Map(servings.map((sv) => [sv.foodId, sv]));
  return rows.map((r) => {
    const sv = servingBy.get(Number(r.id));
    return {
      ...(r as unknown as FoodSearchResult),
      id: Number(r.id),
      kcal: r.kcal == null ? null : Number(r.kcal),
      confidence: Number(r.confidence),
      defaultServing: sv ? { label: sv.label, grams: sv.grams } : null,
    };
  });
}

export async function getFood(db: Db, userId: string, id: number) {
  const [food] = await db
    .select()
    .from(s.foods)
    .where(and(eq(s.foods.id, id), or(isNull(s.foods.ownerUserId), eq(s.foods.ownerUserId, userId))));
  if (!food) throw notFound("Food");
  const [servings, synonyms, extra, source, favorite] = await Promise.all([
    db.select().from(s.foodServings).where(eq(s.foodServings.foodId, id)).orderBy(desc(s.foodServings.isDefault), s.foodServings.grams),
    db.select().from(s.foodSynonyms).where(eq(s.foodSynonyms.foodId, id)),
    db.select().from(s.foodNutrients).where(eq(s.foodNutrients.foodId, id)),
    food.sourceId ? db.select().from(s.foodSources).where(eq(s.foodSources.id, food.sourceId)) : Promise.resolve([]),
    db.select().from(s.foodFavorites).where(and(eq(s.foodFavorites.userId, userId), eq(s.foodFavorites.foodId, id))),
  ]);
  const [product] = await db.select().from(s.packagedProducts).where(eq(s.packagedProducts.foodId, id));
  return {
    ...food,
    servings: servings.map((sv) => ({ id: sv.id, label: sv.label, unit: sv.unit, amount: sv.amount, grams: sv.grams, isDefault: sv.isDefault })),
    synonyms: synonyms.map((x) => ({ name: x.name, language: x.language })),
    extraNutrients: extra.map((x) => ({ code: x.code, amount: x.amount, unit: x.unit })),
    source: source[0] ?? null,
    isFavorite: favorite.length > 0,
    product: product ?? null,
    validation: validatePer100g(per100(food)),
  };
}

export function per100(food: typeof s.foods.$inferSelect): Nutrients {
  return Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, food[k]])) as Nutrients;
}

/** Resolves a quantity/unit to grams for a specific food and computes nutrients for that portion. */
export async function portionNutrition(db: Db, userId: string, foodId: number, quantity: number, unit: string) {
  const [food] = await db
    .select()
    .from(s.foods)
    .where(and(eq(s.foods.id, foodId), or(isNull(s.foods.ownerUserId), eq(s.foods.ownerUserId, userId))));
  if (!food) throw notFound("Food");
  const servings: ServingOption[] = (await db.select().from(s.foodServings).where(eq(s.foodServings.foodId, foodId))).map((sv) => ({
    label: sv.label,
    unit: sv.unit,
    amount: sv.amount,
    grams: sv.grams,
  }));
  const resolved = resolveGrams(quantity, unit, [...servings, ...(["katori", "bowl", "glass"].includes(unit) ? GENERIC_MEASURES : [])], food.densityGPerMl);
  return { food, grams: resolved.grams, isEstimate: resolved.isEstimate, basis: resolved.basis, nutrients: scaleNutrients(per100(food), resolved.grams) };
}

export interface CustomFoodInput {
  name: string;
  brand?: string | null;
  servingLabel?: string | null;
  servingGrams?: number | null;
  per100g: Partial<Nutrients>;
  dataQuality?: "user" | "ocr" | "verified" | "crowdsourced";
  foodType?: "custom" | "packaged" | "supplement";
}

export async function createCustomFood(db: Db, userId: string, input: CustomFoodInput) {
  const problems = validatePer100g(input.per100g);
  if (problems.length) throw new ApiError(400, "Nutrition values look inconsistent", problems);
  if (input.per100g.kcal == null) throw new ApiError(400, "Energy (kcal) is required");
  const [food] = await db
    .insert(s.foods)
    .values({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      ownerUserId: userId,
      foodType: input.foodType ?? "custom",
      state: input.foodType === "packaged" ? "packaged" : "not_applicable",
      ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, input.per100g[k] ?? null])),
      dataQuality: input.dataQuality ?? "user",
      confidence: input.dataQuality === "verified" ? 0.9 : 0.7,
      searchText: normalizeQuery(`${input.name} ${input.brand ?? ""}`),
    })
    .returning();
  if (input.servingGrams && input.servingGrams > 0) {
    await db.insert(s.foodServings).values({
      foodId: food!.id,
      label: input.servingLabel?.trim() || `1 serving (${input.servingGrams} g)`,
      unit: "serving",
      amount: 1,
      grams: input.servingGrams,
      isDefault: true,
      source: "user",
    });
  }
  return food!;
}

export async function recentFoods(db: Db, userId: string, limit = 20) {
  const rows = rowsOf<Record<string, unknown>>(
    await db.execute(sql`
      SELECT f.id, f.name, f.kcal, f.protein_g AS "proteinG", max(me.logged_at) AS last, count(*) AS uses,
             (array_agg(me.quantity ORDER BY me.logged_at DESC))[1] AS "lastQuantity",
             (array_agg(me.unit ORDER BY me.logged_at DESC))[1] AS "lastUnit",
             (array_agg(me.grams ORDER BY me.logged_at DESC))[1] AS "lastGrams"
      FROM meal_entries me JOIN foods f ON f.id = me.food_id
      WHERE me.user_id = ${userId}
      GROUP BY f.id ORDER BY last DESC LIMIT ${limit}`),
  );
  return rows.map((r) => ({ ...r, id: Number(r.id), uses: Number(r.uses) }));
}

export async function favoriteFoods(db: Db, userId: string) {
  return db
    .select({ id: s.foods.id, name: s.foods.name, kcal: s.foods.kcal, proteinG: s.foods.proteinG })
    .from(s.foodFavorites)
    .innerJoin(s.foods, eq(s.foods.id, s.foodFavorites.foodId))
    .where(eq(s.foodFavorites.userId, userId))
    .orderBy(desc(s.foodFavorites.createdAt));
}

export async function setFavorite(db: Db, userId: string, foodId: number, on: boolean) {
  if (on) await db.insert(s.foodFavorites).values({ userId, foodId }).onConflictDoNothing();
  else await db.delete(s.foodFavorites).where(and(eq(s.foodFavorites.userId, userId), eq(s.foodFavorites.foodId, foodId)));
}

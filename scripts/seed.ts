/**
 * Seeds reference data on top of the USDA import:
 *   1. Ingredient synonyms (Hindi/regional names) on USDA records
 *   2. Indian recipe library → recipes, ingredients and derived logged-food records
 *   3. Restaurant portions
 *   4. Activities (2024 Compendium + labelled proxies)
 *   5. Exercise library
 * Idempotent: safe to re-run after editing src/data/*.
 */
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as s from "../src/db/schema";
import { INGREDIENTS, type IngredientKey } from "../src/data/ingredients";
import { RECIPE_VARIANT_GROUPS, SEED_RECIPES } from "../src/data/recipes";
import { RESTAURANT_DISHES } from "../src/data/restaurant";
import { categorizeCompendium, PROXY_ACTIVITIES } from "../src/data/activities";
import { EXERCISES } from "../src/data/exercises";
import { computeRecipeNutrition, CORE_NUTRIENTS, type Nutrients } from "../src/lib/nutrition/engine";
import { intensityFromMet } from "../src/lib/activity/met";
import { dietTagsFor } from "../src/lib/recipes/diet";
import { closeDb, normalizeName, openDb, upsertCategory, upsertSource } from "./lib/ingest";
import type { Db } from "../src/db/client";

type FoodRow = typeof s.foods.$inferSelect;

async function resolveIngredients(db: Db): Promise<Map<IngredientKey, FoodRow | null>> {
  const descs = Object.values(INGREDIENTS).map((i) => i.usda).filter((d) => d !== "__water__");
  const rows = await db.select().from(s.foods).where(and(inArray(s.foods.name, descs), isNull(s.foods.ownerUserId)));
  const byName = new Map(rows.map((r) => [r.name, r]));
  const out = new Map<IngredientKey, FoodRow | null>();
  const missing: string[] = [];
  for (const [key, def] of Object.entries(INGREDIENTS) as [IngredientKey, (typeof INGREDIENTS)[IngredientKey]][]) {
    if (def.usda === "__water__") {
      out.set(key, null);
      continue;
    }
    const row = byName.get(def.usda);
    if (!row) missing.push(`${key} → "${def.usda}"`);
    else out.set(key, row);
  }
  if (missing.length) throw new Error(`Unresolved ingredient descriptions (run db:import:usda first?):\n  ${missing.join("\n  ")}`);
  return out;
}

async function seedSynonyms(db: Db, ing: Map<IngredientKey, FoodRow | null>) {
  let count = 0;
  for (const [key, food] of ing) {
    if (!food) continue;
    const def = INGREDIENTS[key];
    const names = def.names.map((n) => ({ foodId: food.id, name: n.name, language: n.lang ?? "en", kind: n.lang && n.lang !== "en" ? "regional" : "alias" }));
    await db.insert(s.foodSynonyms).values(names).onConflictDoNothing();
    const hindi = def.names.find((n) => n.lang === "hi")?.name ?? null;
    const search = normalizeName([food.name, ...def.names.map((n) => n.name)].join(" "));
    // Common ingredients rank higher in search.
    await db.update(s.foods).set({ searchText: search, nameHi: hindi, popularity: 50 }).where(eq(s.foods.id, food.id));
    count += names.length;
  }
  console.log(`✓ synonyms: ${count}`);
}

function per100(food: FoodRow | null): Partial<Nutrients> | null {
  if (!food) return null;
  return Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, food[k]])) as Partial<Nutrients>;
}

async function seedRecipes(db: Db, ing: Map<IngredientKey, FoodRow | null>) {
  const sourceId = await upsertSource(db, {
    code: "fittrack_recipes",
    name: "FitTrack AI recipe library (calculated from USDA ingredients)",
    license: "Recipe quantities: app content. Nutrient data: USDA FoodData Central (public domain).",
    version: "1",
    attribution: "Calculated from ingredient-level USDA data; quantities are typical-preparation estimates.",
  });
  const categoryId = await upsertCategory(db, "Indian & regional dishes (recipe-calculated)", "prepared_dishes");
  for (const [key, g] of Object.entries(RECIPE_VARIANT_GROUPS)) {
    await db.insert(s.recipeVariants).values({ key, name: g.name, description: g.description }).onConflictDoUpdate({ target: s.recipeVariants.key, set: { name: g.name, description: g.description } });
  }

  for (const r of SEED_RECIPES) {
    const keys = r.ingredients.map(([k]) => k);
    const anyProxy = keys.some((k) => "proxy" in INGREDIENTS[k] && INGREDIENTS[k].proxy);
    const nutrition = computeRecipeNutrition(
      r.ingredients.map(([k, grams]) => ({ name: k, grams, per100g: per100(ing.get(k) ?? null), role: (INGREDIENTS[k] as { role?: "main" | "fat" | "sugar" | "water" | "spice" }).role ?? "main" })),
      { servings: r.servings, cookedWeightG: r.cookedWeightG },
    );
    if (nutrition.unmatched.length) throw new Error(`${r.slug}: unmatched ${nutrition.unmatched.join(", ")}`);
    const dietTags = dietTagsFor(keys);
    const searchText = normalizeName([r.name, r.nameHi ?? "", ...(r.aliases ?? []), r.region].join(" "));
    const confidence = anyProxy ? 0.6 : 0.7;

    const foodValues = {
      name: r.name,
      nameHi: r.nameHi ?? null,
      sourceId,
      sourceRef: r.slug,
      categoryId,
      cuisine: r.cuisine ?? "Indian",
      subcategory: r.region,
      foodType: r.style === "restaurant" || r.style === "street" ? ("restaurant" as const) : ("dish" as const),
      state: "prepared" as const,
      ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, nutrition.per100g[k]])),
      dataQuality: "calculated" as const,
      confidence,
      searchText,
      popularity: 80,
    };
    const [food] = await db
      .insert(s.foods)
      .values(foodValues)
      .onConflictDoUpdate({ target: [s.foods.sourceId, s.foods.sourceRef], set: { ...foodValues, updatedAt: new Date() } })
      .returning();

    const recipeValues = {
      slug: r.slug,
      name: r.name,
      nameHi: r.nameHi ?? null,
      cuisine: r.cuisine ?? "Indian",
      region: r.region,
      description: `${r.region} · ${r.method}${anyProxy ? " · uses proxy ingredient data" : ""}`,
      instructions: r.instructions,
      cookingMethod: r.method,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      servings: r.servings,
      servingLabel: r.servingLabel,
      cookedWeightG: r.cookedWeightG ?? null,
      variantKey: r.variant?.key ?? null,
      variantLabel: r.variant?.label ?? null,
      style: r.style ?? "home",
      tags: r.tags ?? [],
      dietTags,
      foodId: food!.id,
      sourceNote: "Typical preparation; quantities are estimates — copy and edit to match how you cook.",
    };
    const [recipe] = await db
      .insert(s.recipes)
      .values(recipeValues)
      .onConflictDoUpdate({ target: s.recipes.slug, set: { ...recipeValues, updatedAt: new Date() } })
      .returning();
    await db.update(s.foods).set({ recipeId: recipe!.id }).where(eq(s.foods.id, food!.id));

    await db.delete(s.recipeIngredients).where(eq(s.recipeIngredients.recipeId, recipe!.id));
    await db.insert(s.recipeIngredients).values(
      r.ingredients.map(([k, grams, display], i) => {
        const def = INGREDIENTS[k] as { role?: string; proxy?: string; names: { name: string }[] };
        return {
          recipeId: recipe!.id,
          foodId: ing.get(k)?.id ?? null,
          name: def.names[0]!.name,
          quantityG: grams,
          displayUnit: display ?? null,
          role: def.role ?? "main",
          isEstimated: Boolean(def.proxy),
          note: def.proxy ? `Proxy: ${def.proxy}` : null,
          sort: i,
        };
      }),
    );

    // Servings for logging: "1 <servingLabel>" plus whole recipe.
    await db.delete(s.foodServings).where(and(eq(s.foodServings.foodId, food!.id), eq(s.foodServings.source, "recipe")));
    await db.insert(s.foodServings).values([
      { foodId: food!.id, label: `1 ${r.servingLabel}`, unit: "serving", amount: 1, grams: Math.round(nutrition.servingWeightG), isDefault: true, source: "recipe" },
      { foodId: food!.id, label: `Whole recipe (${r.servings} ${r.servings === 1 ? "serving" : "servings"})`, unit: "recipe", amount: 1, grams: Math.round(nutrition.cookedWeightG), source: "recipe" },
    ]);
    // Aliases searchable as synonyms too.
    if (r.aliases?.length) await db.insert(s.foodSynonyms).values(r.aliases.map((a) => ({ foodId: food!.id, name: a, language: "en", kind: "alias" }))).onConflictDoNothing();
    if (r.nameHi) await db.insert(s.foodSynonyms).values({ foodId: food!.id, name: r.nameHi, language: "hi", kind: "hindi" }).onConflictDoNothing();
  }
  console.log(`✓ recipes: ${SEED_RECIPES.length}`);
}

async function seedRestaurant(db: Db) {
  await db.delete(s.restaurantFoods);
  for (const d of RESTAURANT_DISHES) {
    const [recipe] = await db.select().from(s.recipes).where(eq(s.recipes.slug, d.recipeSlug));
    if (!recipe) throw new Error(`Restaurant dish references unknown recipe ${d.recipeSlug}`);
    await db.insert(s.restaurantFoods).values({
      foodId: recipe.foodId,
      recipeId: recipe.id,
      dishName: d.dishName,
      style: d.style,
      portionLabel: d.portionLabel,
      portionGLow: d.low,
      portionGTypical: d.typical,
      portionGHigh: d.high,
      verified: false,
      source: "Estimated: recipe-calculated nutrition × typical portion range",
      addOns: (d.addOns ?? []).map((a) => ({ name: a.name, foodRef: a.ingredient, grams: a.grams })),
    });
  }
  console.log(`✓ restaurant dishes: ${RESTAURANT_DISHES.length}`);
}

async function seedActivities(db: Db) {
  const file = path.join(process.cwd(), "data", "activities", "compendium-2024.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as { code: string; heading: string; met: number; description: string }[];
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const values: (typeof s.activityTypes.$inferInsert)[] = rows.map((r) => ({
    code: r.code,
    name: r.description,
    category: categorizeCompendium(r.heading, r.description),
    heading: r.heading,
    met: r.met,
    intensity: intensityFromMet(r.met),
    source: "2024 Adult Compendium of Physical Activities",
    supportsDistance: /walking|running|jogging|bicycling|hiking|swimming|rowing|skating|mph|km/i.test(r.heading + " " + r.description),
    searchText: normalizeName(`${r.description} ${r.heading}`),
  }));
  for (const p of PROXY_ACTIVITIES) {
    const base = byCode.get(p.proxyOf);
    if (!base) throw new Error(`Proxy ${p.code} references missing Compendium code ${p.proxyOf}`);
    values.push({
      code: p.code,
      name: p.name,
      category: p.category,
      heading: base.heading,
      met: base.met,
      intensity: intensityFromMet(base.met),
      source: `Proxy of Compendium ${p.proxyOf}`,
      isProxy: true,
      proxyOfCode: p.proxyOf,
      note: p.note,
      searchText: normalizeName(`${p.name} ${base.description}`),
    });
  }
  for (let i = 0; i < values.length; i += 300) {
    await db
      .insert(s.activityTypes)
      .values(values.slice(i, i + 300))
      .onConflictDoUpdate({
        target: [s.activityTypes.code, s.activityTypes.ownerUserId],
        set: { name: sql`excluded.name`, category: sql`excluded.category`, met: sql`excluded.met`, intensity: sql`excluded.intensity`, searchText: sql`excluded.search_text`, note: sql`excluded.note` },
      });
  }
  console.log(`✓ activities: ${values.length} (${PROXY_ACTIVITIES.length} proxies)`);
}

async function seedExercises(db: Db) {
  const slugs = new Set(EXERCISES.map((e) => e.slug));
  for (const e of EXERCISES) {
    const bad = e.alternatives.filter((a) => !slugs.has(a));
    if (bad.length) throw new Error(`${e.slug}: unknown alternatives ${bad.join(", ")}`);
    const v = {
      slug: e.slug, name: e.name, primaryMuscle: e.primary, secondaryMuscles: e.secondary, equipment: e.equipment,
      difficulty: e.difficulty, mechanics: e.mechanics, location: e.location, instructions: e.instructions,
      commonMistakes: e.mistakes, alternatives: e.alternatives, defaultSets: e.sets, defaultReps: e.reps,
      defaultRestSec: e.rest, met: e.met, metCode: e.metCode,
    };
    await db.insert(s.exercises).values(v).onConflictDoUpdate({ target: s.exercises.slug, set: v });
  }
  console.log(`✓ exercises: ${EXERCISES.length}`);
}

const db = await openDb();
try {
  const ing = await resolveIngredients(db);
  await seedSynonyms(db, ing);
  await seedRecipes(db, ing);
  await seedRestaurant(db);
  await seedActivities(db);
  await seedExercises(db);
} finally {
  await closeDb(db);
}

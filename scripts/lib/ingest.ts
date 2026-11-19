/** Shared helpers for food-data ingestion scripts. */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "../../src/db/client";
import * as s from "../../src/db/schema";
import { validatePer100g, type Nutrients } from "../../src/lib/nutrition/engine";

config({ path: ".env.local" });

export async function openDb(): Promise<Db> {
  return createDb(process.env.DATABASE_URL, { migrate: true });
}

export async function closeDb(db: Db) {
  const client = (db as unknown as { $client: { end?: () => Promise<void>; close?: () => Promise<void> } }).$client;
  await (client.end?.() ?? client.close?.());
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const normalizeName = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

/** Upserts a food source and returns its id. */
export async function upsertSource(db: Db, src: typeof s.foodSources.$inferInsert): Promise<number> {
  const [row] = await db
    .insert(s.foodSources)
    .values(src)
    .onConflictDoUpdate({ target: s.foodSources.code, set: { name: src.name, url: src.url, license: src.license, version: src.version, attribution: src.attribution, updatedAt: new Date() } })
    .returning({ id: s.foodSources.id });
  return row!.id;
}

export async function upsertCategory(db: Db, name: string, group: string): Promise<number> {
  const [row] = await db
    .insert(s.foodCategories)
    .values({ name, group })
    .onConflictDoUpdate({ target: s.foodCategories.name, set: { group } })
    .returning({ id: s.foodCategories.id });
  return row!.id;
}

/** Category groups used across the app (Indian-diet oriented). */
export function groupForCategory(name: string): string {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/baby|infant|formula/, "baby_food"],
    [/restaurant/, "restaurant"],
    [/fast food|burger|pizza|frankfurter|hot dog/, "fast_food"],
    [/beverage|juice|coffee|tea|soft drink|water|smoothie|alcohol|beer|wine|liquor|drink/, "beverages"],
    [/spice|herb|condiment|sauce|dressing|gravies|pickle|salsa|ketchup/, "spices_condiments"],
    [/fats and oils|butter|margarine|oil/, "fats_oils"],
    [/dairy|milk|cheese|yogurt|cream|egg/, "dairy_eggs"],
    [/legume|bean|pea|lentil|soy/, "pulses"],
    [/nut|seed/, "nuts_seeds"],
    [/fruit/, "fruits"],
    [/vegetable|potato|tomato|greens|lettuce/, "vegetables"],
    [/poultry|chicken|turkey|beef|pork|lamb|veal|game|sausage|meat|fish|shellfish|seafood/, "meat_fish"],
    [/cereal|grain|pasta|rice|bread|baked|tortilla|bagel|biscuit|crackers|pancake|oat/, "grains"],
    [/sweet|candy|dessert|cake|cookie|pie|ice cream|sugar|doughnut|pastr/, "sweets"],
    [/snack|chips|popcorn|pretzel/, "snacks"],
    [/soup|meal|entree|mixed dish|side dish|sandwich|burrito|taco|stir-fry|curry/, "prepared_dishes"],
    [/supplement|protein and nutritional powder|nutrition bar/, "supplements"],
  ];
  for (const [re, g] of rules) if (re.test(n)) return g;
  return "other";
}

/** Raw / cooked / prepared state inferred from the source description. */
export function inferState(description: string, prepared = false): "raw" | "cooked" | "prepared" | "packaged" | "not_applicable" {
  const d = description.toLowerCase();
  if (/\braw\b|uncooked|\bdry\b|unprepared/.test(d)) return "raw";
  if (/cooked|boiled|baked|fried|roasted|steamed|grilled|broiled|braised|stewed|sauteed|microwaved|toasted|poached|scrambled|stir-fried|simmered|drained/.test(d)) return "cooked";
  if (/canned|frozen|bottled|packaged|ready-to-eat|ready-to-drink|mix\b/.test(d)) return "packaged";
  return prepared ? "prepared" : "not_applicable";
}

export interface NormalizedFood {
  sourceRef: string;
  name: string;
  category: string;
  foodType: "ingredient" | "dish" | "beverage" | "packaged" | "restaurant" | "supplement" | "custom";
  state: "raw" | "cooked" | "prepared" | "packaged" | "not_applicable";
  core: Nutrients;
  extra: { code: string; amount: number; unit: string }[];
  portions: { label: string; unit: string; amount: number; grams: number }[];
}

export interface ImportStats {
  read: number;
  inserted: number;
  updated: number;
  skippedDuplicates: number;
  flagged: number;
  nutrientRows: number;
  portionRows: number;
}

/**
 * Upserts normalized foods by (source, sourceRef). Extended nutrients and portions are replaced for
 * every touched food, so re-running an import applies dataset corrections (incremental updates).
 */
export async function writeFoods(db: Db, sourceId: number, foods: NormalizedFood[], baseConfidence: number, stats: ImportStats) {
  const categoryIds = new Map<string, number>();
  for (const name of new Set(foods.map((f) => f.category))) categoryIds.set(name, await upsertCategory(db, name, groupForCategory(name)));

  for (const batch of chunk(foods, 400)) {
    const rows = batch.map((f) => {
      const problems = validatePer100g(f.core);
      if (problems.length) stats.flagged++;
      return {
        name: f.name,
        sourceId,
        sourceRef: f.sourceRef,
        categoryId: categoryIds.get(f.category)!,
        foodType: f.foodType,
        state: f.state,
        ...f.core,
        dataQuality: "verified" as const,
        // Lower confidence when the dataset record fails internal consistency checks.
        confidence: problems.length ? Math.min(baseConfidence, 0.6) : baseConfidence,
        searchText: normalizeName(f.name),
      };
    });
    const existing = await db
      .select({ ref: s.foods.sourceRef })
      .from(s.foods)
      .where(sql`${s.foods.sourceId} = ${sourceId} AND ${s.foods.sourceRef} IN (${sql.join(batch.map((b) => sql`${b.sourceRef}`), sql`, `)})`);
    const existingRefs = new Set(existing.map((e) => e.ref));
    const result = await db
      .insert(s.foods)
      .values(rows)
      .onConflictDoUpdate({
        target: [s.foods.sourceId, s.foods.sourceRef],
        set: {
          name: sql`excluded.name`,
          categoryId: sql`excluded.category_id`,
          foodType: sql`excluded.food_type`,
          state: sql`excluded.state`,
          kcal: sql`excluded.kcal`,
          proteinG: sql`excluded.protein_g`,
          carbsG: sql`excluded.carbs_g`,
          fatG: sql`excluded.fat_g`,
          fibreG: sql`excluded.fibre_g`,
          sugarG: sql`excluded.sugar_g`,
          satFatG: sql`excluded.sat_fat_g`,
          sodiumMg: sql`excluded.sodium_mg`,
          potassiumMg: sql`excluded.potassium_mg`,
          calciumMg: sql`excluded.calcium_mg`,
          ironMg: sql`excluded.iron_mg`,
          confidence: sql`excluded.confidence`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: s.foods.id, ref: s.foods.sourceRef });
    for (const r of result) existingRefs.has(r.ref) ? stats.updated++ : stats.inserted++;

    const idByRef = new Map(result.map((r) => [r.ref!, r.id]));
    const ids = result.map((r) => r.id);
    await db.delete(s.foodNutrients).where(sql`${s.foodNutrients.foodId} IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    await db.delete(s.foodServings).where(sql`${s.foodServings.foodId} IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND ${s.foodServings.source} = 'dataset'`);

    const nutrientRows = batch.flatMap((f) => f.extra.map((e) => ({ foodId: idByRef.get(f.sourceRef)!, ...e })));
    for (const nb of chunk(nutrientRows, 2000)) await db.insert(s.foodNutrients).values(nb).onConflictDoNothing();
    stats.nutrientRows += nutrientRows.length;

    const portionRows = batch.flatMap((f) =>
      f.portions.map((p, i) => ({ foodId: idByRef.get(f.sourceRef)!, ...p, isDefault: i === 0, source: "dataset" })),
    );
    for (const pb of chunk(portionRows, 2000)) await db.insert(s.foodServings).values(pb);
    stats.portionRows += portionRows.length;
  }
}

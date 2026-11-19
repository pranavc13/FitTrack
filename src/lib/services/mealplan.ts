import { and, asc, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { INGREDIENTS, type IngredientKey } from "@/data/ingredients";
import { addDays } from "@/lib/dates";
import { round } from "@/lib/nutrition/engine";
import { fitsDiet } from "@/lib/recipes/diet";
import { ApiError, notFound } from "@/lib/errors";
import { normalizeQuery } from "./foods";

export const SLOT_RECIPES: Record<"breakfast" | "main" | "carb" | "one_pot" | "snack", string[]> = {
  breakfast: ["poha-maharashtrian", "poha-indori", "upma", "idli", "plain-dosa", "uttapam", "besan-chilla", "moong-chilla", "dhokla", "vegetable-dalia", "masala-oats", "egg-bhurji", "masala-omelette", "overnight-oats", "aloo-paratha", "methi-thepla", "sabudana-khichdi", "appam", "puttu", "ven-pongal"],
  main: ["dal-tadka-home", "moong-dal", "chole-home", "rajma-home", "kadhi-pakora", "gujarati-kadhi", "sambar", "lobia-masala", "soya-chunks-curry", "palak-paneer", "paneer-curry-home", "paneer-bhurji", "aloo-gobi", "baingan-bharta", "bhindi-masala", "lauki-sabzi", "mix-veg", "chicken-curry-home", "macher-jhol", "kerala-fish-curry", "keema-matar", "chicken-tikka", "cabbage-poriyal", "avial", "sarson-ka-saag", "gatte-ki-sabzi"],
  carb: ["phulka-roti", "steamed-rice", "jeera-rice", "bajra-roti", "jowar-bhakri", "makki-roti"],
  one_pot: ["veg-pulao", "khichdi", "bisi-bele-bath", "curd-rice", "lemon-rice", "veg-biryani", "vegetable-dalia"],
  snack: ["sprouts-salad", "fruit-chaat", "roasted-makhana", "chaas", "banana-protein-shake", "cucumber-raita", "dhokla"],
};

export interface PlanPrefs {
  days: number;
  startDate: string;
  calories: number;
  proteinG: number;
  diet: string;
  allergies: string[];
  maxCookMinutes?: number | null;
  budgetPerDayInr?: number | null;
  region?: string | null;
  availableIngredients?: string[];
  trainingDays?: number[]; // weekdays 0-6 with workouts (slightly more carbs/kcal)
}

interface Candidate {
  id: number;
  slug: string;
  name: string;
  region: string | null;
  servings: number;
  servingLabel: string;
  totalMinutes: number;
  dietTags: string[];
  perServing: { kcal: number; proteinG: number; fibreG: number; carbsG: number; fatG: number };
  costPerServing: number | null;
  ingredientKeys: IngredientKey[];
  ingredients: { key: IngredientKey | null; name: string; grams: number; foodId: number | null }[];
}

const KEY_BY_USDA = new Map(Object.entries(INGREDIENTS).map(([k, v]) => [v.usda, k as IngredientKey]));

export function keyForName(name: string): IngredientKey | null {
  const n = normalizeQuery(name);
  for (const [k, v] of Object.entries(INGREDIENTS)) {
    if (k === n.replace(/ /g, "_") || v.names.some((x) => normalizeQuery(x.name) === n)) return k as IngredientKey;
  }
  for (const [k, v] of Object.entries(INGREDIENTS)) {
    if (v.names.some((x) => { const a = normalizeQuery(x.name); return a.length > 3 && (n.includes(a) || a.includes(n)); })) return k as IngredientKey;
  }
  return null;
}

async function loadCandidates(db: Db): Promise<Map<string, Candidate>> {
  const slugs = Object.values(SLOT_RECIPES).flat();
  const recipes = await db
    .select({ r: s.recipes, f: s.foods })
    .from(s.recipes)
    .innerJoin(s.foods, eq(s.foods.id, s.recipes.foodId))
    .where(and(inArray(s.recipes.slug, slugs), isNull(s.recipes.ownerUserId)));
  const ings = await db
    .select({ ri: s.recipeIngredients, food: s.foods })
    .from(s.recipeIngredients)
    .leftJoin(s.foods, eq(s.foods.id, s.recipeIngredients.foodId))
    .where(inArray(s.recipeIngredients.recipeId, recipes.map((x) => x.r.id)));
  const servings = await db.select().from(s.foodServings).where(and(inArray(s.foodServings.foodId, recipes.map((x) => x.f.id)), eq(s.foodServings.isDefault, true)));
  const out = new Map<string, Candidate>();
  for (const { r, f } of recipes) {
    const g = servings.find((sv) => sv.foodId === f.id)?.grams ?? 0;
    const mine = ings.filter((i) => i.ri.recipeId === r.id);
    let cost = 0;
    let costKnown = true;
    const ingredients = mine.map(({ ri, food }) => {
      const key = food ? (KEY_BY_USDA.get(food.name) ?? null) : ri.name === "water" ? ("water" as IngredientKey) : null;
      const price = key ? (INGREDIENTS[key] as { priceInrPerKg?: number }).priceInrPerKg : undefined;
      if (key !== "water") {
        if (price != null) cost += (price * ri.quantityG) / 1000;
        else costKnown = false;
      }
      return { key, name: ri.name, grams: ri.quantityG, foodId: ri.foodId };
    });
    const per = (v: number | null) => round(((v ?? 0) * g) / 100, 1);
    out.set(r.slug!, {
      id: r.id,
      slug: r.slug!,
      name: r.name,
      region: r.region,
      servings: r.servings,
      servingLabel: r.servingLabel,
      totalMinutes: (r.cookMinutes ?? 0) + Math.min(r.prepMinutes ?? 0, 60), // soaking/fermenting is passive time
      dietTags: r.dietTags,
      perServing: { kcal: per(f.kcal), proteinG: per(f.proteinG), fibreG: per(f.fibreG), carbsG: per(f.carbsG), fatG: per(f.fatG) },
      costPerServing: costKnown ? round(cost / r.servings, 0) : null,
      ingredientKeys: ingredients.flatMap((i) => (i.key ? [i.key] : [])),
      ingredients,
    });
  }
  return out;
}

function allowed(c: Candidate, p: PlanPrefs) {
  if (!fitsDiet(c.dietTags, p.diet)) return false;
  const allergy = p.allergies.map((a) => a.toLowerCase());
  const names = c.ingredientKeys.flatMap((k) => INGREDIENTS[k].names.map((n) => n.name.toLowerCase()).concat(k));
  if (allergy.some((a) => a && names.some((n) => n.includes(a) || (a.includes("dairy") && ["paneer", "curd", "milk", "cream", "ghee", "butter", "cheese"].some((d) => n.includes(d))) || (a.includes("gluten") && ["atta", "maida", "sooji", "pav", "noodles", "pasta", "dalia"].some((d) => n.includes(d)))))) return false;
  if (p.maxCookMinutes && c.totalMinutes > p.maxCookMinutes) return false;
  return true;
}

interface PlannedItem {
  slot: string;
  recipeId: number;
  slug: string;
  name: string;
  servings: number;
  servingLabel: string;
  kcal: number;
  proteinG: number;
  fibreG: number;
  costInr: number | null;
}

function pickPortion(c: Candidate, kcalTarget: number, min = 0.5, max = 3) {
  if (c.perServing.kcal <= 0) return 1;
  const raw = kcalTarget / c.perServing.kcal;
  return Math.min(max, Math.max(min, Math.round(raw * 2) / 2));
}

function itemFor(slot: string, c: Candidate, servings: number): PlannedItem {
  return {
    slot,
    recipeId: c.id,
    slug: c.slug,
    name: c.name,
    servings,
    servingLabel: c.servingLabel,
    kcal: round(c.perServing.kcal * servings, 0),
    proteinG: round(c.perServing.proteinG * servings, 1),
    fibreG: round(c.perServing.fibreG * servings, 1),
    costInr: c.costPerServing != null ? round(c.costPerServing * servings, 0) : null,
  };
}

/**
 * Greedy, deterministic planner. For each slot it scores candidates by protein density, region
 * preference, available ingredients, budget and repetition, then scales servings toward the slot's
 * calorie share. Totals are reported honestly — the plan may land within ±10% rather than exactly.
 */
export async function generateMealPlan(db: Db, prefs: PlanPrefs) {
  if (prefs.days < 1 || prefs.days > 14) throw new ApiError(400, "Plans can cover 1–14 days");
  const all = await loadCandidates(db);
  const pool = (slot: keyof typeof SLOT_RECIPES) => SLOT_RECIPES[slot].map((x) => all.get(x)).filter((c): c is Candidate => Boolean(c && allowed(c, prefs)));
  const pools = { breakfast: pool("breakfast"), main: pool("main"), carb: pool("carb"), one_pot: pool("one_pot"), snack: pool("snack") };
  if (!pools.breakfast.length || !pools.main.length || !pools.carb.length) throw new ApiError(400, "Your filters exclude too many recipes — relax cooking time, budget or allergies");
  const have = new Set((prefs.availableIngredients ?? []).map(keyForName).filter(Boolean) as IngredientKey[]);
  const used = new Map<string, number>();

  const score = (c: Candidate, servings: number) => {
    let sc = (c.perServing.proteinG * 4) / Math.max(c.perServing.kcal, 1); // protein density 0..~0.5
    sc += c.perServing.fibreG / Math.max(c.perServing.kcal, 1) * 5;
    if (prefs.region && c.region && c.region.toLowerCase().includes(prefs.region.toLowerCase())) sc += 0.25;
    if (have.size) sc += (c.ingredientKeys.filter((k) => have.has(k)).length / Math.max(1, c.ingredientKeys.length)) * 0.4;
    sc -= (used.get(c.slug) ?? 0) * 0.35;
    if (prefs.budgetPerDayInr && c.costPerServing != null) sc -= ((c.costPerServing * servings) / prefs.budgetPerDayInr) * 0.6;
    return sc;
  };
  const best = (cands: Candidate[], kcalTarget: number, min = 0.5, max = 3) => {
    let top: { c: Candidate; servings: number; s: number } | null = null;
    for (const c of cands) {
      const servings = pickPortion(c, kcalTarget, min, max);
      const sc = score(c, servings) - Math.abs(c.perServing.kcal * servings - kcalTarget) / Math.max(kcalTarget, 1);
      if (!top || sc > top.s) top = { c, servings, s: sc };
    }
    if (top) used.set(top.c.slug, (used.get(top.c.slug) ?? 0) + 1);
    return top;
  };

  const days = [];
  for (let d = 0; d < prefs.days; d++) {
    const date = addDays(prefs.startDate, d);
    const weekday = new Date(date + "T00:00:00Z").getUTCDay();
    const training = prefs.trainingDays?.includes(weekday) ?? false;
    const kcal = prefs.calories * (training ? 1.05 : 1);
    const items: PlannedItem[] = [];
    const b = best(pools.breakfast, kcal * 0.25, 0.5, 3);
    if (b) items.push(itemFor("breakfast", b.c, b.servings));
    for (const slot of ["lunch", "dinner"] as const) {
      const share = slot === "lunch" ? 0.35 : 0.3;
      // Every third meal use a one-pot dish, otherwise curry + roti/rice.
      if (pools.one_pot.length && (d + (slot === "dinner" ? 1 : 0)) % 3 === 2) {
        const o = best(pools.one_pot, kcal * share, 1, 3);
        if (o) items.push(itemFor(slot, o.c, o.servings));
        continue;
      }
      const m = best(pools.main, kcal * share * 0.5, 1, 2.5);
      if (m) items.push(itemFor(slot, m.c, m.servings));
      const remaining = kcal * share - (m ? m.c.perServing.kcal * m.servings : 0);
      const c = best(pools.carb, remaining, 1, 4);
      if (c) items.push(itemFor(slot, c.c, c.servings));
    }
    const sn = pools.snack.length ? best(pools.snack, kcal * 0.1, 0.5, 2) : null;
    if (sn) items.push(itemFor("snack", sn.c, sn.servings));
    const totals = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, proteinG: a.proteinG + i.proteinG, fibreG: a.fibreG + i.fibreG, costInr: a.costInr + (i.costInr ?? 0) }), { kcal: 0, proteinG: 0, fibreG: 0, costInr: 0 });
    days.push({ date, training, items, totals: { kcal: round(totals.kcal, 0), proteinG: round(totals.proteinG, 0), fibreG: round(totals.fibreG, 0), costInr: round(totals.costInr, 0) } });
  }
  const proteinShort = days.filter((d) => d.totals.proteinG < prefs.proteinG * 0.9).length;
  return {
    days,
    notes: [
      "Portions are scaled from recipe servings; totals are estimates within roughly ±10% of your target.",
      proteinShort ? `${proteinShort} day(s) fall short of your protein target — add a protein snack (see Protein gap).` : "Protein target met on all days.",
      "Costs use approximate Indian retail prices and are only a guide.",
    ],
  };
}

export async function saveMealPlan(db: Db, userId: string, name: string, prefs: PlanPrefs, plan: Awaited<ReturnType<typeof generateMealPlan>>) {
  const [row] = await db.insert(s.mealPlans).values({ userId, name, startDate: prefs.startDate, days: prefs.days, preferences: prefs as unknown as Record<string, unknown>, plan }).returning();
  return row!;
}

export async function listMealPlans(db: Db, userId: string) {
  return db.select().from(s.mealPlans).where(eq(s.mealPlans.userId, userId)).orderBy(desc(s.mealPlans.createdAt)).limit(20);
}

export async function getMealPlan(db: Db, userId: string, id: number) {
  const [row] = await db.select().from(s.mealPlans).where(and(eq(s.mealPlans.id, id), eq(s.mealPlans.userId, userId)));
  if (!row) throw notFound("Meal plan");
  return row;
}

/* ------------------------------------------------------------------ */
/* Grocery & pantry                                                    */
/* ------------------------------------------------------------------ */

const GROCERY_GROUPS: Record<string, string> = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  grains: "Grains & flours",
  pulses: "Pulses & legumes",
  dairy: "Dairy",
  protein: "Protein (eggs, meat, fish, soy)",
  spices: "Spices",
  fats: "Oils & fats",
  nuts_seeds: "Nuts & seeds",
  other: "Other",
};

export async function groceryFromPlan(db: Db, userId: string, planId: number) {
  const plan = await getMealPlan(db, userId, planId);
  const all = await loadCandidates(db);
  const byId = new Map([...all.values()].map((c) => [c.id, c]));
  const need = new Map<string, { key: IngredientKey | null; name: string; grams: number; foodId: number | null }>();
  const days = (plan.plan as { days: { items: PlannedItem[] }[] }).days;
  for (const d of days) {
    for (const item of d.items) {
      const c = byId.get(item.recipeId);
      if (!c) continue;
      const factor = item.servings / c.servings;
      for (const ing of c.ingredients) {
        if (ing.key === "water") continue;
        const k = ing.key ?? ing.name;
        const cur = need.get(k) ?? { ...ing, grams: 0 };
        cur.grams += ing.grams * factor;
        need.set(k, cur);
      }
    }
  }
  const pantry = await db.select().from(s.pantryItems).where(eq(s.pantryItems.userId, userId));
  const pantryBy = new Map(pantry.map((p) => [p.foodId ?? -1, p]));
  const [list] = await db.insert(s.groceryLists).values({ userId, mealPlanId: plan.id, name: `Groceries — ${plan.name}` }).returning();
  const items = [...need.values()].map((n) => {
    const def = n.key ? (INGREDIENTS[n.key] as { group: string; priceInrPerKg?: number; names: { name: string }[] }) : null;
    const inPantry = n.foodId ? pantryBy.get(n.foodId)?.quantityG ?? 0 : 0;
    const grams = Math.max(0, n.grams - inPantry);
    return {
      listId: list!.id,
      foodId: n.foodId,
      name: def?.names[0]?.name ?? n.name,
      category: GROCERY_GROUPS[def?.group ?? "other"] ?? "Other",
      quantityG: Math.ceil(grams / 10) * 10,
      display: grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${Math.ceil(grams / 10) * 10} g`,
      estimatedPriceInr: def?.priceInrPerKg != null ? round((def.priceInrPerKg * grams) / 1000, 0) : null,
      checked: grams === 0,
    };
  });
  if (items.length) await db.insert(s.groceryItems).values(items);
  return getGroceryList(db, userId, list!.id);
}

export async function getGroceryList(db: Db, userId: string, id: number) {
  const [list] = await db.select().from(s.groceryLists).where(and(eq(s.groceryLists.id, id), eq(s.groceryLists.userId, userId)));
  if (!list) throw notFound("Grocery list");
  const items = await db.select().from(s.groceryItems).where(eq(s.groceryItems.listId, id)).orderBy(asc(s.groceryItems.category), asc(s.groceryItems.name));
  const total = items.reduce((a, i) => a + (i.estimatedPriceInr ?? 0), 0);
  return { list, items, estimatedTotalInr: round(total, 0) };
}

export async function listGroceryLists(db: Db, userId: string) {
  return db.select().from(s.groceryLists).where(eq(s.groceryLists.userId, userId)).orderBy(desc(s.groceryLists.createdAt)).limit(20);
}

export async function toggleGroceryItem(db: Db, userId: string, itemId: number, checked: boolean) {
  const res = await db.execute(sql`UPDATE grocery_items SET checked = ${checked} WHERE id = ${itemId} AND list_id IN (SELECT id FROM grocery_lists WHERE user_id = ${userId})`);
  return res;
}

export async function addGroceryItem(db: Db, userId: string, listId: number, name: string, category = "Other") {
  const [list] = await db.select().from(s.groceryLists).where(and(eq(s.groceryLists.id, listId), eq(s.groceryLists.userId, userId)));
  if (!list) throw notFound("Grocery list");
  const [row] = await db.insert(s.groceryItems).values({ listId, name, category }).returning();
  return row!;
}

export async function listPantry(db: Db, userId: string) {
  return db.select().from(s.pantryItems).where(eq(s.pantryItems.userId, userId)).orderBy(asc(s.pantryItems.expiresOn), asc(s.pantryItems.name));
}

export async function addPantryItem(db: Db, userId: string, input: { name: string; quantityG?: number | null; expiresOn?: string | null }) {
  const key = keyForName(input.name);
  let foodId: number | null = null;
  if (key && key !== "water") {
    const [f] = await db.select({ id: s.foods.id }).from(s.foods).where(and(eq(s.foods.name, INGREDIENTS[key].usda), isNull(s.foods.ownerUserId)));
    foodId = f?.id ?? null;
  }
  const [row] = await db.insert(s.pantryItems).values({ userId, name: input.name.trim(), foodId, quantityG: input.quantityG ?? null, expiresOn: input.expiresOn ?? null }).returning();
  return row!;
}

export async function deletePantryItem(db: Db, userId: string, id: number) {
  await db.delete(s.pantryItems).where(and(eq(s.pantryItems.id, id), eq(s.pantryItems.userId, userId)));
}

/** Recipes ranked by how many of their main ingredients you have (pantry items expiring soon weigh more). */
export async function suggestFromIngredients(db: Db, userId: string, input: { ingredients?: string[]; usePantry?: boolean; today: string; diet?: string }) {
  const all = await loadCandidates(db);
  const have = new Map<IngredientKey, number>();
  const unknown: string[] = [];
  for (const name of input.ingredients ?? []) {
    const k = keyForName(name);
    if (k) have.set(k, 1);
    else if (name.trim()) unknown.push(name.trim());
  }
  if (input.usePantry) {
    const pantry = await db.select().from(s.pantryItems).where(eq(s.pantryItems.userId, userId));
    for (const p of pantry) {
      const k = keyForName(p.name);
      if (!k) continue;
      const soon = p.expiresOn && p.expiresOn <= addDays(input.today, 3);
      have.set(k, Math.max(have.get(k) ?? 0, soon ? 2 : 1));
    }
  }
  if (!have.size) throw new ApiError(400, "Tell me at least one ingredient you have");
  const STAPLES = new Set<IngredientKey>(["salt", "oil", "turmeric", "chili_powder", "cumin", "garam_masala", "mustard_seeds", "water", "coriander_powder", "green_chili", "ginger", "garlic", "ghee", "sugar", "lemon_juice", "coriander_leaves", "black_pepper"]);
  const results = [...all.values()]
    .filter((c) => !input.diet || fitsDiet(c.dietTags, input.diet))
    .map((c) => {
      const mains = c.ingredientKeys.filter((k) => !STAPLES.has(k));
      const matched = mains.filter((k) => have.has(k));
      const missing = mains.filter((k) => !have.has(k));
      const weight = matched.reduce((a, k) => a + (have.get(k) ?? 1), 0);
      return { recipeId: c.id, name: c.name, region: c.region, perServing: c.perServing, matched: matched.map((k) => INGREDIENTS[k].names[0]!.name), missing: missing.map((k) => INGREDIENTS[k].names[0]!.name), score: weight / Math.max(1, mains.length) };
    })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.score - a.score || a.missing.length - b.missing.length)
    .slice(0, 12);
  return { results, unrecognised: unknown };
}

/** Pantry items expiring within N days. */
export async function expiringPantry(db: Db, userId: string, today: string, days = 3) {
  return db.select().from(s.pantryItems).where(and(eq(s.pantryItems.userId, userId), lte(s.pantryItems.expiresOn, addDays(today, days))));
}

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { INGREDIENTS } from "@/data/ingredients";
import { addDays, dateRange } from "@/lib/dates";
import { round } from "@/lib/nutrition/engine";
import { fitsDiet, violatesAllergies } from "@/lib/recipes/diet";
import { getDay } from "./diary";
import { getRange } from "./summary";

type Targets = typeof s.nutritionTargets.$inferSelect;

async function targetsFor(db: Db, userId: string): Promise<Targets | null> {
  const [t] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, userId));
  return t ?? null;
}

async function dietPref(db: Db, userId: string) {
  const [p] = await db.select({ d: s.userProfiles.dietPreference, allergies: s.userProfiles.allergies }).from(s.userProfiles).where(eq(s.userProfiles.userId, userId));
  return { diet: p?.d ?? "vegetarian", allergies: (p?.allergies ?? []).map((a) => a.toLowerCase()) };
}

/** Practical Indian protein sources with typical portions; nutrients come from the catalogue. */
const PROTEIN_SOURCES: { key: keyof typeof INGREDIENTS | string; label: string; grams: number; recipe?: string }[] = [
  { key: "paneer", label: "Paneer (100 g)", grams: 100 },
  { key: "greek_yogurt", label: "Greek yogurt / hung curd (150 g)", grams: 150 },
  { key: "curd", label: "Curd (1 katori, 150 g)", grams: 150 },
  { key: "soya_chunks", label: "Soya chunks (30 g dry)", grams: 30 },
  { key: "tofu", label: "Tofu (100 g)", grams: 100 },
  { key: "egg", label: "Eggs (2 large)", grams: 100 },
  { key: "egg_white", label: "Egg whites (4)", grams: 132 },
  { key: "chicken", label: "Chicken (100 g raw)", grams: 100 },
  { key: "fish", label: "Fish (100 g raw)", grams: 100 },
  { key: "moong_sprouts", label: "Moong sprouts (1 cup, 100 g)", grams: 100 },
  { key: "chana", label: "Chana (50 g dry)", grams: 50 },
  { key: "peanuts", label: "Peanuts (30 g)", grams: 30 },
  { key: "toned_milk", label: "Milk (1 glass, 250 ml)", grams: 250 },
];

const FIBRE_SOURCES: { key: keyof typeof INGREDIENTS; label: string; grams: number }[] = [
  { key: "guava", label: "Guava (1 medium, 100 g)", grams: 100 },
  { key: "chana", label: "Chana/chole (50 g dry)", grams: 50 },
  { key: "rajma", label: "Rajma (50 g dry)", grams: 50 },
  { key: "oats", label: "Oats (40 g)", grams: 40 },
  { key: "flaxseed", label: "Flaxseed (1 tbsp, 10 g)", grams: 10 },
  { key: "chia", label: "Chia seeds (1 tbsp, 12 g)", grams: 12 },
  { key: "apple", label: "Apple with skin (150 g)", grams: 150 },
  { key: "bhindi", label: "Bhindi (100 g)", grams: 100 },
  { key: "broccoli", label: "Broccoli (100 g)", grams: 100 },
  { key: "brown_rice", label: "Brown rice (60 g dry) instead of white", grams: 60 },
  { key: "bajra", label: "Bajra (50 g)", grams: 50 },
  { key: "moong_sprouts", label: "Sprouts (100 g)", grams: 100 },
];

async function sourceFoods(db: Db, keys: string[]) {
  const descs = keys.flatMap((k) => (INGREDIENTS[k as keyof typeof INGREDIENTS] ? [INGREDIENTS[k as keyof typeof INGREDIENTS].usda] : []));
  const rows = await db.select().from(s.foods).where(and(inArray(s.foods.name, descs), isNull(s.foods.ownerUserId)));
  return new Map(rows.map((r) => [r.name, r]));
}

const MEAT_KEYS = new Set(["chicken", "fish", "mutton", "prawns"]);
const EGG_KEYS = new Set(["egg", "egg_white"]);
const DAIRY_KEYS = new Set(["paneer", "greek_yogurt", "curd", "toned_milk", "milk"]);

function allowed(key: string, diet: string, allergies: string[]) {
  const def = INGREDIENTS[key as keyof typeof INGREDIENTS];
  if (violatesAllergies([key.replace(/_/g, " "), ...(def ? def.names.map((n) => n.name) : [])], allergies)) return false;
  const tags = MEAT_KEYS.has(key) ? (key === "fish" ? ["pescatarian", "non_vegetarian"] : ["non_vegetarian"]) : EGG_KEYS.has(key) ? ["eggetarian", "non_vegetarian", "pescatarian"] : DAIRY_KEYS.has(key) ? ["vegetarian", "eggetarian", "pescatarian", "non_vegetarian", "jain"] : ["vegetarian", "vegan", "eggetarian", "pescatarian", "non_vegetarian", "jain"];
  return fitsDiet(tags, diet);
}

export async function proteinGap(db: Db, userId: string, date: string) {
  const [t, day, pref] = await Promise.all([targetsFor(db, userId), getDay(db, userId, date), dietPref(db, userId)]);
  const target = t?.proteinG ?? null;
  const eaten = day.totals.proteinG ?? 0;
  const remaining = target ? Math.max(0, target - eaten) : null;
  const options = PROTEIN_SOURCES.filter((p) => p.label && allowed(String(p.key), pref.diet, pref.allergies));
  const foods = await sourceFoods(db, options.map((o) => String(o.key)));
  const suggestions = options
    .map((o) => {
      const f = foods.get(INGREDIENTS[o.key as keyof typeof INGREDIENTS]?.usda ?? "");
      if (!f || f.proteinG == null || f.kcal == null) return null;
      const protein = (f.proteinG * o.grams) / 100;
      const kcal = (f.kcal * o.grams) / 100;
      return { foodId: f.id, label: o.label, grams: o.grams, proteinG: round(protein, 1), kcal: round(kcal, 0), proteinPer100Kcal: round((protein / Math.max(kcal, 1)) * 100, 1) };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.proteinPer100Kcal - a.proteinPer100Kcal);
  return { target, eaten: round(eaten, 1), remaining: remaining == null ? null : round(remaining, 1), suggestions: suggestions.slice(0, 8) };
}

export async function fibreGap(db: Db, userId: string, date: string) {
  const [t, day, pref] = await Promise.all([targetsFor(db, userId), getDay(db, userId, date), dietPref(db, userId)]);
  const target = t?.fibreG ?? 30;
  const eaten = day.totals.fibreG ?? 0;
  const options = FIBRE_SOURCES.filter((o) => o.label && allowed(o.key, pref.diet, pref.allergies));
  const foods = await sourceFoods(db, options.map((o) => o.key));
  const suggestions = options
    .map((o) => {
      const f = foods.get(INGREDIENTS[o.key].usda);
      if (!f || f.fibreG == null) return null;
      return { foodId: f.id, label: o.label, grams: o.grams, fibreG: round((f.fibreG * o.grams) / 100, 1), kcal: round(((f.kcal ?? 0) * o.grams) / 100, 0) };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.fibreG - a.fibreG);
  const missing = day.totals.missing.fibreG ?? 0;
  return { target, eaten: round(eaten, 1), remaining: round(Math.max(0, target - eaten), 1), entriesMissingFibreData: missing, suggestions: suggestions.slice(0, 8) };
}

/** Hidden calories: added fats & sugars in recipes plus energy from drinks, sauces and fats logged directly. */
export async function hiddenCalories(db: Db, userId: string, from: string, to: string) {
  const rows = rowsOf<Record<string, string | null>>(
    await db.execute(sql`
      SELECT me.name, me.kcal, me.added_fat_kcal, me.added_sugar_kcal, f.food_type, fc."group" AS grp, lower(f.name) AS fname
      FROM meal_entries me JOIN meals m ON m.id = me.meal_id
      LEFT JOIN foods f ON f.id = me.food_id LEFT JOIN food_categories fc ON fc.id = f.category_id
      WHERE me.user_id = ${userId} AND m.date BETWEEN ${from} AND ${to}`),
  );
  let addedFat = 0;
  let addedSugar = 0;
  let beverages = 0;
  let directFats = 0;
  let sauces = 0;
  let total = 0;
  for (const r of rows) {
    const kcal = Number(r.kcal ?? 0);
    total += kcal;
    addedFat += Number(r.added_fat_kcal ?? 0);
    addedSugar += Number(r.added_sugar_kcal ?? 0);
    if (r.food_type === "beverage" || r.grp === "beverages" || /chai|coffee|lassi|juice|shake|cola|soda/.test(r.fname ?? "")) beverages += kcal;
    else if (r.grp === "fats_oils") directFats += kcal;
    else if (r.grp === "spices_condiments" || /sauce|ketchup|mayonnaise|dressing|chutney/.test(r.fname ?? "")) sauces += kcal;
  }
  const days = dateRange(from, to).length;
  return {
    days,
    totalKcal: round(total, 0),
    breakdown: [
      { key: "cooking_fat", label: "Oil, ghee & butter in dishes", kcal: round(addedFat, 0) },
      { key: "direct_fat", label: "Fats added at the table", kcal: round(directFats, 0) },
      { key: "added_sugar", label: "Sugar in recipes", kcal: round(addedSugar, 0) },
      { key: "beverages", label: "Drinks (chai, coffee, juices…)", kcal: round(beverages, 0) },
      { key: "sauces", label: "Sauces, chutneys & dressings", kcal: round(sauces, 0) },
    ],
    note: "Cooking fat and sugar are only known for recipe-based foods; packaged/USDA dishes include them inside their totals.",
  };
}

/**
 * Transparent daily nutrition score (0–100). Not a health score — it measures how closely the day
 * matched your own targets plus variety and data completeness. Components are returned so the UI can
 * show exactly how the number was built.
 */
export async function nutritionScore(db: Db, userId: string, date: string) {
  const [t, day] = await Promise.all([targetsFor(db, userId), getDay(db, userId, date)]);
  if (!t || day.totals.count === 0) return { score: null, components: [], reason: day.totals.count === 0 ? "Nothing logged for this day" : "Set targets first" };
  const closeness = (actual: number, target: number, tolerance: number) => Math.max(0, 1 - Math.abs(actual - target) / (target * tolerance));
  const atLeast = (actual: number, target: number) => Math.min(1, actual / target);
  const entries = day.meals.flatMap((m) => m.entries);
  const distinctFoods = new Set(entries.map((e) => e.foodId ?? e.name)).size;
  const missingCore = Object.values(day.totals.missing).reduce<number>((a, b) => a + (b ?? 0), 0);
  const completeness = 1 - missingCore / Math.max(1, entries.length * 11);
  const components = [
    { key: "energy", label: "Calories near target (±15%)", weight: 25, value: closeness(day.totals.kcal, t.calories, 0.3) },
    { key: "protein", label: "Protein target reached", weight: 25, value: atLeast(day.totals.proteinG, t.proteinG) },
    { key: "fibre", label: "Fibre target reached", weight: 15, value: atLeast(day.totals.fibreG, t.fibreG) },
    { key: "fat", label: "Fat within target", weight: 10, value: day.totals.fatG <= t.fatG * 1.15 ? 1 : closeness(day.totals.fatG, t.fatG, 0.6) },
    { key: "sugar", label: "Sugar ≤ 10% of energy", weight: 10, value: day.totals.sugarG * 4 <= t.calories * 0.1 ? 1 : Math.max(0, 1 - (day.totals.sugarG * 4 - t.calories * 0.1) / (t.calories * 0.1)) },
    { key: "variety", label: "Variety (≥ 8 different foods)", weight: 10, value: Math.min(1, distinctFoods / 8) },
    { key: "completeness", label: "Data completeness", weight: 5, value: completeness },
  ];
  const score = Math.round(components.reduce((a, c) => a + c.weight * c.value, 0));
  return { score, components: components.map((c) => ({ ...c, value: round(c.value, 2), points: round(c.weight * c.value, 1) })), reason: "Based on your targets — not a medical assessment" };
}

export async function weeklyBudget(db: Db, userId: string, weekStartDate: string) {
  const t = await targetsFor(db, userId);
  const days = await getRange(db, userId, weekStartDate, addDays(weekStartDate, 6));
  const budget = (t?.calories ?? 0) * 7;
  const consumed = days.reduce((a, d) => a + d.kcalIn, 0);
  const loggedDays = days.filter((d) => d.logged).length;
  const remainingDays = days.filter((d) => !d.logged).length;
  return {
    budget,
    consumed: round(consumed, 0),
    remaining: round(budget - consumed, 0),
    loggedDays,
    averageLogged: loggedDays ? round(consumed / loggedDays, 0) : null,
    suggestedPerRemainingDay: remainingDays ? round(Math.max(0, budget - consumed) / remainingDays, 0) : null,
    days: days.map((d) => ({ date: d.date, kcal: round(d.kcalIn, 0), logged: d.logged })),
  };
}

export async function mealTiming(db: Db, userId: string, from: string, to: string) {
  const rows = rowsOf<{ meal_type: string; kcal: string; protein: string; days: string }>(
    await db.execute(sql`
      SELECT m.meal_type, sum(me.kcal) kcal, sum(me.protein_g) protein, count(DISTINCT m.date) days
      FROM meal_entries me JOIN meals m ON m.id = me.meal_id
      WHERE me.user_id = ${userId} AND m.date BETWEEN ${from} AND ${to}
      GROUP BY m.meal_type`),
  );
  const total = rows.reduce((a, r) => a + Number(r.kcal), 0);
  const totalP = rows.reduce((a, r) => a + Number(r.protein), 0);
  return {
    meals: rows.map((r) => ({ mealType: r.meal_type, kcalShare: total ? round((Number(r.kcal) / total) * 100, 0) : 0, proteinShare: totalP ? round((Number(r.protein) / totalP) * 100, 0) : 0, avgProteinG: round(Number(r.protein) / Math.max(1, Number(r.days)), 1) })),
    note: "Meal timing is a preference, not a requirement for fat loss. Spreading protein over 3–4 meals (~20–40 g each) can help muscle-building goals.",
  };
}

export async function foodVariety(db: Db, userId: string, from: string, to: string) {
  const rows = rowsOf<{ grp: string | null; n: string; names: string[] }>(
    await db.execute(sql`
      SELECT fc."group" AS grp, count(DISTINCT me.food_id) n, (array_agg(DISTINCT me.name))[1:8] AS names
      FROM meal_entries me JOIN meals m ON m.id = me.meal_id
      JOIN foods f ON f.id = me.food_id LEFT JOIN food_categories fc ON fc.id = f.category_id
      WHERE me.user_id = ${userId} AND m.date BETWEEN ${from} AND ${to}
      GROUP BY fc."group"`),
  );
  // Recipes count as their ingredient groups.
  const ing = rowsOf<{ grp: string | null; n: string }>(
    await db.execute(sql`
      SELECT fc."group" AS grp, count(DISTINCT ri.food_id) n
      FROM meal_entries me JOIN meals m ON m.id = me.meal_id
      JOIN recipe_ingredients ri ON ri.recipe_id = me.recipe_id
      JOIN foods f ON f.id = ri.food_id LEFT JOIN food_categories fc ON fc.id = f.category_id
      WHERE me.user_id = ${userId} AND m.date BETWEEN ${from} AND ${to} AND ri.role = 'main'
      GROUP BY fc."group"`),
  );
  const groups = new Map<string, number>();
  for (const r of [...rows, ...ing]) groups.set(r.grp ?? "other", (groups.get(r.grp ?? "other") ?? 0) + Number(r.n));
  return {
    groups: [...groups.entries()].map(([group, count]) => ({ group, count })).sort((a, b) => b.count - a.count),
    distinctFoods: rows.reduce((a, r) => a + Number(r.n), 0),
  };
}

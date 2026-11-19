import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { CORE_NUTRIENTS, round, sumNutrients, type Nutrients } from "@/lib/nutrition/engine";
import { ApiError, notFound } from "@/lib/errors";
import { portionNutrition } from "./foods";
import { recomputeDailySummary } from "./summary";

export const MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "evening_snack", "dinner", "pre_workout", "post_workout", "custom"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning snack",
  lunch: "Lunch",
  evening_snack: "Evening snack",
  dinner: "Dinner",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
  custom: "Custom meal",
};

async function ensureMeal(db: Db, userId: string, date: string, mealType: MealType, name = "") {
  const [existing] = await db
    .select()
    .from(s.meals)
    .where(and(eq(s.meals.userId, userId), eq(s.meals.date, date), eq(s.meals.mealType, mealType), eq(s.meals.name, name)));
  if (existing) return existing;
  const [created] = await db.insert(s.meals).values({ userId, date, mealType, name }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db
    .select()
    .from(s.meals)
    .where(and(eq(s.meals.userId, userId), eq(s.meals.date, date), eq(s.meals.mealType, mealType), eq(s.meals.name, name)));
  return again!;
}

/** kcal from added fats / added sugars per 100 g of a recipe's cooked dish (hidden-calorie tracker). */
async function recipeHiddenPer100(db: Db, recipeId: number) {
  const [recipe] = await db.select().from(s.recipes).where(eq(s.recipes.id, recipeId));
  if (!recipe) return null;
  const rows = await db
    .select({ grams: s.recipeIngredients.quantityG, role: s.recipeIngredients.role, kcal: s.foods.kcal })
    .from(s.recipeIngredients)
    .leftJoin(s.foods, eq(s.foods.id, s.recipeIngredients.foodId))
    .where(eq(s.recipeIngredients.recipeId, recipeId));
  const raw = rows.reduce((a, r) => a + r.grams, 0);
  const cooked = recipe.cookedWeightG ?? raw;
  if (!cooked) return null;
  const fat = rows.filter((r) => r.role === "fat").reduce((a, r) => a + ((r.kcal ?? 0) * r.grams) / 100, 0);
  const sugar = rows.filter((r) => r.role === "sugar").reduce((a, r) => a + ((r.kcal ?? 0) * r.grams) / 100, 0);
  return { fat: (fat / cooked) * 100, sugar: (sugar / cooked) * 100 };
}

export interface AddEntryInput {
  date: string;
  mealType: MealType;
  mealName?: string;
  foodId: number;
  quantity: number;
  unit: string;
  clientId?: string | null;
  source?: (typeof s.recordSourceEnum.enumValues)[number];
  scanId?: number | null;
  /** Override portion grams (e.g. AI-estimated grams confirmed by the user). */
  grams?: number | null;
  confidence?: number | null;
  displayName?: string | null;
}

export async function addEntry(db: Db, userId: string, input: AddEntryInput) {
  if (input.clientId) {
    const [dupe] = await db.select().from(s.mealEntries).where(and(eq(s.mealEntries.userId, userId), eq(s.mealEntries.clientId, input.clientId)));
    if (dupe) return { entry: dupe, duplicate: true }; // idempotent offline replay
  }
  const p = input.grams
    ? await portionNutrition(db, userId, input.foodId, input.grams, "g")
    : await portionNutrition(db, userId, input.foodId, input.quantity, input.unit);
  const meal = await ensureMeal(db, userId, input.date, input.mealType, input.mealName ?? "");
  const hidden = p.food.recipeId ? await recipeHiddenPer100(db, p.food.recipeId) : null;
  const n = p.nutrients;
  const quality = p.isEstimate && p.food.dataQuality === "verified" ? "estimated" : p.food.dataQuality;
  const [entry] = await db
    .insert(s.mealEntries)
    .values({
      mealId: meal.id,
      userId,
      foodId: p.food.id,
      recipeId: p.food.recipeId,
      name: input.displayName?.trim() || p.food.name,
      quantity: input.quantity,
      unit: input.grams ? `${input.unit}` : input.unit,
      grams: round(p.grams, 1),
      kcal: n.kcal ?? 0,
      proteinG: n.proteinG ?? 0,
      carbsG: n.carbsG ?? 0,
      fatG: n.fatG ?? 0,
      fibreG: n.fibreG,
      sugarG: n.sugarG,
      satFatG: n.satFatG,
      sodiumMg: n.sodiumMg,
      potassiumMg: n.potassiumMg,
      calciumMg: n.calciumMg,
      ironMg: n.ironMg,
      addedFatKcal: hidden ? (hidden.fat * p.grams) / 100 : null,
      addedSugarKcal: hidden ? (hidden.sugar * p.grams) / 100 : null,
      dataQuality: quality,
      confidence: Math.min(p.food.confidence, input.confidence ?? 1, p.isEstimate ? 0.7 : 1),
      source: input.source ?? "manual",
      scanId: input.scanId ?? null,
      clientId: input.clientId ?? null,
    })
    .returning();
  await db.update(s.foods).set({ popularity: sql`least(${s.foods.popularity} + 1, 1000)` }).where(eq(s.foods.id, p.food.id));
  await recomputeDailySummary(db, userId, input.date);
  return { entry: entry!, duplicate: false, portionBasis: p.basis, isEstimate: p.isEstimate };
}

async function ownedEntry(db: Db, userId: string, id: number) {
  const [row] = await db
    .select({ entry: s.mealEntries, date: s.meals.date, mealType: s.meals.mealType })
    .from(s.mealEntries)
    .innerJoin(s.meals, eq(s.meals.id, s.mealEntries.mealId))
    .where(and(eq(s.mealEntries.id, id), eq(s.mealEntries.userId, userId)));
  if (!row) throw notFound("Entry");
  return row;
}

export async function updateEntry(db: Db, userId: string, id: number, input: { quantity?: number; unit?: string; mealType?: MealType; date?: string }) {
  const current = await ownedEntry(db, userId, id);
  const quantity = input.quantity ?? current.entry.quantity;
  const unit = input.unit ?? current.entry.unit;
  const date = input.date ?? current.date;
  const mealType = (input.mealType ?? current.mealType) as MealType;
  if (!current.entry.foodId) throw new ApiError(409, "The food for this entry no longer exists; delete and re-add it");
  const p = await portionNutrition(db, userId, current.entry.foodId, quantity, unit);
  const meal = await ensureMeal(db, userId, date, mealType);
  const scale = current.entry.grams > 0 ? p.grams / current.entry.grams : 1;
  const n = p.nutrients;
  const [entry] = await db
    .update(s.mealEntries)
    .set({
      mealId: meal.id,
      quantity,
      unit,
      grams: round(p.grams, 1),
      kcal: n.kcal ?? 0,
      proteinG: n.proteinG ?? 0,
      carbsG: n.carbsG ?? 0,
      fatG: n.fatG ?? 0,
      fibreG: n.fibreG,
      sugarG: n.sugarG,
      satFatG: n.satFatG,
      sodiumMg: n.sodiumMg,
      potassiumMg: n.potassiumMg,
      calciumMg: n.calciumMg,
      ironMg: n.ironMg,
      addedFatKcal: current.entry.addedFatKcal != null ? current.entry.addedFatKcal * scale : null,
      addedSugarKcal: current.entry.addedSugarKcal != null ? current.entry.addedSugarKcal * scale : null,
      updatedAt: new Date(),
    })
    .where(eq(s.mealEntries.id, id))
    .returning();
  await recomputeDailySummary(db, userId, current.date);
  if (date !== current.date) await recomputeDailySummary(db, userId, date);
  return entry!;
}

export async function deleteEntry(db: Db, userId: string, id: number) {
  const current = await ownedEntry(db, userId, id);
  await db.delete(s.mealEntries).where(eq(s.mealEntries.id, id));
  await recomputeDailySummary(db, userId, current.date);
}

export async function duplicateEntry(db: Db, userId: string, id: number, target?: { date?: string; mealType?: MealType }) {
  const current = await ownedEntry(db, userId, id);
  const date = target?.date ?? current.date;
  const meal = await ensureMeal(db, userId, date, (target?.mealType ?? current.mealType) as MealType);
  const { id: _omit, createdAt: _c, updatedAt: _u, clientId: _cl, loggedAt: _l, ...rest } = current.entry;
  const [entry] = await db.insert(s.mealEntries).values({ ...rest, mealId: meal.id }).returning();
  await recomputeDailySummary(db, userId, date);
  return entry!;
}

/** Copies all entries (optionally one meal) from one day to another. */
export async function copyDay(db: Db, userId: string, from: string, to: string, mealType?: MealType) {
  if (from === to) throw new ApiError(400, "Choose a different day to copy from");
  const meals = await db
    .select()
    .from(s.meals)
    .where(and(eq(s.meals.userId, userId), eq(s.meals.date, from), mealType ? eq(s.meals.mealType, mealType) : undefined));
  if (!meals.length) return { copied: 0 };
  const entries = await db.select().from(s.mealEntries).where(inArray(s.mealEntries.mealId, meals.map((m) => m.id)));
  let copied = 0;
  for (const meal of meals) {
    const target = await ensureMeal(db, userId, to, meal.mealType as MealType, meal.name);
    const rows = entries.filter((e) => e.mealId === meal.id).map(({ id: _i, createdAt: _c, updatedAt: _u, clientId: _cl, loggedAt: _l, ...rest }) => ({ ...rest, mealId: target.id }));
    if (rows.length) await db.insert(s.mealEntries).values(rows);
    copied += rows.length;
  }
  await recomputeDailySummary(db, userId, to);
  return { copied };
}

export async function getDay(db: Db, userId: string, date: string) {
  const meals = await db.select().from(s.meals).where(and(eq(s.meals.userId, userId), eq(s.meals.date, date)));
  const entries = meals.length
    ? await db.select().from(s.mealEntries).where(inArray(s.mealEntries.mealId, meals.map((m) => m.id))).orderBy(asc(s.mealEntries.loggedAt))
    : [];
  const groups = MEAL_TYPES.flatMap((type) =>
    meals
      .filter((m) => m.mealType === type)
      .map((m) => {
        const items = entries.filter((e) => e.mealId === m.id);
        return { mealId: m.id, mealType: type, name: m.name || MEAL_LABELS[type], entries: items, totals: totalsOf(items) };
      })
      .filter((g) => g.entries.length > 0),
  );
  return { date, meals: groups, totals: totalsOf(entries) };
}

export function totalsOf(entries: (typeof s.mealEntries.$inferSelect)[]) {
  const t = sumNutrients(entries.map((e) => Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, e[k]])) as Partial<Nutrients>));
  return {
    ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, round(t[k], k === "kcal" ? 0 : 1)])),
    missing: t.missing,
    addedFatKcal: round(entries.reduce((a, e) => a + (e.addedFatKcal ?? 0), 0), 0),
    addedSugarKcal: round(entries.reduce((a, e) => a + (e.addedSugarKcal ?? 0), 0), 0),
    count: entries.length,
  } as Record<(typeof CORE_NUTRIENTS)[number], number> & { missing: Partial<Record<string, number>>; addedFatKcal: number; addedSugarKcal: number; count: number };
}

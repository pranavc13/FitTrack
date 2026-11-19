import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { addEntry, copyDay, deleteEntry, getDay, updateEntry } from "@/lib/services/diary";
import { getSummary } from "@/lib/services/summary";
import { searchFoods, createCustomFood, getFood } from "@/lib/services/foods";
import { recalculateTargets, setCustomTargets, upsertProfile } from "@/lib/services/profile";
import { logActivity, setSteps } from "@/lib/services/activity";
import { logWeight } from "@/lib/services/body";
import { getRecipe, saveRecipe } from "@/lib/services/recipes";
import { addWater, startFast } from "@/lib/services/wellness";
import { commitImport, parseImportFile, previewImport } from "@/lib/services/imports";
import { finishWorkout, logSet, startWorkout } from "@/lib/services/workouts";
import { labelIndicators } from "@/lib/services/scans";
import { toCsv } from "@/lib/services/reports";
import { rateLimit } from "@/lib/server/rate-limit";
import { ApiError } from "@/lib/errors";

let db: Db;
let alice: string;
let bob: string;
const ids = {} as Record<string, number> & Record<"paneer" | "rice" | "oil" | "onion" | "pushup", number>;
const DAY = "2026-03-10";

async function food(name: string, n: Partial<typeof s.foods.$inferInsert>) {
  const [row] = await db.insert(s.foods).values({ name, searchText: name.toLowerCase(), dataQuality: "verified", confidence: 0.95, ...n }).returning();
  return row!.id;
}

beforeAll(async () => {
  db = await createDb("memory://");
  const [a] = await db.insert(s.users).values({ email: "alice@test.dev", name: "Alice", passwordHash: "x" }).returning();
  const [b] = await db.insert(s.users).values({ email: "bob@test.dev", name: "Bob", passwordHash: "x" }).returning();
  alice = a!.id;
  bob = b!.id;
  ids.paneer = await food("Cheese, paneer", { kcal: 300, proteinG: 18, carbsG: 4, fatG: 23, fibreG: 0, foodType: "ingredient" });
  ids.rice = await food("Rice, white, cooked", { kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fibreG: 0.4 });
  ids.oil = await food("Oil, soybean, salad or cooking", { kcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fibreG: 0 });
  ids.onion = await food("Onions, raw", { kcal: 40, proteinG: 1.1, carbsG: 9.3, fatG: 0.1, fibreG: 1.7, state: "raw" });
  await db.insert(s.foodSynonyms).values({ foodId: ids.paneer, name: "पनीर", language: "hi" });
  await db.insert(s.foodServings).values({ foodId: ids.rice, label: "1 katori (150 g)", unit: "katori", amount: 1, grams: 150, isDefault: true });
  for (const [code, met, cat] of [["02050", 6.0, "Gym & strength"], ["02054", 3.5, "Gym & strength"], ["02052", 5.0, "Gym & strength"], ["17190", 3.8, "Walking"], ["12050", 9.3, "Running"], ["02035", 5.0, "High intensity"]] as const) {
    const [t] = await db.insert(s.activityTypes).values({ code, name: `Activity ${code}`, category: cat, met, intensity: "moderate", source: "test", supportsDistance: cat === "Walking" || cat === "Running", searchText: code }).returning();
    ids[`act${code}`] = t!.id;
  }
  const [ex] = await db
    .insert(s.exercises)
    .values({ slug: "push-up", name: "Push-up", primaryMuscle: "chest", difficulty: "beginner", mechanics: "compound", location: "both", instructions: ["x"], commonMistakes: ["x"], defaultSets: 3, defaultReps: "8-12", defaultRestSec: 60, met: 3.8 })
    .returning();
  ids.pushup = ex!.id;
  for (const u of [alice, bob]) await db.insert(s.userPreferences).values({ userId: u, timezone: "Asia/Kolkata" });
  await upsertProfile(db, alice, { dateOfBirth: "1995-01-01", sex: "female", heightCm: 162, currentWeightKg: 64, activityLevel: "light", primaryGoal: "fat_loss", dietPreference: "vegetarian" });
  await recalculateTargets(db, alice);
}, 120_000);

describe("food search & custom foods", () => {
  it("finds foods by Hindi synonym", async () => {
    const r = await searchFoods(db, alice, "पनीर");
    expect(r[0]?.id).toBe(ids.paneer);
  });
  it("keeps custom foods private to their owner", async () => {
    const f = await createCustomFood(db, bob, { name: "Bob's secret protein bar", per100g: { kcal: 400, proteinG: 30, carbsG: 40, fatG: 12 } });
    expect((await searchFoods(db, bob, "secret protein bar")).some((x) => x.id === f.id)).toBe(true);
    expect((await searchFoods(db, alice, "secret protein bar")).some((x) => x.id === f.id)).toBe(false);
    await expect(getFood(db, alice, f.id)).rejects.toBeInstanceOf(ApiError);
  });
  it("rejects inconsistent nutrition", async () => {
    await expect(createCustomFood(db, alice, { name: "bad", per100g: { kcal: 100, proteinG: 80, carbsG: 50, fatG: 10 } })).rejects.toThrow(/inconsistent/);
  });
});

describe("diary", () => {
  it("logs entries with food-specific portions and summarises the day", async () => {
    const r = await addEntry(db, alice, { date: DAY, mealType: "lunch", foodId: ids.rice, quantity: 1, unit: "katori" });
    expect(r.entry.grams).toBe(150);
    expect(r.entry.kcal).toBeCloseTo(195);
    const sum = await getSummary(db, alice, DAY);
    expect(sum.kcalIn).toBeCloseTo(195);
  });
  it("is idempotent for offline replays (same clientId)", async () => {
    const a = await addEntry(db, alice, { date: DAY, mealType: "dinner", foodId: ids.paneer, quantity: 100, unit: "g", clientId: "offline-123" });
    const b = await addEntry(db, alice, { date: DAY, mealType: "dinner", foodId: ids.paneer, quantity: 100, unit: "g", clientId: "offline-123" });
    expect(b.duplicate).toBe(true);
    expect(b.entry.id).toBe(a.entry.id);
    const day = await getDay(db, alice, DAY);
    expect(day.totals.kcal).toBe(495);
  });
  it("updates and deletes entries, keeping summaries in sync", async () => {
    const day = await getDay(db, alice, DAY);
    const entry = day.meals.find((m) => m.mealType === "dinner")!.entries[0]!;
    await updateEntry(db, alice, entry.id, { quantity: 200 });
    expect((await getSummary(db, alice, DAY)).kcalIn).toBeCloseTo(195 + 600);
    await deleteEntry(db, alice, entry.id);
    expect((await getSummary(db, alice, DAY)).kcalIn).toBeCloseTo(195);
  });
  it("prevents other users from editing or deleting entries", async () => {
    const day = await getDay(db, alice, DAY);
    const id = day.meals[0]!.entries[0]!.id;
    await expect(updateEntry(db, bob, id, { quantity: 5 })).rejects.toMatchObject({ status: 404 });
    await expect(deleteEntry(db, bob, id)).rejects.toMatchObject({ status: 404 });
    expect((await getDay(db, bob, DAY)).totals.count).toBe(0);
  });
  it("copies a previous day", async () => {
    const r = await copyDay(db, alice, DAY, "2026-03-11");
    expect(r.copied).toBe(1);
    expect((await getSummary(db, alice, "2026-03-11")).kcalIn).toBeCloseTo(195);
  });
  it("rejects missing nutrition records", async () => {
    await expect(addEntry(db, alice, { date: DAY, mealType: "lunch", foodId: 999999, quantity: 1, unit: "g" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("energy balance", () => {
  it("adds net (not gross) exercise kcal and never adds steps or device calories", async () => {
    const before = await getSummary(db, alice, DAY);
    const a = await logActivity(db, alice, { activityTypeId: ids.act12050!, date: DAY, durationMin: 30, deviceKcal: 999 });
    expect(a.netKcal).toBeLessThan(a.grossKcal);
    await setSteps(db, alice, DAY, 12000);
    const after = await getSummary(db, alice, DAY);
    expect(after.exerciseNetKcal).toBeCloseTo(a.netKcal);
    expect(after.baselineKcal).toBe(before.baselineKcal);
    expect(after.steps).toBe(12000);
  });
  it("uses speed to refine walking MET", async () => {
    const a = await logActivity(db, alice, { activityTypeId: ids.act17190!, date: DAY, durationMin: 60, distanceKm: 6 });
    expect(a.metUsed).toBe(4.8);
  });
});

describe("targets", () => {
  it("keeps custom targets when the profile changes, with warnings for extremes", async () => {
    const r = await setCustomTargets(db, alice, { calories: 1000, proteinG: 120, carbsG: 60, fatG: 30, fibreG: 25, waterMl: 2500 });
    expect(r.warnings.length).toBeGreaterThan(0);
    await logWeight(db, alice, "2026-03-12", 63.5);
    const [t] = await db.select().from(s.nutritionTargets).where(eq(s.nutritionTargets.userId, alice));
    expect(t!.calories).toBe(1000);
    expect(t!.isCustom).toBe(true);
  });
});

describe("recipes", () => {
  it("saves a recipe, computes yield-adjusted nutrition, and versions edits", async () => {
    const input = {
      name: "My paneer bhurji",
      servings: 2,
      cookedWeightG: 250,
      ingredients: [
        { foodId: ids.paneer, name: "paneer", grams: 150 },
        { foodId: ids.onion, name: "onion", grams: 100 },
        { foodId: ids.oil, name: "oil", grams: 5 },
      ],
    };
    const v1 = await saveRecipe(db, alice, input);
    const d1 = await getRecipe(db, alice, v1.id);
    expect(d1.nutrition.total.kcal).toBe(Math.round(450 + 40 + 44.2));
    expect(d1.nutrition.addedFatKcal).toBe(44);
    expect(d1.nutrition.per100g.kcal).toBe(Math.round(((450 + 40 + 44.2) / 250) * 100));
    const scaled = await getRecipe(db, alice, v1.id, 4);
    expect(scaled.ingredients[0]!.grams).toBe(300);
    const v2 = await saveRecipe(db, alice, { ...input, ingredients: input.ingredients.map((i) => (i.name === "oil" ? { ...i, grams: 10 } : i)) }, v1.id);
    expect(v2.version).toBe(2);
    expect(v2.parentRecipeId).toBe(v1.id);
    await expect(getRecipe(db, bob, v1.id)).rejects.toMatchObject({ status: 404 });
  });
  it("refuses recipes with mostly unmatched ingredients", async () => {
    await expect(saveRecipe(db, alice, { name: "x", servings: 1, ingredients: [{ foodId: null, name: "mystery", grams: 100 }] })).rejects.toThrow(/unmatched/);
  });
});

describe("wellness", () => {
  it("dedupes offline water logs", async () => {
    await addWater(db, alice, DAY, 250, "w-1");
    await addWater(db, alice, DAY, 250, "w-1");
    expect((await getSummary(db, alice, DAY)).waterMl).toBe(250);
  });
  it("refuses extreme fasting windows", async () => {
    await expect(startFast(db, alice, 72)).rejects.toThrow(/10–24/);
  });
});

describe("activity imports", () => {
  const csv = "Date,Step count,Distance (m),Calories (kcal),Move Minutes count\n2026-02-01,8200,6100,2100,45\n2026-02-02,9100,6800,2200,50\nbad-date,1,1,1,1\n";
  it("previews, filters by date, dedupes, and never claims live sync", async () => {
    const parsed = parseImportFile("Daily activity metrics.csv", Buffer.from(csv), "Asia/Kolkata");
    expect(parsed.provider).toBe("google_fit_takeout");
    expect(parsed.errors.length).toBe(1);
    const preview = await previewImport(db, alice, "Daily activity metrics.csv", parsed, { from: "2026-02-02" });
    expect(preview.counts.byType.steps).toBe(1);
    expect(preview.note).toMatch(/does not connect/);
    const stats = await commitImport(db, alice, preview.jobId, parsed, { from: "2026-02-02" });
    expect(stats.stepDays).toBe(1);
    const again = await previewImport(db, alice, "Daily activity metrics.csv", parsed, { from: "2026-02-02" });
    expect(again.counts.new).toBe(0);
    expect(again.counts.duplicates).toBeGreaterThan(0);
    // Device calories are stored but not added to expenditure.
    expect((await getSummary(db, alice, "2026-02-02")).exerciseNetKcal).toBe(0);
  });
  it("does not overwrite manual step entries", async () => {
    await setSteps(db, bob, "2026-02-01", 500);
    const parsed = parseImportFile("Daily activity metrics.csv", Buffer.from(csv), "Asia/Kolkata");
    const p = await previewImport(db, bob, "x.csv", parsed, {});
    const stats = await commitImport(db, bob, p.jobId, parsed, {});
    expect(stats.skippedManual).toBe(1);
    expect((await getSummary(db, bob, "2026-02-01")).steps).toBe(500);
  });
  it("rejects unsupported files", () => {
    expect(() => parseImportFile("data.xlsx", Buffer.from("x"), "UTC")).toThrow(/Upload a/);
  });
});

describe("workouts", () => {
  it("logs sets, detects PRs and logs one activity on finish", async () => {
    await logWeight(db, bob, "2026-03-01", 75);
    const w = await startWorkout(db, bob, { date: "2026-03-01", name: "Home" });
    const [we] = await db.insert(s.workoutExercises).values({ workoutId: w.workout.id, exerciseId: ids.pushup!, sort: 0 }).returning();
    await logSet(db, bob, w.workout.id, { workoutExerciseId: we!.id, reps: 10 });
    const second = await logSet(db, bob, w.workout.id, { workoutExerciseId: we!.id, reps: 12 });
    expect(second.newRecords.some((r) => r.kind === "max_reps")).toBe(true);
    await finishWorkout(db, bob, w.workout.id);
    const acts = await db.select().from(s.activityLogs).where(eq(s.activityLogs.workoutId, w.workout.id));
    expect(acts).toHaveLength(1);
    await expect(logSet(db, alice, w.workout.id, { workoutExerciseId: we!.id, reps: 1 })).rejects.toMatchObject({ status: 404 });
  });
});

describe("labels, reports and security", () => {
  it("flags high sugar/sodium and detects undeclared allergen terms", () => {
    const r = labelIndicators({ sugarG: 30, sodiumMg: 800, satFatG: 1 }, false, "Wheat flour, sugar, milk solids, peanuts", ["wheat"]);
    expect(r.warnings.map((w) => w.key)).toEqual(expect.arrayContaining(["sugar", "sodium"]));
    expect(r.allergens.detectedInIngredients).toEqual(expect.arrayContaining(["gluten", "milk", "peanut"]));
  });
  it("neutralises CSV formula injection", () => {
    expect(toCsv([{ name: "=HYPERLINK(\"x\")" }])).toContain("'=HYPERLINK");
  });
  it("rate limits", async () => {
    await rateLimit(db, "test-key", 2);
    await rateLimit(db, "test-key", 2);
    await expect(rateLimit(db, "test-key", 2)).rejects.toMatchObject({ status: 429 });
  });
});

import { matchIngredient } from "@/lib/services/recipes";

describe("recipe ingredient matching", () => {
  it("prefers the curated ingredient over look-alike synonyms", async () => {
    const tofu = await food("Tofu, raw, firm, prepared with calcium sulfate", { kcal: 144, proteinG: 17, carbsG: 3, fatG: 9, state: "raw", foodType: "ingredient" });
    await db.insert(s.foodSynonyms).values({ foodId: tofu, name: "soy paneer", language: "en" });
    expect((await matchIngredient(db, alice, "Paneer"))[0]?.id).toBe(ids.paneer);
    expect((await matchIngredient(db, alice, "oil"))[0]?.id).toBe(ids.oil);
  });
});

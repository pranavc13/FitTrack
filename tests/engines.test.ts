import { describe, expect, it } from "vitest";
import { atwaterDeviation, computeRecipeNutrition, scaleNutrients, scaleRecipe, sumNutrients, validatePer100g } from "@/lib/nutrition/engine";
import { resolveGrams } from "@/lib/nutrition/units";
import { bmi, bmrMifflin, calculateTargets, ageFromDob } from "@/lib/nutrition/targets";
import { calculateActivity, estimateOneRepMax, grossKcal, metFromSpeed, netKcal } from "@/lib/activity/met";
import { adaptiveTdee, detectPlateau, ewma, linearRegression, predictWeeksToTarget, streak, type Point } from "@/lib/analytics/trends";

const paneer = { kcal: 321, proteinG: 21.4, carbsG: 3.6, fatG: 25, fibreG: 0, sugarG: 2.6, satFatG: 16, sodiumMg: 20, potassiumMg: 100, calciumMg: 480, ironMg: 0.3 };
const oil = { kcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fibreG: 0, sugarG: 0, satFatG: 10, sodiumMg: 0, potassiumMg: 0, calciumMg: 0, ironMg: 0 };
const onion = { kcal: 40, proteinG: 1.1, carbsG: 9.3, fatG: 0.1, fibreG: 1.7, sugarG: 4.2, satFatG: 0, sodiumMg: 4, potassiumMg: 146, calciumMg: 23, ironMg: 0.2 };

describe("nutrient scaling", () => {
  it("scales per-100g to grams", () => {
    const n = scaleNutrients(paneer, 150);
    expect(n.kcal).toBeCloseTo(481.5);
    expect(n.proteinG).toBeCloseTo(32.1);
  });
  it("keeps missing values null and counts them when summing", () => {
    const n = scaleNutrients({ kcal: 100, proteinG: null }, 50);
    expect(n.proteinG).toBeNull();
    const t = sumNutrients([n, scaleNutrients(paneer, 100)]);
    expect(t.proteinG).toBeCloseTo(21.4);
    expect(t.missing.proteinG).toBe(1);
  });
  it("rejects invalid grams", () => {
    expect(() => scaleNutrients(paneer, -1)).toThrow();
    expect(() => scaleNutrients(paneer, Number.NaN)).toThrow();
  });
  it("validates nutrient profiles", () => {
    expect(validatePer100g(paneer)).toEqual([]);
    expect(validatePer100g({ proteinG: 60, carbsG: 50, fatG: 10 })).toHaveLength(1);
    expect(validatePer100g({ carbsG: 5, fibreG: 10 })[0]).toMatch(/Fibre/);
    expect(atwaterDeviation(paneer)!).toBeLessThan(0.1);
  });
});

describe("recipe engine", () => {
  const ingredients = [
    { name: "paneer", grams: 150, per100g: paneer },
    { name: "onion", grams: 100, per100g: onion },
    { name: "oil", grams: 5, per100g: oil, role: "fat" as const },
    { name: "water", grams: 50, per100g: null, role: "water" as const },
  ];
  it("sums ingredient nutrition and tracks added fat", () => {
    const r = computeRecipeNutrition(ingredients, { servings: 2 });
    expect(r.total.kcal).toBeCloseTo(481.5 + 40 + 44.2);
    expect(r.addedFatKcal).toBeCloseTo(44.2);
    expect(r.rawWeightG).toBe(305);
    expect(r.perServing.kcal).toBeCloseTo(r.total.kcal / 2);
    expect(r.coverage).toBe(1);
  });
  it("accounts for cooked yield (evaporation concentrates nutrients)", () => {
    const raw = computeRecipeNutrition(ingredients, { servings: 1 });
    const cooked = computeRecipeNutrition(ingredients, { servings: 1, cookedWeightG: 229 });
    expect(cooked.total.kcal).toBeCloseTo(raw.total.kcal); // energy conserved
    expect(cooked.per100g.kcal).toBeCloseTo((raw.total.kcal / 229) * 100);
    expect(cooked.yieldFactor).toBeCloseTo(229 / 305);
  });
  it("600 g raw becoming 450 g cooked raises density by 600/450", () => {
    const r = computeRecipeNutrition([{ name: "dal mix", grams: 600, per100g: { kcal: 100, proteinG: 6, carbsG: 15, fatG: 2 } }], { servings: 3, cookedWeightG: 450 });
    expect(r.per100g.kcal).toBeCloseTo(133.33, 1);
    expect(r.servingWeightG).toBe(150);
  });
  it("reports unmatched ingredients and coverage", () => {
    const r = computeRecipeNutrition([...ingredients, { name: "mystery masala", grams: 45, per100g: null }], { servings: 1 });
    expect(r.unmatched).toEqual(["mystery masala"]);
    expect(r.coverage).toBeCloseTo(305 / 350);
  });
  it("scales recipes", () => {
    const s = scaleRecipe(ingredients, 2, 4, 229);
    expect(s.ingredients[0]!.grams).toBe(300);
    expect(s.cookedWeightG).toBe(458);
    expect(() => scaleRecipe(ingredients, 0, 4)).toThrow();
  });
});

describe("portion conversion", () => {
  const servings = [
    { label: "1 medium roti", unit: "piece", amount: 1, grams: 40 },
    { label: "1 cup, chopped", unit: "cup", amount: 1, grams: 160 },
  ];
  it("uses mass units directly", () => expect(resolveGrams(2, "kg").grams).toBe(2000));
  it("prefers food-specific measures", () => {
    expect(resolveGrams(3, "piece", servings)).toMatchObject({ grams: 120, isEstimate: false });
    expect(resolveGrams(0.5, "cup", servings).grams).toBe(80);
  });
  it("uses density for volumes", () => expect(resolveGrams(200, "ml", [], 1.03).grams).toBeCloseTo(206));
  it("flags generic volume conversions as estimates", () => {
    expect(resolveGrams(1, "katori")).toMatchObject({ grams: 150, isEstimate: true });
  });
  it("refuses impossible conversions", () => {
    expect(() => resolveGrams(1, "piece")).toThrow(/No conversion/);
    expect(() => resolveGrams(0, "g")).toThrow();
  });
});

describe("targets", () => {
  it("computes BMI and Mifflin-St Jeor BMR", () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(bmrMifflin(70, 175, 30, "male")).toBeCloseTo(1648.75);
    expect(bmrMifflin(60, 160, 30, "female")).toBeCloseTo(1289);
    expect(bmrMifflin(70, 175, 30, "unspecified")).toBeCloseTo(1648.75 - 83);
  });
  it("computes age from DOB", () => expect(ageFromDob("1995-06-15", new Date("2026-06-14T00:00:00Z"))).toBe(30));
  it("creates a moderate deficit for fat loss, never below BMR", () => {
    const t = calculateTargets({ weightKg: 80, heightCm: 175, ageYears: 30, sex: "male", activityLevel: "light", goal: "fat_loss" });
    expect(t.calories).toBeLessThan(t.tdee);
    expect(t.tdee - t.calories).toBeLessThanOrEqual(660);
    expect(t.calories).toBeGreaterThanOrEqual(t.bmr - 10);
    expect(t.proteinG).toBe(144);
    expect(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9).toBeLessThanOrEqual(t.calories + 10);
  });
  it("uses adjusted weight for protein when BMI is 30 or more", () => {
    const t = calculateTargets({ weightKg: 120, heightCm: 170, ageYears: 40, sex: "female", activityLevel: "sedentary", goal: "weight_loss" });
    expect(t.proteinG).toBe(Math.round(1.6 * 25 * 1.7 ** 2));
  });
  it("adds a surplus for muscle gain and rejects bad input", () => {
    const t = calculateTargets({ weightKg: 65, heightCm: 172, ageYears: 24, sex: "male", activityLevel: "moderate", goal: "muscle_gain" });
    expect(t.calories).toBeGreaterThan(t.tdee);
    expect(() => calculateTargets({ weightKg: 5, heightCm: 172, ageYears: 24, sex: "male", activityLevel: "moderate", goal: "muscle_gain" })).toThrow();
  });
});

describe("MET calculations", () => {
  it("matches the Compendium formula", () => {
    expect(grossKcal(8, 70, 30)).toBeCloseTo(294); // 8 × 3.5 × 70 / 200 × 30
    expect(netKcal(8, 70, 30)).toBeCloseTo(257.25);
    expect(netKcal(0.9, 70, 30)).toBe(0);
  });
  it("derives MET from speed", () => {
    expect(metFromSpeed("walk", 5.0)).toBe(3.8);
    expect(metFromSpeed("run", 10.8)).toBe(10.5);
    expect(metFromSpeed("walk", 1)).toBe(2.3);
  });
  it("calculates activity with distance", () => {
    const a = calculateActivity({ met: 3.5, weightKg: 70, durationMin: 60, distanceKm: 6, speedBased: "walk" });
    expect(a.speedKmh).toBe(6);
    expect(a.met).toBe(4.8);
    expect(a.intensity).toBe("moderate");
  });
  it("rejects invalid input", () => expect(() => grossKcal(5, 70, -5)).toThrow());
  it("estimates 1RM", () => expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1));
});

function series(start: string, days: number, f: (i: number) => number): Point[] {
  const t0 = Date.parse(start + "T00:00:00Z");
  return Array.from({ length: days }, (_, i) => ({ date: new Date(t0 + i * 86400000).toISOString().slice(0, 10), value: f(i) }));
}

describe("trends", () => {
  it("smooths and regresses", () => {
    const pts = series("2026-01-01", 30, (i) => 80 - i * 0.07 + (i % 2 ? 0.5 : -0.5));
    expect(ewma(pts)).toHaveLength(30);
    expect(linearRegression(pts)!.slopePerDay).toBeCloseTo(-0.07, 1);
  });
  it("detects plateaus vs progress", () => {
    const flat = series("2026-01-01", 28, (i) => 75 + (i % 3) * 0.3);
    expect(detectPlateau(flat, "loss").status).toBe("plateau");
    const losing = series("2026-01-01", 28, (i) => 80 - i * 0.08);
    expect(detectPlateau(losing, "loss").status).toBe("progressing");
    expect(detectPlateau(losing.slice(0, 4), "loss").status).toBe("insufficient_data");
    const gaining = series("2026-01-01", 28, (i) => 80 + i * 0.06);
    expect(detectPlateau(gaining, "loss").status).toBe("moving_away");
  });
  it("estimates adaptive TDEE from intake and weight change", () => {
    // Eating 2000/day while losing 0.5 kg/week: TDEE should be about 2000 + 550
    const weights = series("2026-01-01", 28, (i) => 80 - (i * 0.5) / 7);
    const intake = series("2026-01-01", 28, () => 2000);
    const r = adaptiveTdee(intake, weights);
    expect(r.estimate).not.toBeNull();
    expect(r.estimate!).toBeGreaterThan(2350);
    expect(r.estimate!).toBeLessThan(2650);
    expect(adaptiveTdee(intake.slice(0, 5), weights).estimate).toBeNull();
  });
  it("predicts a range of weeks to target", () => {
    const weights = series("2026-01-01", 42, (i) => 85 - (i * 0.5) / 7);
    const p = predictWeeksToTarget(weights, 78);
    expect(p.weeksLow).not.toBeNull();
    expect(p.weeksLow!).toBeLessThanOrEqual(p.weeksHigh!);
    expect(predictWeeksToTarget(weights, 95).weeksLow).toBeNull();
  });
  it("counts streaks", () => {
    expect(streak(["2026-03-01", "2026-03-02", "2026-03-03"], "2026-03-03")).toBe(3);
    expect(streak(["2026-03-01", "2026-03-02"], "2026-03-03")).toBe(2);
    expect(streak(["2026-03-01"], "2026-03-05")).toBe(0);
  });
});

import { dietTagsFor, violatesAllergies } from "@/lib/recipes/diet";

describe("diet & allergy filtering", () => {
  it("derives diet tags from ingredients", () => {
    expect(dietTagsFor(["paneer", "onion", "oil"])).toEqual(expect.arrayContaining(["vegetarian", "eggetarian"]));
    expect(dietTagsFor(["paneer", "onion"])).not.toContain("vegan");
    expect(dietTagsFor(["paneer", "onion"])).not.toContain("jain");
    expect(dietTagsFor(["tofu", "spinach", "oil"])).toEqual(expect.arrayContaining(["vegan", "jain"]));
    expect(dietTagsFor(["chicken", "onion"])).not.toContain("vegetarian");
    expect(dietTagsFor(["fish", "rice"])).toContain("pescatarian");
  });
  it("maps onboarding allergy labels to ingredient keywords", () => {
    expect(violatesAllergies(["kaju", "rice"], ["Tree nuts"])).toBe(true);
    expect(violatesAllergies(["paneer"], ["Milk / dairy"])).toBe(true);
    expect(violatesAllergies(["atta"], ["Gluten"])).toBe(true);
    expect(violatesAllergies(["prawns"], ["Shellfish"])).toBe(true);
    expect(violatesAllergies(["rice", "moong dal"], ["Peanut", "Soy"])).toBe(false);
    expect(violatesAllergies(["brinjal"], ["brinjal"])).toBe(true);
  });
});

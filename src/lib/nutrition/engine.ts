/**
 * Nutrition engine — pure functions, no I/O. All per-food values are per 100 g of edible portion.
 * A `null` nutrient means "not reported by the source"; it is never silently treated as zero in
 * per-food data, but when summing a day we track how many items lacked the value (completeness).
 */

export const CORE_NUTRIENTS = [
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fibreG",
  "sugarG",
  "satFatG",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
] as const;

export type NutrientKey = (typeof CORE_NUTRIENTS)[number];
export type Nutrients = Record<NutrientKey, number | null>;
/** Totals always carry a number; `missing` counts contributing items that lacked the nutrient. */
export type NutrientTotals = Record<NutrientKey, number> & { missing: Partial<Record<NutrientKey, number>> };

export const NUTRIENT_META: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: "Calories", unit: "kcal" },
  proteinG: { label: "Protein", unit: "g" },
  carbsG: { label: "Carbohydrates", unit: "g" },
  fatG: { label: "Fat", unit: "g" },
  fibreG: { label: "Fibre", unit: "g" },
  sugarG: { label: "Sugar", unit: "g" },
  satFatG: { label: "Saturated fat", unit: "g" },
  sodiumMg: { label: "Sodium", unit: "mg" },
  potassiumMg: { label: "Potassium", unit: "mg" },
  calciumMg: { label: "Calcium", unit: "mg" },
  ironMg: { label: "Iron", unit: "mg" },
};

export function emptyNutrients(): Nutrients {
  return Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, null])) as Nutrients;
}

export function zeroTotals(): NutrientTotals {
  return { ...(Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, 0])) as Record<NutrientKey, number>), missing: {} };
}

export function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Nutrients for `grams` of a food whose profile is per 100 g. */
export function scaleNutrients(per100g: Partial<Nutrients>, grams: number): Nutrients {
  if (!(grams >= 0) || !Number.isFinite(grams)) throw new RangeError(`Invalid grams: ${grams}`);
  const out = emptyNutrients();
  for (const k of CORE_NUTRIENTS) {
    const v = per100g[k];
    out[k] = v == null ? null : (v * grams) / 100;
  }
  return out;
}

export function addInto(totals: NutrientTotals, n: Partial<Nutrients>): NutrientTotals {
  for (const k of CORE_NUTRIENTS) {
    const v = n[k];
    if (v == null) totals.missing[k] = (totals.missing[k] ?? 0) + 1;
    else totals[k] += v;
  }
  return totals;
}

export function sumNutrients(items: Partial<Nutrients>[]): NutrientTotals {
  return items.reduce<NutrientTotals>((acc, n) => addInto(acc, n), zeroTotals());
}

export function roundNutrients<T extends Partial<Record<NutrientKey, number | null>>>(n: T, dp = 1): T {
  const out = { ...n };
  for (const k of CORE_NUTRIENTS) {
    const v = out[k];
    if (typeof v === "number") (out as Record<string, unknown>)[k] = round(v, k === "kcal" ? 0 : dp);
  }
  return out;
}

/** Atwater check: flags nutrient profiles whose energy is inconsistent with macros (data validation). */
export function atwaterDeviation(n: Partial<Nutrients>): number | null {
  if (n.kcal == null || n.proteinG == null || n.carbsG == null || n.fatG == null) return null;
  const fibre = n.fibreG ?? 0;
  const estimated = 4 * n.proteinG + 4 * Math.max(0, n.carbsG - fibre) + 2 * fibre + 9 * n.fatG;
  if (n.kcal < 5 && estimated < 5) return 0;
  return Math.abs(estimated - n.kcal) / Math.max(n.kcal, 1);
}

/** Validates a per-100 g profile. Returns a list of problems (empty = valid). */
export function validatePer100g(n: Partial<Nutrients>): string[] {
  const problems: string[] = [];
  const macroMass = (n.proteinG ?? 0) + (n.carbsG ?? 0) + (n.fatG ?? 0);
  if (macroMass > 101) problems.push(`Macronutrients sum to ${round(macroMass)} g per 100 g`);
  for (const k of CORE_NUTRIENTS) {
    const v = n[k];
    if (v != null && (v < 0 || !Number.isFinite(v))) problems.push(`${k} is negative or invalid`);
  }
  if (n.kcal != null && n.kcal > 902) problems.push("Energy exceeds 902 kcal/100 g (pure fat)");
  if (n.fibreG != null && n.carbsG != null && n.fibreG > n.carbsG + 0.5) problems.push("Fibre exceeds total carbohydrate");
  if (n.satFatG != null && n.fatG != null && n.satFatG > n.fatG + 0.5) problems.push("Saturated fat exceeds total fat");
  if (n.sugarG != null && n.carbsG != null && n.sugarG > n.carbsG + 0.5) problems.push("Sugar exceeds total carbohydrate");
  return problems;
}

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

export type IngredientRole = "main" | "fat" | "sugar" | "water" | "spice";

export interface RecipeIngredientInput {
  name: string;
  /** Raw (as-weighed) grams. */
  grams: number;
  per100g: Partial<Nutrients> | null;
  role?: IngredientRole;
}

export interface RecipeNutrition {
  rawWeightG: number;
  cookedWeightG: number;
  /** cooked / raw. < 1 means water evaporated, > 1 means water absorbed. */
  yieldFactor: number;
  servings: number;
  servingWeightG: number;
  total: NutrientTotals;
  per100g: Record<NutrientKey, number>;
  perServing: Record<NutrientKey, number>;
  /** kcal contributed by added fats (oil, ghee, butter) and added sugars. */
  addedFatKcal: number;
  addedSugarKcal: number;
  /** Ingredients that could not be matched to a nutrition record. */
  unmatched: string[];
  /** 0–1 share of raw weight backed by a nutrition record (water counts as known). */
  coverage: number;
}

/**
 * Computes recipe nutrition from its ingredients.
 *
 * Cooking does not create or destroy energy/macros (we ignore small vitamin losses), it only changes
 * water content. So total nutrients = Σ ingredient nutrients, and the density of the *cooked* dish is
 * total ÷ cooked weight. If the cooked weight is unknown we assume no net water change
 * (cooked = raw), which is stated in the UI as an assumption.
 */
export function computeRecipeNutrition(
  ingredients: RecipeIngredientInput[],
  opts: { servings: number; cookedWeightG?: number | null },
): RecipeNutrition {
  if (!(opts.servings > 0)) throw new RangeError("servings must be > 0");
  const total = zeroTotals();
  let rawWeightG = 0;
  let knownWeight = 0;
  let addedFatKcal = 0;
  let addedSugarKcal = 0;
  const unmatched: string[] = [];

  for (const ing of ingredients) {
    if (!(ing.grams >= 0)) throw new RangeError(`Invalid grams for ${ing.name}`);
    rawWeightG += ing.grams;
    if (ing.role === "water") {
      knownWeight += ing.grams;
      continue; // plain water: 0 kcal, but contributes weight
    }
    if (!ing.per100g) {
      unmatched.push(ing.name);
      continue;
    }
    knownWeight += ing.grams;
    const n = scaleNutrients(ing.per100g, ing.grams);
    addInto(total, n);
    if (ing.role === "fat") addedFatKcal += n.kcal ?? 0;
    if (ing.role === "sugar") addedSugarKcal += n.kcal ?? 0;
  }

  const cookedWeightG = opts.cookedWeightG && opts.cookedWeightG > 0 ? opts.cookedWeightG : rawWeightG;
  const per100g = {} as Record<NutrientKey, number>;
  const perServing = {} as Record<NutrientKey, number>;
  for (const k of CORE_NUTRIENTS) {
    per100g[k] = cookedWeightG > 0 ? (total[k] / cookedWeightG) * 100 : 0;
    perServing[k] = total[k] / opts.servings;
  }
  return {
    rawWeightG,
    cookedWeightG,
    yieldFactor: rawWeightG > 0 ? cookedWeightG / rawWeightG : 1,
    servings: opts.servings,
    servingWeightG: cookedWeightG / opts.servings,
    total,
    per100g,
    perServing,
    addedFatKcal,
    addedSugarKcal,
    unmatched,
    coverage: rawWeightG > 0 ? knownWeight / rawWeightG : 0,
  };
}

/** Scales every ingredient quantity to a new number of servings (cooked weight scales too). */
export function scaleRecipe<T extends { grams: number }>(
  ingredients: T[],
  fromServings: number,
  toServings: number,
  cookedWeightG?: number | null,
): { ingredients: T[]; cookedWeightG: number | null } {
  if (!(fromServings > 0) || !(toServings > 0)) throw new RangeError("servings must be > 0");
  const f = toServings / fromServings;
  return {
    ingredients: ingredients.map((i) => ({ ...i, grams: i.grams * f })),
    cookedWeightG: cookedWeightG ? cookedWeightG * f : null,
  };
}

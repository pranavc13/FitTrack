import { and, eq, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { analyzeMealPhotos, extractLabel, type LabelScan } from "@/lib/ai/vision";
import { AI_MODEL, type ImageInput } from "@/lib/ai/client";
import { CORE_NUTRIENTS, round, scaleNutrients, validatePer100g, type Nutrients } from "@/lib/nutrition/engine";
import { ApiError, notFound } from "@/lib/errors";
import { normalizeQuery, per100, searchFoods, type FoodSearchResult } from "./foods";

const QUALITY_WEIGHT: Record<string, number> = { verified: 1, calculated: 0.85, crowdsourced: 0.75, user: 0.7, estimated: 0.6, ocr: 0.5 };

/** Nutrition-data confidence: how well the matched record represents the detected food. */
function nutritionConfidence(match: FoodSearchResult, detectedName: string) {
  const a = new Set(normalizeQuery(detectedName).split(" "));
  const b = new Set(normalizeQuery(match.name + " " + (match.matchedSynonym ?? "")).split(" "));
  const overlap = [...a].filter((w) => b.has(w)).length / Math.max(1, a.size);
  return round(Math.min(1, (0.4 + 0.6 * overlap) * (QUALITY_WEIGHT[match.dataQuality] ?? 0.6) * Math.min(1, match.confidence + 0.1)), 2);
}

export async function scanMeal(
  db: Db,
  userId: string,
  input: { imageKeys: string[]; images: ImageInput[]; mode: "quick" | "detailed"; plateDiameterCm?: number | null; referenceObject?: string | null; note?: string | null },
) {
  const [scan] = await db
    .insert(s.foodScans)
    .values({ userId, kind: "meal", mode: input.mode, imageKeys: input.imageKeys, status: "processing", model: AI_MODEL, context: { plateDiameterCm: input.plateDiameterCm, referenceObject: input.referenceObject, note: input.note } })
    .returning();
  try {
    const { data, model } = await analyzeMealPhotos(input.images, { mode: input.mode, plateDiameterCm: input.plateDiameterCm, referenceObject: input.referenceObject, userNote: input.note });
    const items = [];
    for (const it of data.is_food ? data.items : []) {
      // Pool the results of every search term, then pick the one that fits what the photo shows.
      const terms = [it.name, ...it.search_terms].slice(0, 4);
      const pooled = new Map<number, FoodSearchResult>();
      for (const term of terms) for (const c of await searchFoods(db, userId, term, { limit: 6 })) if (!pooled.has(c.id)) pooled.set(c.id, c);
      const ranked = rankScanCandidates([...pooled.values()], { terms, isComposite: it.is_composite_dish, expectedKcal100: it.expected_kcal_per_100g });
      const match = ranked[0] ?? null;
      const grams = Math.max(1, Math.round(it.estimated_grams));
      const nConf = match ? round(nutritionConfidence(match, it.name) * (kcalFits(match.kcal, it.expected_kcal_per_100g) ? 1 : 0.5), 2) : 0;
      const [row] = await db
        .insert(s.foodScanItems)
        .values({
          scanId: scan!.id,
          detectedName: it.name,
          matchedFoodId: match?.id ?? null,
          estimatedGrams: grams,
          gramsLow: Math.round(it.grams_low),
          gramsHigh: Math.round(it.grams_high),
          recognitionConfidence: clamp01(it.recognition_confidence),
          quantityConfidence: clamp01(it.quantity_confidence),
          nutritionConfidence: nConf,
          notes: it.reasoning,
        })
        .returning();
      items.push({
        id: row!.id,
        detectedName: it.name,
        cookingStyle: it.cooking_style,
        count: it.count,
        householdMeasure: it.household_measure,
        container: it.container,
        pieceGrams: it.count > 0 ? Math.round(grams / it.count) : null,
        visibleIngredients: it.visible_ingredients,
        estimatedGrams: grams,
        gramsLow: Math.round(it.grams_low),
        gramsHigh: Math.round(it.grams_high),
        recognitionConfidence: clamp01(it.recognition_confidence),
        quantityConfidence: clamp01(it.quantity_confidence),
        nutritionConfidence: nConf,
        reasoning: it.reasoning,
        match: match ? { ...macros100(match), id: match.id, name: match.name, dataQuality: match.dataQuality, source: match.source } : null,
        alternatives: ranked.slice(1, 5).map((c) => ({ ...macros100(c), id: c.id, name: c.name })),
        nutrition: match ? nutritionFor(match, grams) : null,
      });
    }
    const result = { isFood: data.is_food, plateNotes: data.plate_notes, questions: data.questions, items };
    await db.update(s.foodScans).set({ status: "completed", model, result, updatedAt: new Date() }).where(eq(s.foodScans.id, scan!.id));
    return { scanId: scan!.id, ...result, disclaimer: "Portion weights are visual estimates and can be off by 30% or more. Adjust grams before logging." };
  } catch (e) {
    await db.update(s.foodScans).set({ status: "failed", error: String((e as Error).message ?? e), updatedAt: new Date() }).where(eq(s.foodScans.id, scan!.id));
    throw e;
  }
}

const ALCOHOL = /\b(rum|vodka|whiske?y|brandy|gin|beer|wine|liqueur|cocktail|martini|margarita|sangria|tequila)\b/i;

/** Whether a record's energy is plausible for what the model expects (±50 %, at least ±25 kcal/100 g). */
export function kcalFits(kcal: number | null, expected: number | null | undefined) {
  if (kcal == null || expected == null || !Number.isFinite(expected) || expected < 0) return true;
  return Math.abs(kcal - expected) <= Math.max(25, expected * 0.5);
}

/**
 * Orders food-search candidates for a photo-detected item: drop alcoholic mixes the model didn't see,
 * then records whose energy is implausible; among the rest prefer names that match the search terms
 * (all of a term's words present, few unrelated words), dishes for composite foods and prepared states.
 * Ties keep search-relevance order.
 */
export function rankScanCandidates<T extends Pick<FoodSearchResult, "name" | "kcal" | "foodType" | "state">>(
  candidates: T[],
  ctx: { terms: string[]; isComposite: boolean; expectedKcal100?: number | null },
): T[] {
  const sawAlcohol = ctx.terms.some((t) => ALCOHOL.test(t));
  const words = (t: string) => new Set(normalizeQuery(t).split(" ").filter((w) => w.length > 1));
  const termWords = ctx.terms.map(words);
  const allTermWords = new Set(termWords.flatMap((w) => [...w]));
  const overlap = (name: string) => {
    const n = words(name);
    const recall = Math.max(0, ...termWords.map((tw) => (tw.size ? [...tw].filter((w) => n.has(w)).length / tw.size : 0)));
    const precision = n.size ? [...n].filter((w) => allTermWords.has(w)).length / n.size : 0;
    return recall + precision;
  };
  const score = (c: T) =>
    (!sawAlcohol && ALCOHOL.test(c.name) ? -10 : 0) +
    (kcalFits(c.kcal, ctx.expectedKcal100) ? 0 : -5) +
    overlap(c.name) +
    (ctx.isComposite ? Number(c.foodType === "dish" || c.foodType === "restaurant") : 0) +
    Number(c.state !== "raw") * 0.5;
  return candidates.map((c, i) => ({ c, i, s: score(c) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.c);
}

const macros100 = (f: FoodSearchResult) => ({ kcal100: f.kcal, protein100: f.proteinG, carbs100: f.carbsG, fat100: f.fatG, fibre100: f.fibreG });

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

function nutritionFor(f: { kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fibreG: number | null }, grams: number) {
  const n = scaleNutrients({ kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, fibreG: f.fibreG }, grams);
  return { kcal: round(n.kcal ?? 0, 0), proteinG: round(n.proteinG ?? 0, 1), carbsG: round(n.carbsG ?? 0, 1), fatG: round(n.fatG ?? 0, 1), fibreG: n.fibreG == null ? null : round(n.fibreG, 1) };
}

/* ------------------------------------------------------------------ */
/* Packaged foods                                                      */
/* ------------------------------------------------------------------ */

export const ALLERGEN_TERMS: Record<string, RegExp> = {
  milk: /\bmilk|whey|casein|lactose|butter|cream|cheese|paneer|ghee|curd/i,
  gluten: /wheat|maida|atta|barley|rye|oats|semolina|sooji|gluten/i,
  soy: /\bsoy|soya|lecithin \(soy/i,
  peanut: /peanut|groundnut/i,
  tree_nuts: /almond|cashew|walnut|pistachio|hazelnut|badam|kaju/i,
  sesame: /sesame|\btil\b/i,
  egg: /\begg/i,
  fish_shellfish: /\bfish|prawn|shrimp|crab|anchov/i,
  mustard: /mustard/i,
};

/** Front-of-pack style indicators computed from per-100 g values (thresholds: UK FSA "high" levels). */
export function labelIndicators(per100: Partial<Record<string, number | null>>, isLiquid: boolean, ingredients: string | null, declared: string[]) {
  const warnings: { key: string; level: "high" | "info"; text: string }[] = [];
  const sugar = per100.sugarG ?? null;
  const satFat = per100.satFatG ?? null;
  const sodium = per100.sodiumMg ?? null;
  const fat = per100.fatG ?? null;
  if (sugar != null && sugar > (isLiquid ? 11.25 : 22.5)) warnings.push({ key: "sugar", level: "high", text: `High sugar: ${sugar} g per 100 ${isLiquid ? "ml" : "g"}` });
  if (satFat != null && satFat > (isLiquid ? 2.5 : 5)) warnings.push({ key: "sat_fat", level: "high", text: `High saturated fat: ${satFat} g per 100 ${isLiquid ? "ml" : "g"}` });
  if (fat != null && fat > (isLiquid ? 8.75 : 17.5)) warnings.push({ key: "fat", level: "high", text: `High fat: ${fat} g per 100 ${isLiquid ? "ml" : "g"}` });
  if (sodium != null && sodium > (isLiquid ? 300 : 600)) warnings.push({ key: "sodium", level: "high", text: `High sodium: ${sodium} mg per 100 ${isLiquid ? "ml" : "g"}` });
  if (per100.addedSugarG) warnings.push({ key: "added_sugar", level: "info", text: `Contains ${per100.addedSugarG} g added sugar per 100 ${isLiquid ? "ml" : "g"}` });
  if (per100.transFatG && per100.transFatG > 0.2) warnings.push({ key: "trans_fat", level: "high", text: `Contains trans fat (${per100.transFatG} g/100)` });
  if (ingredients && /hydrogenated|vanaspati|interesterified/i.test(ingredients)) warnings.push({ key: "hydrogenated", level: "info", text: "Ingredient list mentions hydrogenated/interesterified fat" });
  const detected = ingredients ? Object.entries(ALLERGEN_TERMS).filter(([, re]) => re.test(ingredients)).map(([k]) => k) : [];
  return {
    warnings,
    allergens: { declared, detectedInIngredients: detected },
    note: "Indicators are informational, based on the printed values; they are not a safety assessment. Always read the pack if you have an allergy.",
  };
}

function labelToPer100(label: LabelScan): { per100: Partial<Nutrients> & { addedSugarG?: number | null; transFatG?: number | null }; basis: "per_100" | "per_serving_converted" } {
  const p = label.per_100;
  const hasPer100 = p.energy_kcal != null;
  const src = hasPer100 ? p : label.per_serving;
  const factor = hasPer100 ? 1 : label.serving_size_g ? 100 / label.serving_size_g : null;
  if (!factor) return { per100: {}, basis: "per_100" };
  const f = (v: number | null) => (v == null ? null : round(v * factor, 2));
  return {
    per100: {
      kcal: f(src.energy_kcal),
      proteinG: f(src.protein_g),
      carbsG: f(src.carbohydrate_g),
      sugarG: f(src.total_sugars_g),
      fatG: f(src.total_fat_g),
      satFatG: f(src.saturated_fat_g),
      fibreG: f(src.fibre_g),
      sodiumMg: f(src.sodium_mg),
      addedSugarG: f(src.added_sugars_g),
      transFatG: f(src.trans_fat_g),
    },
    basis: hasPer100 ? "per_100" : "per_serving_converted",
  };
}

export async function scanLabel(db: Db, userId: string, input: { imageKeys: string[]; images: ImageInput[] }) {
  const [scan] = await db.insert(s.foodScans).values({ userId, kind: "label", imageKeys: input.imageKeys, status: "processing", model: AI_MODEL }).returning();
  try {
    const { data, model } = await extractLabel(input.images);
    const { per100, basis } = labelToPer100(data);
    const result = {
      isLabel: data.is_label,
      productName: data.product_name,
      brand: data.brand,
      barcode: data.barcode?.replace(/\D/g, "") || null,
      servingSizeG: data.serving_size_g,
      servingLabel: data.serving_label,
      isLiquid: data.is_liquid,
      per100,
      basis,
      ingredientsText: data.ingredients_text,
      allergens: data.allergens,
      unreadableFields: data.unreadable_fields,
      readConfidence: clamp01(data.read_confidence),
      validation: validatePer100g(per100),
      indicators: labelIndicators(per100 as Record<string, number | null>, data.is_liquid, data.ingredients_text, data.allergens),
      verification: "ocr_estimate" as const,
    };
    await db.update(s.foodScans).set({ status: "completed", model, result, updatedAt: new Date() }).where(eq(s.foodScans.id, scan!.id));
    return { scanId: scan!.id, ...result };
  } catch (e) {
    await db.update(s.foodScans).set({ status: "failed", error: String((e as Error).message ?? e), updatedAt: new Date() }).where(eq(s.foodScans.id, scan!.id));
    throw e;
  }
}

export interface SaveProductInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  servingSizeG?: number | null;
  servingLabel?: string | null;
  isLiquid?: boolean;
  per100: Partial<Nutrients>;
  addedSugarG?: number | null;
  transFatG?: number | null;
  ingredientsText?: string | null;
  allergens?: string[];
  scanId?: number | null;
  imageKey?: string | null;
  /** True when the user reviewed and corrected the OCR values. */
  userConfirmed: boolean;
}

export async function saveProduct(db: Db, userId: string, input: SaveProductInput) {
  const problems = validatePer100g(input.per100);
  if (problems.length) throw new ApiError(400, "Label values look inconsistent — please check them", problems);
  if (input.per100.kcal == null) throw new ApiError(400, "Energy (kcal) is required");
  const quality = input.userConfirmed ? "user" : "ocr";
  const [food] = await db
    .insert(s.foods)
    .values({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      ownerUserId: userId,
      foodType: "packaged",
      state: "packaged",
      ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, input.per100[k] ?? null])),
      densityGPerMl: input.isLiquid ? 1 : null,
      dataQuality: quality,
      confidence: input.userConfirmed ? 0.85 : 0.5,
      searchText: normalizeQuery(`${input.name} ${input.brand ?? ""}`),
      popularity: 40,
    })
    .returning();
  if (input.servingSizeG) {
    await db.insert(s.foodServings).values({ foodId: food!.id, label: input.servingLabel || `1 serving (${input.servingSizeG} ${input.isLiquid ? "ml" : "g"})`, unit: "serving", amount: 1, grams: input.servingSizeG, isDefault: true, source: "label" });
  }
  const [product] = await db
    .insert(s.packagedProducts)
    .values({
      foodId: food!.id,
      name: input.name.trim(),
      brand: input.brand ?? null,
      servingSizeG: input.servingSizeG ?? null,
      servingLabel: input.servingLabel ?? null,
      isLiquid: input.isLiquid ?? false,
      ingredientsText: input.ingredientsText ?? null,
      allergens: input.allergens ?? [],
      source: input.scanId ? "ocr" : "manual",
      verification: input.userConfirmed ? "user_confirmed" : "ocr_estimate",
      createdByUserId: userId,
      isPrivate: true,
      imageKey: input.imageKey ?? null,
    })
    .returning();
  if (input.barcode && /^\d{8,14}$/.test(input.barcode)) await db.insert(s.productBarcodes).values({ barcode: input.barcode, productId: product!.id }).onConflictDoNothing();
  await db.insert(s.nutritionLabels).values({
    productId: product!.id,
    scanId: input.scanId ?? null,
    userId,
    basis: input.isLiquid ? "per_100ml" : "per_100g",
    values: { ...input.per100, addedSugarG: input.addedSugarG ?? null, transFatG: input.transFatG ?? null } as Record<string, number | null>,
    addedSugarG: input.addedSugarG ?? null,
    transFatG: input.transFatG ?? null,
    userConfirmed: input.userConfirmed,
  });
  return { product: product!, food: food! };
}

/* ---- Barcode lookup: local catalogue first, then Open Food Facts (ODbL) ---- */

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  ingredients_text?: string;
  allergens_tags?: string[];
  nutriments?: Record<string, number | string>;
  quantity?: string;
}

export async function lookupBarcode(db: Db, userId: string, barcodeRaw: string) {
  const barcode = barcodeRaw.replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(barcode)) throw new ApiError(400, "Barcodes are 8–14 digits");
  const local = await db
    .select({ p: s.packagedProducts, f: s.foods })
    .from(s.productBarcodes)
    .innerJoin(s.packagedProducts, eq(s.packagedProducts.id, s.productBarcodes.productId))
    .innerJoin(s.foods, eq(s.foods.id, s.packagedProducts.foodId))
    .where(and(eq(s.productBarcodes.barcode, barcode), or(eq(s.packagedProducts.isPrivate, false), eq(s.packagedProducts.createdByUserId, userId))));
  if (local[0]) return { found: true, source: local[0].p.source, product: productView(local[0].p, local[0].f) };

  let off: OffProduct | null = null;
  try {
    // A 12-digit UPC-A is stored as a 13-digit EAN with a leading 0 (and vice versa).
    const variants = [barcode, barcode.length === 12 ? `0${barcode}` : null, barcode.length === 13 && barcode.startsWith("0") ? barcode.slice(1) : null].filter(Boolean);
    for (const code of variants) {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,serving_size,serving_quantity,ingredients_text,allergens_tags,nutriments,quantity`, {
        headers: { "User-Agent": "FitTrackAI/1.0 (personal fitness app)" },
        signal: AbortSignal.timeout(12000),
      });
      const json = res.ok ? ((await res.json()) as { status: number; product?: OffProduct }) : null;
      if (json?.status === 1 && json.product) {
        off = json.product;
        break;
      }
    }
  } catch {
    return { found: false, barcode, offline: true, message: "Couldn't reach the Open Food Facts product database (check your internet). Photograph the nutrition label instead — it's saved with this barcode for next time." };
  }
  const per100 = off?.nutriments ? offPer100(off.nutriments) : null;
  if (!off || per100?.values.kcal == null) {
    return {
      found: false,
      barcode,
      message: off
        ? `“${off.product_name || barcode}” is in Open Food Facts but has no nutrition values yet. Photograph the nutrition label (or enter it) — it'll be saved with this barcode, so next time it's found instantly.`
        : `Barcode ${barcode} isn't in Open Food Facts yet — common for Indian products. Photograph the nutrition label (or enter it) — it'll be saved with this barcode, so next time it's found instantly.`,
      productName: off?.product_name ?? null,
      brand: off?.brands?.split(",")[0]?.trim() ?? null,
    };
  }
  const problems = validatePer100g(per100.values);
  const isLiquid = /ml|\bl\b|litre|liter/i.test(off.quantity ?? "") || /ml/i.test(off.serving_size ?? "");
  const servingG = Number(off.serving_quantity) || null;
  const allergens = (off.allergens_tags ?? []).map((t) => t.replace(/^en:/, ""));
  // Crowd-sourced data is stored as a shared catalogue entry with provenance.
  const [source] = await db.select().from(s.foodSources).where(eq(s.foodSources.code, "open_food_facts"));
  const sourceId =
    source?.id ??
    (
      await db
        .insert(s.foodSources)
        .values({ code: "open_food_facts", name: "Open Food Facts", url: "https://world.openfoodfacts.org", license: "Open Database License (ODbL); content CC BY-SA", attribution: "Data from Open Food Facts contributors" })
        .returning()
    )[0]!.id;
  const [food] = await db
    .insert(s.foods)
    .values({
      name: off.product_name || `Product ${barcode}`,
      brand: off.brands?.split(",")[0]?.trim() || null,
      sourceId,
      sourceRef: barcode,
      foodType: "packaged",
      state: "packaged",
      ...Object.fromEntries(CORE_NUTRIENTS.map((k) => [k, per100.values[k] ?? null])),
      densityGPerMl: isLiquid ? 1 : null,
      dataQuality: "crowdsourced",
      confidence: problems.length ? 0.5 : 0.75,
      searchText: normalizeQuery(`${off.product_name ?? ""} ${off.brands ?? ""}`),
      popularity: 30,
    })
    .onConflictDoUpdate({ target: [s.foods.sourceId, s.foods.sourceRef], set: { updatedAt: new Date() } })
    .returning();
  if (servingG) await db.insert(s.foodServings).values({ foodId: food!.id, label: off.serving_size || `1 serving (${servingG} g)`, unit: "serving", amount: 1, grams: servingG, isDefault: true, source: "openfoodfacts" });
  const [product] = await db
    .insert(s.packagedProducts)
    .values({ foodId: food!.id, name: food!.name, brand: food!.brand, servingSizeG: servingG, servingLabel: off.serving_size ?? null, isLiquid, ingredientsText: off.ingredients_text ?? null, allergens, source: "openfoodfacts", verification: "crowdsourced", isPrivate: false })
    .returning();
  await db.insert(s.productBarcodes).values({ barcode, productId: product!.id }).onConflictDoNothing();
  return { found: true, source: "openfoodfacts", product: productView(product!, food!), validation: [...problems, ...per100.notes] };
}

/**
 * Open Food Facts nutriments → per-100 g values. Falls back to kJ (÷ 4.184) when kcal is missing, and to
 * "as prepared" values when the pack only lists those (e.g. instant noodles), with a note saying so.
 */
export function offPer100(n: Record<string, number | string>) {
  const num = (k: string) => (n[k] == null || n[k] === "" || !Number.isFinite(Number(n[k])) ? null : Number(n[k]));
  const hasAsSold = num("energy-kcal_100g") != null || num("energy-kj_100g") != null || num("energy_100g") != null;
  const suffix = hasAsSold ? "_100g" : "_prepared_100g";
  const v = (k: string) => num(`${k}${suffix}`);
  const kj = v("energy-kj") ?? v("energy");
  const sodium = v("sodium") ?? (v("salt") != null ? v("salt")! / 2.5 : null);
  const values: Partial<Nutrients> = {
    kcal: v("energy-kcal") ?? (kj != null ? round(kj / 4.184, 0) : null),
    proteinG: v("proteins"),
    carbsG: v("carbohydrates"),
    sugarG: v("sugars"),
    fatG: v("fat"),
    satFatG: v("saturated-fat"),
    fibreG: v("fiber"),
    sodiumMg: sodium != null ? round(sodium * 1000, 0) : null,
  };
  const notes = [
    ...(v("energy-kcal") == null && kj != null ? ["Calories converted from kJ (÷ 4.184)."] : []),
    ...(hasAsSold ? [] : ["Only “as prepared” values are listed for this product — they're per 100 g of the prepared food."]),
  ];
  return { values, notes };
}

function productView(p: typeof s.packagedProducts.$inferSelect, f: typeof s.foods.$inferSelect) {
  const n = per100(f);
  return {
    productId: p.id,
    foodId: f.id,
    name: p.name,
    brand: p.brand,
    servingSizeG: p.servingSizeG,
    servingLabel: p.servingLabel,
    isLiquid: p.isLiquid,
    ingredientsText: p.ingredientsText,
    allergens: p.allergens,
    verification: p.verification,
    dataQuality: f.dataQuality,
    per100: n,
    indicators: labelIndicators(n as unknown as Record<string, number | null>, p.isLiquid, p.ingredientsText, p.allergens),
  };
}

export async function getProduct(db: Db, userId: string, productId: number) {
  const [row] = await db
    .select({ p: s.packagedProducts, f: s.foods })
    .from(s.packagedProducts)
    .innerJoin(s.foods, eq(s.foods.id, s.packagedProducts.foodId))
    .where(and(eq(s.packagedProducts.id, productId), or(eq(s.packagedProducts.isPrivate, false), eq(s.packagedProducts.createdByUserId, userId))));
  if (!row) throw notFound("Product");
  return productView(row.p, row.f);
}

export async function myProducts(db: Db, userId: string) {
  const rows = await db
    .select({ p: s.packagedProducts, f: s.foods })
    .from(s.packagedProducts)
    .innerJoin(s.foods, eq(s.foods.id, s.packagedProducts.foodId))
    .where(
      or(
        eq(s.packagedProducts.createdByUserId, userId),
        and(eq(s.packagedProducts.isPrivate, false), sql`${s.packagedProducts.foodId} IN (SELECT food_id FROM meal_entries WHERE user_id = ${userId})`),
      ),
    )
    .limit(100);
  return rows.map((r) => productView(r.p, r.f));
}

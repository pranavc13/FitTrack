import { z } from "zod/v4";
import { imageBlocks, structuredCall, type ImageInput } from "./client";

/* ------------------------------------------------------------------ */
/* Meal photo recognition                                              */
/* ------------------------------------------------------------------ */

export const MealScanSchema = z.object({
  is_food: z.boolean().describe("False if the image does not show food or drink"),
  plate_notes: z.string().describe("Short description of the plate/scene, container sizes and any reference object used for scale"),
  items: z.array(
    z.object({
      name: z.string().describe("Specific dish or food name as commonly known in India, e.g. 'dal tadka', 'jeera rice', 'phulka roti'"),
      search_terms: z.array(z.string()).describe("2-4 alternative names/spellings to look up in a food database, most specific first"),
      is_composite_dish: z.boolean().describe("True for prepared dishes (curries, biryani), false for single ingredients"),
      visible_ingredients: z.array(z.string()).describe("Ingredients you can actually see; empty if unsure"),
      cooking_style: z.string().describe("e.g. 'home-style', 'restaurant (oily/creamy)', 'deep-fried', 'steamed', 'unknown'"),
      count: z.number().describe("Number of pieces if countable (rotis, idlis, eggs), else 0"),
      estimated_grams: z.number().describe("Best estimate of the edible portion weight in grams"),
      grams_low: z.number().describe("Plausible lower bound in grams"),
      grams_high: z.number().describe("Plausible upper bound in grams"),
      recognition_confidence: z.number().describe("0-1 confidence that the food is identified correctly"),
      quantity_confidence: z.number().describe("0-1 confidence in the gram estimate"),
      reasoning: z.string().describe("One sentence: what visual cues set the portion estimate"),
    }),
  ),
  questions: z.array(z.string()).describe("Questions to ask the user where uncertainty matters most (e.g. 'Was this cooked with ghee or oil?')"),
});
export type MealScan = z.infer<typeof MealScanSchema>;

const MEAL_SYSTEM = `You are a food-recognition assistant for an Indian fitness app. Identify each distinct food or drink visible in the photo(s) and estimate its edible portion weight in grams.

Rules:
- List each component separately (e.g. dal, rice, roti, sabzi, salad, raita, papad on a thali are separate items).
- Use names common in India (Hindi/regional names in parentheses where helpful).
- You cannot measure mass from a photo. Give a best estimate plus a realistic low/high range, and set quantity_confidence honestly (usually 0.3-0.7). Use the plate/bowl size, reference objects (credit card 8.56 cm, ₹10 coin 2.7 cm, hand, spoon), container depth and multiple angles if given.
- Typical references: one phulka ~30-40 g, a katori holds ~150 ml, a full dinner plate of rice ~200-250 g cooked.
- Do NOT estimate calories or nutrients — the app computes them from its database.
- If something is ambiguous (paneer vs tofu, ghee vs oil, sugar in tea), say so in questions.
- If the image shows no food, set is_food=false and return no items.`;

export async function analyzeMealPhotos(images: ImageInput[], ctx: { mode: "quick" | "detailed"; plateDiameterCm?: number | null; referenceObject?: string | null; userNote?: string | null; cuisineHint?: string | null }) {
  const hints = [
    ctx.plateDiameterCm ? `The plate is about ${ctx.plateDiameterCm} cm in diameter.` : null,
    ctx.referenceObject ? `Reference object in frame: ${ctx.referenceObject}.` : null,
    ctx.cuisineHint ? `Likely cuisine: ${ctx.cuisineHint}.` : null,
    ctx.userNote ? `User note: ${ctx.userNote}` : null,
    images.length > 1 ? `${images.length} photos of the same meal from different angles are provided.` : null,
  ].filter(Boolean);
  return structuredCall({
    system: MEAL_SYSTEM,
    schema: MealScanSchema,
    effort: ctx.mode === "detailed" ? "high" : "low",
    content: [...imageBlocks(images), { type: "text", text: `Analyse this meal.${hints.length ? "\n" + hints.join("\n") : ""}` }],
  });
}

/* ------------------------------------------------------------------ */
/* Nutrition label OCR                                                 */
/* ------------------------------------------------------------------ */

const nullableNum = z.number().nullable();

export const LabelSchema = z.object({
  is_label: z.boolean().describe("True if a nutrition facts table or ingredient list is legible"),
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  barcode: z.string().nullable().describe("Digits printed under the barcode, if legible"),
  serving_size_g: nullableNum.describe("Serving size in grams (or ml for liquids)"),
  serving_label: z.string().nullable().describe("Serving description as printed, e.g. '1 pack (30 g)'"),
  is_liquid: z.boolean(),
  per_100: z.object({
    energy_kcal: nullableNum,
    protein_g: nullableNum,
    carbohydrate_g: nullableNum,
    total_sugars_g: nullableNum,
    added_sugars_g: nullableNum,
    total_fat_g: nullableNum,
    saturated_fat_g: nullableNum,
    trans_fat_g: nullableNum,
    fibre_g: nullableNum,
    sodium_mg: nullableNum,
  }).describe("Values per 100 g/100 ml exactly as printed. If only per-serving values are printed, leave these null and fill per_serving."),
  per_serving: z.object({
    energy_kcal: nullableNum,
    protein_g: nullableNum,
    carbohydrate_g: nullableNum,
    total_sugars_g: nullableNum,
    added_sugars_g: nullableNum,
    total_fat_g: nullableNum,
    saturated_fat_g: nullableNum,
    trans_fat_g: nullableNum,
    fibre_g: nullableNum,
    sodium_mg: nullableNum,
  }),
  ingredients_text: z.string().nullable(),
  allergens: z.array(z.string()).describe("Allergens declared on the pack (e.g. milk, wheat/gluten, soy, peanut, tree nuts, sesame, egg)"),
  unreadable_fields: z.array(z.string()).describe("Fields that were blurry/cut off and need the user to check"),
  read_confidence: z.number().describe("0-1 overall legibility"),
});
export type LabelScan = z.infer<typeof LabelSchema>;

const LABEL_SYSTEM = `You transcribe packaged-food nutrition labels (Indian FSSAI and international formats). Read values EXACTLY as printed — never estimate or fill in values that are not visible; use null instead and list them in unreadable_fields.
- Convert energy given only in kJ to kcal (÷4.184). If sodium is given as salt, sodium_mg = salt_g × 400.
- Keep per-100 g/ml and per-serving values separate.
- Transcribe the ingredient list and declared allergens ("Contains: ..."). Do not infer allergens that are not declared.`;

export async function extractLabel(images: ImageInput[]) {
  return structuredCall({
    system: LABEL_SYSTEM,
    schema: LabelSchema,
    effort: "medium",
    content: [...imageBlocks(images), { type: "text", text: "Transcribe this product's nutrition label, ingredients and allergens." }],
  });
}

/* ------------------------------------------------------------------ */
/* Recipe text parsing                                                 */
/* ------------------------------------------------------------------ */

export const RecipeParseSchema = z.object({
  dish_name: z.string(),
  servings: z.number().describe("Number of servings the user made; 1 if not stated"),
  cooking_method: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string().describe("Ingredient in simple English (with Hindi name in parentheses if the user used it)"),
      quantity_as_stated: z.string().nullable().describe("Quantity exactly as the user wrote it, null if not given"),
      grams: z.number().describe("Raw weight in grams (convert units: 1 tsp oil ≈ 4.5 g, 1 tbsp ≈ 13.5 g, 1 medium onion ≈ 110 g, 1 medium tomato ≈ 100 g, 1 cup cooked rice ≈ 160 g, 1 cup raw rice ≈ 185 g, 1 cup atta ≈ 120 g)"),
      quantity_was_given: z.boolean().describe("False if you had to assume the quantity"),
      assumption: z.string().nullable().describe("If quantity was assumed or converted, explain briefly"),
      is_cooking_fat: z.boolean(),
    }),
  ),
  questions: z.array(z.string()).describe("Clarifying questions about uncertain quantities (oil, sugar, cream) that change nutrition most"),
});
export type RecipeParse = z.infer<typeof RecipeParseSchema>;

export async function parseRecipeText(text: string) {
  return structuredCall({
    system: `You convert a user's free-text description of a home-cooked Indian dish into a structured ingredient list with raw gram weights. Keep every ingredient the user mentions. Add commonly-used ingredients they omitted only if essential (e.g. salt, oil for tempering) and mark them quantity_was_given=false with an assumption. Do not compute calories.`,
    schema: RecipeParseSchema,
    effort: "low",
    content: [{ type: "text", text }],
  });
}

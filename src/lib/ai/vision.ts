import { z } from "zod/v4";
import { imageParts, structuredCall, type ImageInput } from "./client";

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
      household_measure: z.string().describe("The portion in Indian household terms, e.g. '1 katori (~150 ml)', '2 medium phulkas', '1 cup', '3/4 dinner plate', '1 medium piece'"),
      container: z.string().describe("What the food is served in and how full, e.g. 'steel katori ~8 cm, 3/4 full', 'flat on plate', 'glass ~250 ml, full'"),
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
- You cannot weigh food from a photo, so estimate methodically:
  1. Establish scale: the plate/thali (standard dinner plate 25–27 cm, quarter plate 18–20 cm, steel thali 28–32 cm), a steel katori (7.5–9 cm across, holds ~150 ml when full), a spoon (~15 cm), a hand, a ₹10 coin (2.7 cm) or credit card (8.56 cm).
  2. Estimate the volume the food occupies (container size × how full it is; heap height for rice/poha).
  3. Convert with density: dal/curry/sabzi gravy ≈ 1 g/ml; cooked rice ≈ 0.75 g/ml loosely heaped (1 cup ≈ 160 g); raita/curd ≈ 1 g/ml; dry sabzi ≈ 0.6 g/ml.
  4. For countable items use count × typical piece weight.
- Typical piece weights: phulka 30–35 g, tawa roti 40–45 g, plain paratha 70–90 g, aloo paratha 110–140 g, puri 25–30 g, naan 90–120 g, idli 40–50 g, plain dosa 80–110 g, masala dosa 160–220 g, vada 40–50 g, samosa 60–90 g, boiled egg 50 g, gulab jamun 40–50 g, chicken leg piece ~120 g with bone (~80 g edible — estimate the edible part), paneer cube ~10–15 g.
- Typical servings: 1 full katori dal/sabzi ≈ 150 g, a restaurant curry bowl ≈ 250–300 g, a full dinner plate of rice ≈ 200–250 g cooked, a glass of lassi/chaas ≈ 250 ml.
- Give a best estimate plus a realistic low/high range, and set quantity_confidence honestly (usually 0.3–0.7; higher only with a clear scale reference or countable pieces).
- Always fill household_measure so the user can sanity-check the grams, and container with the scale cue you used.
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
    parts: [...imageParts(images), { text: `Analyse this meal.${hints.length ? "\n" + hints.join("\n") : ""}` }],
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
    parts: [...imageParts(images), { text: "Transcribe this product's nutrition label, ingredients and allergens." }],
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
    parts: [{ text }],
  });
}

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
      container_kind: z.enum(["katori", "bowl", "glass", "cup", "plate", "pieces", "packaged", "other"]).describe("katori = small steel/ceramic serving bowl; bowl = larger serving bowl; plate = spread directly on the plate/thali; pieces = countable items (rotis, idlis)"),
      container_diameter_cm: z.number().describe("Inner rim diameter of the katori/bowl/glass/cup in cm, measured against the plate or another reference; 0 if not in a vessel"),
      container_depth_cm: z.number().describe("Inner depth of that vessel in cm (steel katori ≈ 3.5–4.5, serving bowl ≈ 5–7, glass ≈ 10–12); 0 if not in a vessel"),
      fill_fraction: z.number().describe("How full the vessel is by height: 0.5 = half, 1 = level with the rim, up to 1.4 if heaped above it; 0 if not in a vessel"),
      density_g_per_ml: z.number().describe("Density of the food as served: dal/curry/kheer/curd/drinks ≈ 1.0, thick gravy/sabzi with pieces ≈ 0.85, dry sabzi ≈ 0.6, loosely heaped cooked rice ≈ 0.75, poha/upma ≈ 0.5"),
      expected_kcal_per_100g: z.number().describe("Rough energy density per 100 g/ml of this exact item as served (e.g. diet cola ≈ 1, regular cola ≈ 42, dal tadka ≈ 100, chana curry ≈ 150, paratha ≈ 300, fried papad ≈ 450)"),
      expected_protein_per_100g: z.number().describe("Typical protein g per 100 g of this item as served"),
      expected_carbs_per_100g: z.number().describe("Typical carbohydrate g per 100 g of this item as served"),
      expected_fat_per_100g: z.number().describe("Typical fat g per 100 g of this item as served"),
      expected_fibre_per_100g: z.number().describe("Typical fibre g per 100 g of this item as served"),
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
  2. For every item in a katori, bowl, glass or cup, measure that vessel against the plate (a katori on a 30 cm thali spans roughly 1/4 of its width) and report container_diameter_cm, container_depth_cm, fill_fraction and density_g_per_ml. The app computes the volume from these, so measure carefully: look at the gap between the food surface and the rim, and whether the surface is level, sunken or heaped.
  3. Estimate the volume the food occupies (container size × how full it is; heap height for rice/poha on the plate).
  4. Convert with density: dal/curry/sabzi gravy ≈ 1 g/ml; cooked rice ≈ 0.75 g/ml loosely heaped (1 cup ≈ 160 g); raita/curd ≈ 1 g/ml; dry sabzi ≈ 0.6 g/ml.
  5. For countable items use count × typical piece weight (container_kind "pieces").
- Typical piece weights: phulka 30–35 g, tawa roti 40–45 g, plain paratha 70–90 g, aloo paratha 110–140 g, puri 25–30 g, naan 90–120 g, idli 40–50 g, plain dosa 80–110 g, masala dosa 160–220 g, vada 40–50 g, samosa 60–90 g, boiled egg 50 g, gulab jamun 40–50 g, chicken leg piece ~120 g with bone (~80 g edible — estimate the edible part), paneer cube ~10–15 g, bhatura 70–90 g, kulcha 80–100 g, thepla 35–45 g, pav 35–40 g, uttapam 120–160 g, medu vada 45–55 g, dhokla piece 25–35 g, jalebi 20–30 g, rasgulla 40–50 g, kachori 50–70 g, momo 25–30 g.
- Typical servings: 1 full katori dal/sabzi ≈ 150 g, a restaurant curry bowl ≈ 250–300 g, a full dinner plate of rice ≈ 200–250 g cooked, a glass of lassi/chaas ≈ 250 ml.
- Give a best estimate plus a realistic low/high range, and set quantity_confidence honestly (usually 0.3–0.7; higher only with a clear scale reference or countable pieces).
- Always fill household_measure so the user can sanity-check the grams, and container with the scale cue you used.
- Nutrients come from the app's database when it has a close match. Your expected_*_per_100g values are used to reject a wrong match (e.g. "rum and diet cola" for a Diet Coke, besan flour for a chana curry) and as a labelled estimate when the database has no close match, so give realistic values for the dish as cooked and served. Diet / zero / sugar-free drinks, black coffee, plain tea and water are ≈ 0–5 kcal per 100 ml.
- search_terms: the dish's common names and spellings first (e.g. "kala chana curry" → "kala chana", "black chickpea curry", "chickpeas cooked"); avoid generic terms that describe a different dish (e.g. "lentil soup" for dal tadka).
- For packaged products, put the variant in the name and search terms (e.g. "Diet Coke" → "diet cola", "cola, diet", "soft drink, cola, diet"); never drop words like diet, zero, light, sugar-free or unsweetened.
- Drinks: estimated_grams is the volume in ml (≈ grams); a can is 300 ml (slim) or 330 ml unless the label says otherwise.
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

export const BarcodePhotoSchema = z.object({
  digits: z.string().nullable().describe("The full EAN/UPC number printed under the barcode bars, digits only; null if not fully legible"),
  product_name: z.string().nullable().describe("Product name if visible on the pack"),
  brand: z.string().nullable(),
});

/** Reads the human-readable digits under a barcode (fallback for browsers without live barcode scanning). */
export async function readBarcodePhoto(images: ImageInput[]) {
  return structuredCall({
    system: "You read product barcodes from photos. Transcribe the digits printed under the EAN-13 / EAN-8 / UPC barcode exactly, including the leading digit printed to the left of the bars. Never guess a digit you cannot read — return null instead.",
    schema: BarcodePhotoSchema,
    effort: "low",
    parts: [...imageParts(images), { text: "Read the barcode number." }],
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

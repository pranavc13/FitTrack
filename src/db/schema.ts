import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const sexEnum = pgEnum("sex", ["male", "female", "unspecified"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const dietEnum = pgEnum("diet_preference", [
  "vegetarian",
  "vegan",
  "eggetarian",
  "non_vegetarian",
  "pescatarian",
  "jain",
]);
export const goalTypeEnum = pgEnum("goal_type", [
  "weight_loss",
  "fat_loss",
  "belly_fat_reduction",
  "muscle_gain",
  "recomposition",
  "visible_abs",
  "strength",
  "endurance",
  "general_fitness",
  "maintenance",
]);
export const experienceEnum = pgEnum("training_experience", ["beginner", "intermediate", "advanced"]);
export const trainingLocationEnum = pgEnum("training_location", ["gym", "home", "both"]);
export const foodStateEnum = pgEnum("food_state", ["raw", "cooked", "prepared", "packaged", "not_applicable"]);
export const foodTypeEnum = pgEnum("food_type", [
  "ingredient",
  "dish",
  "beverage",
  "packaged",
  "restaurant",
  "supplement",
  "custom",
]);
/**
 * Where a nutrient profile came from. "verified" = authoritative composition table or manufacturer
 * label, "calculated" = computed from verified ingredients, "estimated" = model/assumption based,
 * "ocr" = machine-read label awaiting user confirmation, "user" = user-entered.
 */
export const dataQualityEnum = pgEnum("data_quality", ["verified", "calculated", "estimated", "ocr", "user", "crowdsourced"]);
export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
  "pre_workout",
  "post_workout",
  "custom",
]);
export const intensityEnum = pgEnum("intensity", ["light", "moderate", "vigorous"]);
export const recordSourceEnum = pgEnum("record_source", ["manual", "workout", "import", "scan", "recipe", "label", "restaurant", "plan", "offline"]);
export const poseEnum = pgEnum("photo_pose", ["front", "side", "back", "other"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/* ------------------------------------------------------------------ */
/* Users & auth                                                        */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)]);

export const sessions = pgTable("sessions", {
  /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  sex: sexEnum("sex").default("unspecified").notNull(),
  heightCm: real("height_cm"),
  currentWeightKg: real("current_weight_kg"),
  targetWeightKg: real("target_weight_kg"),
  activityLevel: activityLevelEnum("activity_level").default("light").notNull(),
  trainingExperience: experienceEnum("training_experience").default("beginner").notNull(),
  trainingLocation: trainingLocationEnum("training_location").default("both").notNull(),
  equipment: text("equipment").array().default(sql`'{}'::text[]`).notNull(),
  sleepHours: real("sleep_hours"),
  lifestyle: text("lifestyle"),
  dietPreference: dietEnum("diet_preference").default("vegetarian").notNull(),
  allergies: text("allergies").array().default(sql`'{}'::text[]`).notNull(),
  intolerances: text("intolerances").array().default(sql`'{}'::text[]`).notNull(),
  primaryGoal: goalTypeEnum("primary_goal").default("general_fitness").notNull(),
  objectives: text("objectives").array().default(sql`'{}'::text[]`).notNull(),
  workoutDaysPerWeek: smallint("workout_days_per_week").default(3).notNull(),
  workoutMinutes: smallint("workout_minutes").default(45).notNull(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  ...timestamps,
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  units: text("units").default("metric").notNull(),
  waterGlassMl: integer("water_glass_ml").default(250).notNull(),
  stepGoal: integer("step_goal").default(8000).notNull(),
  weeklyMeasurementDay: smallint("weekly_measurement_day").default(0).notNull(),
  foodBudgetWeeklyInr: integer("food_budget_weekly_inr"),
  ...timestamps,
});

/** Calculated (or user-overridden) daily targets. `computed` keeps the inputs used, for transparency. */
export const nutritionTargets = pgTable("nutrition_targets", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  fibreG: integer("fibre_g").notNull(),
  waterMl: integer("water_ml").notNull(),
  sleepMinutes: integer("sleep_minutes").default(450).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  computed: jsonb("computed").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Food catalogue                                                      */
/* ------------------------------------------------------------------ */

export const foodSources = pgTable("food_sources", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  url: text("url"),
  license: text("license").notNull(),
  version: text("version"),
  attribution: text("attribution"),
  ...timestamps,
});

export const foodCategories = pgTable("food_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  parentId: integer("parent_id"),
  group: text("group").notNull().default("other"),
});

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  brand: text("brand"),
  sourceId: integer("source_id").references(() => foodSources.id),
  /** Identifier in the source dataset (e.g. USDA fdc_id). */
  sourceRef: text("source_ref"),
  categoryId: integer("category_id").references(() => foodCategories.id),
  subcategory: text("subcategory"),
  cuisine: text("cuisine"),
  foodType: foodTypeEnum("food_type").default("ingredient").notNull(),
  state: foodStateEnum("state").default("not_applicable").notNull(),
  /** null = global catalogue; otherwise a private custom food. */
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id"),
  // Core nutrients per 100 g (or 100 ml for liquids when density is 1). NULL = not available in source.
  kcal: real("kcal"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fibreG: real("fibre_g"),
  sugarG: real("sugar_g"),
  satFatG: real("sat_fat_g"),
  sodiumMg: real("sodium_mg"),
  potassiumMg: real("potassium_mg"),
  calciumMg: real("calcium_mg"),
  ironMg: real("iron_mg"),
  ediblePortionPct: real("edible_portion_pct"),
  densityGPerMl: real("density_g_per_ml"),
  dataQuality: dataQualityEnum("data_quality").default("verified").notNull(),
  confidence: real("confidence").default(1).notNull(),
  /** Lower-cased name + synonyms; trigram-indexed for fuzzy search. */
  searchText: text("search_text").notNull(),
  popularity: integer("popularity").default(0).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("foods_source_ref_idx").on(t.sourceId, t.sourceRef),
  index("foods_search_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
  index("foods_owner_idx").on(t.ownerUserId),
  index("foods_category_idx").on(t.categoryId),
]);

export const foodSynonyms = pgTable("food_synonyms", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** ISO-ish language/script code: en, hi, mr, gu, ta, te, kn, ml, bn, pa */
  language: text("language").default("en").notNull(),
  kind: text("kind").default("alias").notNull(),
}, (t) => [
  uniqueIndex("food_synonyms_unique").on(t.foodId, t.name),
  index("food_synonyms_trgm_idx").using("gin", sql`lower(${t.name}) gin_trgm_ops`),
]);

/** Extended (micro)nutrients beyond the core columns. */
export const foodNutrients = pgTable("food_nutrients", {
  foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
}, (t) => [primaryKey({ columns: [t.foodId, t.code] })]);

/** Food-specific household measures: "1 cup, chopped" = 160 g, "1 medium roti" = 40 g … */
export const foodServings = pgTable("food_servings", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  unit: text("unit").notNull(),
  amount: real("amount").default(1).notNull(),
  grams: real("grams").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  source: text("source").default("dataset").notNull(),
}, (t) => [index("food_servings_food_idx").on(t.foodId)]);

export const foodImportJobs = pgTable("food_import_jobs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => foodSources.id),
  status: text("status").notNull(),
  stats: jsonb("stats").$type<Record<string, number>>().default({}).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const foodFavorites = pgTable("food_favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.foodId] })]);

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

export const recipeVariants = pgTable("recipe_variants", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  slug: text("slug"),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  cuisine: text("cuisine"),
  region: text("region"),
  description: text("description"),
  instructions: text("instructions").array().default(sql`'{}'::text[]`).notNull(),
  cookingMethod: text("cooking_method"),
  prepMinutes: integer("prep_minutes"),
  cookMinutes: integer("cook_minutes"),
  servings: real("servings").default(1).notNull(),
  servingLabel: text("serving_label").default("serving").notNull(),
  /** Measured or estimated weight after cooking; NULL = assume no net water change. */
  cookedWeightG: real("cooked_weight_g"),
  variantKey: text("variant_key").references(() => recipeVariants.key),
  variantLabel: text("variant_label"),
  style: text("style").default("home").notNull(),
  tags: text("tags").array().default(sql`'{}'::text[]`).notNull(),
  dietTags: text("diet_tags").array().default(sql`'{}'::text[]`).notNull(),
  /** Version history: edits create a new row pointing at its predecessor. */
  parentRecipeId: integer("parent_recipe_id"),
  version: integer("version").default(1).notNull(),
  isCurrent: boolean("is_current").default(true).notNull(),
  /** The logged-food record generated from this recipe (nutrition per 100 g cooked). */
  foodId: integer("food_id"),
  sourceNote: text("source_note"),
  ...timestamps,
}, (t) => [
  uniqueIndex("recipes_slug_idx").on(t.slug),
  index("recipes_owner_idx").on(t.ownerUserId),
  index("recipes_name_trgm_idx").using("gin", sql`lower(${t.name}) gin_trgm_ops`),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  foodId: integer("food_id").references(() => foods.id),
  name: text("name").notNull(),
  quantityG: real("quantity_g").notNull(),
  displayQuantity: real("display_quantity"),
  displayUnit: text("display_unit"),
  /** "fat" | "sugar" | "water" | "spice" | "main" — drives hidden-calorie analysis. */
  role: text("role").default("main").notNull(),
  isEstimated: boolean("is_estimated").default(false).notNull(),
  note: text("note"),
  sort: integer("sort").default(0).notNull(),
}, (t) => [index("recipe_ingredients_recipe_idx").on(t.recipeId)]);

export const recipeFavorites = pgTable("recipe_favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.recipeId] })]);

/* ------------------------------------------------------------------ */
/* Diary                                                               */
/* ------------------------------------------------------------------ */

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  name: text("name").default("").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("meals_unique").on(t.userId, t.date, t.mealType, t.name)]);

export const mealEntries = pgTable("meal_entries", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  grams: real("grams").notNull(),
  // Snapshot of computed nutrition (so history is stable if the catalogue is corrected later).
  kcal: real("kcal").notNull(),
  proteinG: real("protein_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fatG: real("fat_g").notNull(),
  fibreG: real("fibre_g"),
  sugarG: real("sugar_g"),
  satFatG: real("sat_fat_g"),
  sodiumMg: real("sodium_mg"),
  potassiumMg: real("potassium_mg"),
  calciumMg: real("calcium_mg"),
  ironMg: real("iron_mg"),
  /** kcal from added oils/ghee/butter/sugar (recipes) — for the hidden-calorie tracker. */
  addedFatKcal: real("added_fat_kcal"),
  addedSugarKcal: real("added_sugar_kcal"),
  dataQuality: dataQualityEnum("data_quality").default("verified").notNull(),
  confidence: real("confidence").default(1).notNull(),
  source: recordSourceEnum("source").default("manual").notNull(),
  scanId: integer("scan_id"),
  /** Client-generated id for idempotent offline sync. */
  clientId: text("client_id"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, (t) => [
  index("meal_entries_meal_idx").on(t.mealId),
  index("meal_entries_user_idx").on(t.userId, t.loggedAt),
  uniqueIndex("meal_entries_client_idx").on(t.userId, t.clientId),
]);

/* ------------------------------------------------------------------ */
/* Scans, packaged products, restaurants                               */
/* ------------------------------------------------------------------ */

export const foodScans = pgTable("food_scans", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // meal | label | barcode
  mode: text("mode").default("quick").notNull(),
  imageKeys: text("image_keys").array().default(sql`'{}'::text[]`).notNull(),
  status: text("status").default("pending").notNull(),
  model: text("model"),
  context: jsonb("context").$type<Record<string, unknown>>().default({}).notNull(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  error: text("error"),
  ...timestamps,
}, (t) => [index("food_scans_user_idx").on(t.userId, t.createdAt)]);

export const foodScanItems = pgTable("food_scan_items", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => foodScans.id, { onDelete: "cascade" }),
  detectedName: text("detected_name").notNull(),
  matchedFoodId: integer("matched_food_id").references(() => foods.id, { onDelete: "set null" }),
  estimatedGrams: real("estimated_grams").notNull(),
  gramsLow: real("grams_low"),
  gramsHigh: real("grams_high"),
  recognitionConfidence: real("recognition_confidence").notNull(),
  quantityConfidence: real("quantity_confidence").notNull(),
  nutritionConfidence: real("nutrition_confidence").notNull(),
  notes: text("notes"),
});

export const packagedProducts = pgTable("packaged_products", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand"),
  servingSizeG: real("serving_size_g"),
  servingLabel: text("serving_label"),
  isLiquid: boolean("is_liquid").default(false).notNull(),
  ingredientsText: text("ingredients_text"),
  allergens: text("allergens").array().default(sql`'{}'::text[]`).notNull(),
  /** openfoodfacts | ocr | manual | manufacturer */
  source: text("source").notNull(),
  verification: text("verification").notNull(), // verified_label | crowdsourced | ocr_estimate | user_confirmed
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  /** Private products (OCR'd by a user) are only visible to their creator until verified. */
  isPrivate: boolean("is_private").default(true).notNull(),
  imageKey: text("image_key"),
  ...timestamps,
});

export const productBarcodes = pgTable("product_barcodes", {
  barcode: text("barcode").notNull(),
  productId: integer("product_id").notNull().references(() => packagedProducts.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.barcode, t.productId] })]);

export const nutritionLabels = pgTable("nutrition_labels", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => packagedProducts.id, { onDelete: "cascade" }),
  scanId: integer("scan_id").references(() => foodScans.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  basis: text("basis").notNull(), // per_100g | per_100ml | per_serving
  values: jsonb("values").$type<Record<string, number | null>>().notNull(),
  addedSugarG: real("added_sugar_g"),
  transFatG: real("trans_fat_g"),
  ocrConfidence: real("ocr_confidence"),
  userConfirmed: boolean("user_confirmed").default(false).notNull(),
  ...timestamps,
});

export const restaurantFoods = pgTable("restaurant_foods", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").references(() => foods.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  dishName: text("dish_name").notNull(),
  restaurantName: text("restaurant_name"),
  style: text("style").notNull(), // restaurant | street | fast_food | cafeteria | delivery
  portionLabel: text("portion_label").notNull(),
  portionGLow: real("portion_g_low").notNull(),
  portionGTypical: real("portion_g_typical").notNull(),
  portionGHigh: real("portion_g_high").notNull(),
  verified: boolean("verified").default(false).notNull(),
  source: text("source").notNull(),
  addOns: jsonb("add_ons").$type<{ name: string; foodRef: string; grams: number }[]>().default([]).notNull(),
});

/* ------------------------------------------------------------------ */
/* Activity & workouts                                                 */
/* ------------------------------------------------------------------ */

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  heading: text("heading"),
  met: real("met").notNull(),
  intensity: intensityEnum("intensity").notNull(),
  source: text("source").notNull(),
  isProxy: boolean("is_proxy").default(false).notNull(),
  proxyOfCode: text("proxy_of_code"),
  note: text("note"),
  supportsDistance: boolean("supports_distance").default(false).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  searchText: text("search_text").notNull(),
}, (t) => [
  uniqueIndex("activity_types_code_idx").on(t.code, t.ownerUserId),
  index("activity_types_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
]);

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityTypeId: integer("activity_type_id").references(() => activityTypes.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  date: date("date").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  durationMin: real("duration_min").notNull(),
  distanceKm: real("distance_km"),
  speedKmh: real("speed_kmh"),
  avgHeartRate: integer("avg_heart_rate"),
  steps: integer("steps"),
  weightKgUsed: real("weight_kg_used").notNull(),
  metUsed: real("met_used").notNull(),
  grossKcal: real("gross_kcal").notNull(),
  netKcal: real("net_kcal").notNull(),
  /** Device-reported energy (imports). Shown, never summed with our estimate. */
  deviceKcal: real("device_kcal"),
  source: recordSourceEnum("source").default("manual").notNull(),
  isEstimate: boolean("is_estimate").default(true).notNull(),
  workoutId: integer("workout_id"),
  importedRecordId: integer("imported_record_id"),
  clientId: text("client_id"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  index("activity_logs_user_date_idx").on(t.userId, t.date),
  uniqueIndex("activity_logs_client_idx").on(t.userId, t.clientId),
]);

/** Daily step totals (manual or imported); kept separate from activities to avoid double counting. */
export const stepLogs = pgTable("step_logs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  steps: integer("steps").notNull(),
  distanceKm: real("distance_km"),
  activeMinutes: integer("active_minutes"),
  source: recordSourceEnum("source").default("manual").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.date] })]);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  primaryMuscle: text("primary_muscle").notNull(),
  secondaryMuscles: text("secondary_muscles").array().default(sql`'{}'::text[]`).notNull(),
  equipment: text("equipment").array().default(sql`'{}'::text[]`).notNull(),
  difficulty: experienceEnum("difficulty").notNull(),
  mechanics: text("mechanics").notNull(), // compound | isolation
  location: trainingLocationEnum("location").notNull(),
  instructions: text("instructions").array().notNull(),
  commonMistakes: text("common_mistakes").array().notNull(),
  alternatives: text("alternatives").array().default(sql`'{}'::text[]`).notNull(),
  defaultSets: smallint("default_sets").notNull(),
  defaultReps: text("default_reps").notNull(),
  defaultRestSec: smallint("default_rest_sec").notNull(),
  met: real("met").notNull(),
  /** Compendium code backing the MET value. */
  metCode: text("met_code"),
});

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateKey: text("template_key").notNull(),
  name: text("name").notNull(),
  days: jsonb("days").$type<{ day: string; focus: string; exercises: { slug: string; sets: number; reps: string; restSec: number }[] }[]>().notNull(),
  schedule: smallint("schedule").array().notNull(), // weekdays 0-6 mapped to plan day index order
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id").references(() => workoutPlans.id, { onDelete: "set null" }),
  planDay: text("plan_day"),
  name: text("name").notNull(),
  date: date("date").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMin: real("duration_min"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [index("workouts_user_date_idx").on(t.userId, t.date)]);

export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  sort: integer("sort").default(0).notNull(),
  notes: text("notes"),
}, (t) => [index("workout_exercises_workout_idx").on(t.workoutId)]);

export const exerciseSets = pgTable("exercise_sets", {
  id: serial("id").primaryKey(),
  workoutExerciseId: integer("workout_exercise_id").notNull().references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber: smallint("set_number").notNull(),
  reps: smallint("reps"),
  weightKg: real("weight_kg"),
  durationSec: integer("duration_sec"),
  rpe: real("rpe"),
  isWarmup: boolean("is_warmup").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // e1rm | max_weight | max_reps | longest_run_km
  value: real("value").notNull(),
  detail: text("detail"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
  setId: integer("set_id"),
}, (t) => [index("personal_records_user_idx").on(t.userId, t.exerciseId, t.kind)]);

/* ------------------------------------------------------------------ */
/* Goals & body transformation                                         */
/* ------------------------------------------------------------------ */

export const fitnessGoals = pgTable("fitness_goals", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: goalTypeEnum("type").notNull(),
  status: text("status").default("active").notNull(), // active | completed | archived
  startDate: date("start_date").notNull(),
  startWeightKg: real("start_weight_kg"),
  targetWeightKg: real("target_weight_kg"),
  startWaistCm: real("start_waist_cm"),
  targetWaistCm: real("target_waist_cm"),
  plan: jsonb("plan").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
}, (t) => [index("fitness_goals_user_idx").on(t.userId, t.status)]);

export const goalMilestones = pgTable("goal_milestones", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => fitnessGoals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  metric: text("metric").notNull(), // weight_kg | waist_cm | streak_days | workouts
  targetValue: real("target_value").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  sort: integer("sort").default(0).notNull(),
});

export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  weightKg: real("weight_kg").notNull(),
  source: recordSourceEnum("source").default("manual").notNull(),
  notes: text("notes"),
  ...timestamps,
}, (t) => [uniqueIndex("weight_logs_user_date_idx").on(t.userId, t.date)]);

export const bodyMeasurements = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  waistCm: real("waist_cm"),
  chestCm: real("chest_cm"),
  hipsCm: real("hips_cm"),
  armCm: real("arm_cm"),
  thighCm: real("thigh_cm"),
  neckCm: real("neck_cm"),
  /** Only user-entered/measured (e.g. DEXA, calipers) — never inferred from photos. */
  bodyFatPct: real("body_fat_pct"),
  bodyFatMethod: text("body_fat_method"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [uniqueIndex("body_measurements_user_date_idx").on(t.userId, t.date)]);

export const progressPhotos = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  pose: poseEnum("pose").notNull(),
  imageKey: text("image_key").notNull(),
  weightKg: real("weight_kg"),
  waistCm: real("waist_cm"),
  notes: text("notes"),
  visibility: text("visibility").default("private").notNull(),
  ...timestamps,
}, (t) => [index("progress_photos_user_idx").on(t.userId, t.date)]);

export const transformationMilestones = pgTable("transformation_milestones", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  value: real("value"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("transformation_milestones_kind_idx").on(t.userId, t.kind)]);

/* ------------------------------------------------------------------ */
/* Wellness                                                            */
/* ------------------------------------------------------------------ */

export const hydrationLogs = pgTable("hydration_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  ml: integer("ml").notNull(),
  clientId: text("client_id"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("hydration_logs_user_date_idx").on(t.userId, t.date),
  uniqueIndex("hydration_logs_client_idx").on(t.userId, t.clientId),
]);

export const sleepLogs = pgTable("sleep_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Date of waking up. */
  date: date("date").notNull(),
  bedtime: timestamp("bedtime", { withTimezone: true }),
  wakeTime: timestamp("wake_time", { withTimezone: true }),
  durationMin: integer("duration_min").notNull(),
  quality: smallint("quality"),
  source: recordSourceEnum("source").default("manual").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("sleep_logs_user_date_idx").on(t.userId, t.date, t.source)]);

export const supplementLogs = pgTable("supplement_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  name: text("name").notNull(),
  dose: real("dose").notNull(),
  unit: text("unit").notNull(),
  kcal: real("kcal"),
  proteinG: real("protein_g"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [index("supplement_logs_user_idx").on(t.userId, t.date)]);

export const fastingLogs = pgTable("fasting_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  targetHours: real("target_hours").notNull(),
  ...timestamps,
}, (t) => [index("fasting_logs_user_idx").on(t.userId, t.startedAt)]);

/** Cached per-day aggregates, recomputed whenever a contributing record changes. */
export const dailySummaries = pgTable("daily_summaries", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kcalIn: real("kcal_in").default(0).notNull(),
  proteinG: real("protein_g").default(0).notNull(),
  carbsG: real("carbs_g").default(0).notNull(),
  fatG: real("fat_g").default(0).notNull(),
  fibreG: real("fibre_g").default(0).notNull(),
  sugarG: real("sugar_g").default(0).notNull(),
  sodiumMg: real("sodium_mg").default(0).notNull(),
  entriesCount: integer("entries_count").default(0).notNull(),
  exerciseNetKcal: real("exercise_net_kcal").default(0).notNull(),
  exerciseMinutes: real("exercise_minutes").default(0).notNull(),
  steps: integer("steps").default(0).notNull(),
  distanceKm: real("distance_km").default(0).notNull(),
  waterMl: integer("water_ml").default(0).notNull(),
  sleepMin: integer("sleep_min").default(0).notNull(),
  baselineKcal: real("baseline_kcal").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.date] })]);

/* ------------------------------------------------------------------ */
/* Integrations / imports                                              */
/* ------------------------------------------------------------------ */

export const fitnessIntegrations = pgTable("fitness_integrations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // google_fit_takeout | health_connect_export | csv
  status: text("status").notNull(),
  lastImportAt: timestamp("last_import_at", { withTimezone: true }),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
}, (t) => [uniqueIndex("fitness_integrations_provider_idx").on(t.userId, t.provider)]);

export const activityImportJobs = pgTable("activity_import_jobs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  filename: text("filename").notNull(),
  status: text("status").notNull(), // previewed | committed | failed
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  stats: jsonb("stats").$type<Record<string, number>>().default({}).notNull(),
  errors: jsonb("errors").$type<string[]>().default([]).notNull(),
  ...timestamps,
});

export const importedActivityRecords = pgTable("imported_activity_records", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => activityImportJobs.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  recordType: text("record_type").notNull(), // steps | distance | session | heart_rate | sleep | calories | active_minutes
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  value: doublePrecision("value"),
  unit: text("unit"),
  activityName: text("activity_name"),
  dedupeKey: text("dedupe_key").notNull(),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("imported_records_dedupe_idx").on(t.userId, t.dedupeKey)]);

/* ------------------------------------------------------------------ */
/* AI coach                                                            */
/* ------------------------------------------------------------------ */

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ...timestamps,
}, (t) => [index("ai_conversations_user_idx").on(t.userId, t.updatedAt)]);

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  /** Tools the coach called to ground the answer (shown to the user as "data used"). */
  toolCalls: jsonb("tool_calls").$type<{ name: string; input: unknown }[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("ai_messages_conv_idx").on(t.conversationId, t.createdAt)]);

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  days: smallint("days").notNull(),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull(),
  plan: jsonb("plan").$type<unknown>().notNull(),
  ...timestamps,
});

export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  ...timestamps,
});

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => groceryLists.id, { onDelete: "cascade" }),
  foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantityG: real("quantity_g"),
  display: text("display"),
  estimatedPriceInr: real("estimated_price_inr"),
  checked: boolean("checked").default(false).notNull(),
});

export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quantityG: real("quantity_g"),
  expiresOn: date("expires_on"),
  ...timestamps,
}, (t) => [index("pantry_items_user_idx").on(t.userId)]);

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // water | meal | weigh_in | measurement | workout | sleep
  timeOfDay: text("time_of_day").notNull(), // HH:MM local
  weekdays: smallint("weekdays").array().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  ...timestamps,
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const weeklyReports = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("weekly_reports_user_week_idx").on(t.userId, t.weekStart)]);

/** Fixed-window rate limiting shared across serverless instances. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

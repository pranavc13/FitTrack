CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."data_quality" AS ENUM('verified', 'calculated', 'estimated', 'ocr', 'user', 'crowdsourced');--> statement-breakpoint
CREATE TYPE "public"."diet_preference" AS ENUM('vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'pescatarian', 'jain');--> statement-breakpoint
CREATE TYPE "public"."training_experience" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."food_state" AS ENUM('raw', 'cooked', 'prepared', 'packaged', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('ingredient', 'dish', 'beverage', 'packaged', 'restaurant', 'supplement', 'custom');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('weight_loss', 'fat_loss', 'belly_fat_reduction', 'muscle_gain', 'recomposition', 'visible_abs', 'strength', 'endurance', 'general_fitness', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."intensity" AS ENUM('light', 'moderate', 'vigorous');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'pre_workout', 'post_workout', 'custom');--> statement-breakpoint
CREATE TYPE "public"."photo_pose" AS ENUM('front', 'side', 'back', 'other');--> statement-breakpoint
CREATE TYPE "public"."record_source" AS ENUM('manual', 'workout', 'import', 'scan', 'recipe', 'label', 'restaurant', 'plan', 'offline');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."training_location" AS ENUM('gym', 'home', 'both');--> statement-breakpoint
CREATE TABLE "activity_import_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"filename" text NOT NULL,
	"status" text NOT NULL,
	"date_from" date,
	"date_to" date,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type_id" integer,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp with time zone,
	"duration_min" real NOT NULL,
	"distance_km" real,
	"speed_kmh" real,
	"avg_heart_rate" integer,
	"steps" integer,
	"weight_kg_used" real NOT NULL,
	"met_used" real NOT NULL,
	"gross_kcal" real NOT NULL,
	"net_kcal" real NOT NULL,
	"device_kcal" real,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"is_estimate" boolean DEFAULT true NOT NULL,
	"workout_id" integer,
	"imported_record_id" integer,
	"client_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"heading" text,
	"met" real NOT NULL,
	"intensity" "intensity" NOT NULL,
	"source" text NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"proxy_of_code" text,
	"note" text,
	"supports_distance" boolean DEFAULT false NOT NULL,
	"owner_user_id" uuid,
	"search_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"waist_cm" real,
	"chest_cm" real,
	"hips_cm" real,
	"arm_cm" real,
	"thigh_cm" real,
	"neck_cm" real,
	"body_fat_pct" real,
	"body_fat_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kcal_in" real DEFAULT 0 NOT NULL,
	"protein_g" real DEFAULT 0 NOT NULL,
	"carbs_g" real DEFAULT 0 NOT NULL,
	"fat_g" real DEFAULT 0 NOT NULL,
	"fibre_g" real DEFAULT 0 NOT NULL,
	"sugar_g" real DEFAULT 0 NOT NULL,
	"sodium_mg" real DEFAULT 0 NOT NULL,
	"entries_count" integer DEFAULT 0 NOT NULL,
	"exercise_net_kcal" real DEFAULT 0 NOT NULL,
	"exercise_minutes" real DEFAULT 0 NOT NULL,
	"steps" integer DEFAULT 0 NOT NULL,
	"distance_km" real DEFAULT 0 NOT NULL,
	"water_ml" integer DEFAULT 0 NOT NULL,
	"sleep_min" integer DEFAULT 0 NOT NULL,
	"baseline_kcal" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_summaries_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "exercise_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_exercise_id" integer NOT NULL,
	"set_number" smallint NOT NULL,
	"reps" smallint,
	"weight_kg" real,
	"duration_sec" integer,
	"rpe" real,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"primary_muscle" text NOT NULL,
	"secondary_muscles" text[] DEFAULT '{}'::text[] NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulty" "training_experience" NOT NULL,
	"mechanics" text NOT NULL,
	"location" "training_location" NOT NULL,
	"instructions" text[] NOT NULL,
	"common_mistakes" text[] NOT NULL,
	"alternatives" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_sets" smallint NOT NULL,
	"default_reps" text NOT NULL,
	"default_rest_sec" smallint NOT NULL,
	"met" real NOT NULL,
	"met_code" text,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fasting_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"target_hours" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fitness_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "goal_type" NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"start_weight_kg" real,
	"target_weight_kg" real,
	"start_waist_cm" real,
	"target_waist_cm" real,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fitness_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"last_import_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"group" text DEFAULT 'other' NOT NULL,
	CONSTRAINT "food_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "food_favorites" (
	"user_id" uuid NOT NULL,
	"food_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_favorites_user_id_food_id_pk" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "food_import_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"status" text NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "food_nutrients" (
	"food_id" integer NOT NULL,
	"code" text NOT NULL,
	"amount" real NOT NULL,
	"unit" text NOT NULL,
	CONSTRAINT "food_nutrients_food_id_code_pk" PRIMARY KEY("food_id","code")
);
--> statement-breakpoint
CREATE TABLE "food_scan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"detected_name" text NOT NULL,
	"matched_food_id" integer,
	"estimated_grams" real NOT NULL,
	"grams_low" real,
	"grams_high" real,
	"recognition_confidence" real NOT NULL,
	"quantity_confidence" real NOT NULL,
	"nutrition_confidence" real NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "food_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"mode" text DEFAULT 'quick' NOT NULL,
	"image_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"model" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_servings" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer NOT NULL,
	"label" text NOT NULL,
	"unit" text NOT NULL,
	"amount" real DEFAULT 1 NOT NULL,
	"grams" real NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'dataset' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"license" text NOT NULL,
	"version" text,
	"attribution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "food_synonyms" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer NOT NULL,
	"name" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"kind" text DEFAULT 'alias' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_hi" text,
	"brand" text,
	"source_id" integer,
	"source_ref" text,
	"category_id" integer,
	"subcategory" text,
	"cuisine" text,
	"food_type" "food_type" DEFAULT 'ingredient' NOT NULL,
	"state" "food_state" DEFAULT 'not_applicable' NOT NULL,
	"owner_user_id" uuid,
	"recipe_id" integer,
	"kcal" real,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"fibre_g" real,
	"sugar_g" real,
	"sat_fat_g" real,
	"sodium_mg" real,
	"potassium_mg" real,
	"calcium_mg" real,
	"iron_mg" real,
	"edible_portion_pct" real,
	"density_g_per_ml" real,
	"data_quality" "data_quality" DEFAULT 'verified' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"search_text" text NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"title" text NOT NULL,
	"metric" text NOT NULL,
	"target_value" real NOT NULL,
	"achieved_at" timestamp with time zone,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity_g" real,
	"display" text,
	"estimated_price_inr" real,
	"checked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"meal_plan_id" integer,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hydration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ml" integer NOT NULL,
	"client_id" text,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_activity_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" integer,
	"provider" text NOT NULL,
	"record_type" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"value" double precision,
	"unit" text,
	"activity_name" text,
	"dedupe_key" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"food_id" integer,
	"recipe_id" integer,
	"name" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"grams" real NOT NULL,
	"kcal" real NOT NULL,
	"protein_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"fibre_g" real,
	"sugar_g" real,
	"sat_fat_g" real,
	"sodium_mg" real,
	"potassium_mg" real,
	"calcium_mg" real,
	"iron_mg" real,
	"added_fat_kcal" real,
	"added_sugar_kcal" real,
	"data_quality" "data_quality" DEFAULT 'verified' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"scan_id" integer,
	"client_id" text,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"days" smallint NOT NULL,
	"preferences" jsonb NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"scan_id" integer,
	"user_id" uuid,
	"basis" text NOT NULL,
	"values" jsonb NOT NULL,
	"added_sugar_g" real,
	"trans_fat_g" real,
	"ocr_confidence" real,
	"user_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_targets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" integer NOT NULL,
	"carbs_g" integer NOT NULL,
	"fat_g" integer NOT NULL,
	"fibre_g" integer NOT NULL,
	"water_ml" integer NOT NULL,
	"sleep_minutes" integer DEFAULT 450 NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"computed" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packaged_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"serving_size_g" real,
	"serving_label" text,
	"is_liquid" boolean DEFAULT false NOT NULL,
	"ingredients_text" text,
	"allergens" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text NOT NULL,
	"verification" text NOT NULL,
	"created_by_user_id" uuid,
	"is_private" boolean DEFAULT true NOT NULL,
	"image_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"quantity_g" real,
	"expires_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" integer,
	"kind" text NOT NULL,
	"value" real NOT NULL,
	"detail" text,
	"achieved_at" timestamp with time zone NOT NULL,
	"set_id" integer
);
--> statement-breakpoint
CREATE TABLE "product_barcodes" (
	"barcode" text NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "product_barcodes_barcode_product_id_pk" PRIMARY KEY("barcode","product_id")
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"pose" "photo_pose" NOT NULL,
	"image_key" text NOT NULL,
	"weight_kg" real,
	"waist_cm" real,
	"notes" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_favorites" (
	"user_id" uuid NOT NULL,
	"recipe_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_favorites_user_id_recipe_id_pk" PRIMARY KEY("user_id","recipe_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"quantity_g" real NOT NULL,
	"display_quantity" real,
	"display_unit" text,
	"role" text DEFAULT 'main' NOT NULL,
	"is_estimated" boolean DEFAULT false NOT NULL,
	"note" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_variants" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"name_hi" text,
	"cuisine" text,
	"region" text,
	"description" text,
	"instructions" text[] DEFAULT '{}'::text[] NOT NULL,
	"cooking_method" text,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"servings" real DEFAULT 1 NOT NULL,
	"serving_label" text DEFAULT 'serving' NOT NULL,
	"cooked_weight_g" real,
	"variant_key" text,
	"variant_label" text,
	"style" text DEFAULT 'home' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"diet_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"parent_recipe_id" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"food_id" integer,
	"source_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"time_of_day" text NOT NULL,
	"weekdays" smallint[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer,
	"recipe_id" integer,
	"dish_name" text NOT NULL,
	"restaurant_name" text,
	"style" text NOT NULL,
	"portion_label" text NOT NULL,
	"portion_g_low" real NOT NULL,
	"portion_g_typical" real NOT NULL,
	"portion_g_high" real NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"bedtime" timestamp with time zone,
	"wake_time" timestamp with time zone,
	"duration_min" integer NOT NULL,
	"quality" smallint,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_logs" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"steps" integer NOT NULL,
	"distance_km" real,
	"active_minutes" integer,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "step_logs_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "supplement_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"dose" real NOT NULL,
	"unit" text NOT NULL,
	"kcal" real,
	"protein_g" real,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transformation_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"value" real,
	"achieved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"units" text DEFAULT 'metric' NOT NULL,
	"water_glass_ml" integer DEFAULT 250 NOT NULL,
	"step_goal" integer DEFAULT 8000 NOT NULL,
	"weekly_measurement_day" smallint DEFAULT 0 NOT NULL,
	"food_budget_weekly_inr" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"date_of_birth" date,
	"sex" "sex" DEFAULT 'unspecified' NOT NULL,
	"height_cm" real,
	"current_weight_kg" real,
	"target_weight_kg" real,
	"activity_level" "activity_level" DEFAULT 'light' NOT NULL,
	"training_experience" "training_experience" DEFAULT 'beginner' NOT NULL,
	"training_location" "training_location" DEFAULT 'both' NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"sleep_hours" real,
	"lifestyle" text,
	"diet_preference" "diet_preference" DEFAULT 'vegetarian' NOT NULL,
	"allergies" text[] DEFAULT '{}'::text[] NOT NULL,
	"intolerances" text[] DEFAULT '{}'::text[] NOT NULL,
	"primary_goal" "goal_type" DEFAULT 'general_fitness' NOT NULL,
	"objectives" text[] DEFAULT '{}'::text[] NOT NULL,
	"workout_days_per_week" smallint DEFAULT 3 NOT NULL,
	"workout_minutes" smallint DEFAULT 45 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real NOT NULL,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"name" text NOT NULL,
	"days" jsonb NOT NULL,
	"schedule" smallint[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" integer,
	"plan_day" text,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_min" real,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_import_jobs" ADD CONSTRAINT "activity_import_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_workout_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fasting_logs" ADD CONSTRAINT "fasting_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_goals" ADD CONSTRAINT "fitness_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_integrations" ADD CONSTRAINT "fitness_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_favorites" ADD CONSTRAINT "food_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_favorites" ADD CONSTRAINT "food_favorites_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_import_jobs" ADD CONSTRAINT "food_import_jobs_source_id_food_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."food_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_scan_items" ADD CONSTRAINT "food_scan_items_scan_id_food_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."food_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_scan_items" ADD CONSTRAINT "food_scan_items_matched_food_id_foods_id_fk" FOREIGN KEY ("matched_food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_scans" ADD CONSTRAINT "food_scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_servings" ADD CONSTRAINT "food_servings_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_synonyms" ADD CONSTRAINT "food_synonyms_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_source_id_food_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."food_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_category_id_food_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."food_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fitness_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."fitness_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_list_id_grocery_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."grocery_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_logs" ADD CONSTRAINT "hydration_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_activity_records" ADD CONSTRAINT "imported_activity_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_activity_records" ADD CONSTRAINT "imported_activity_records_job_id_activity_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."activity_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_labels" ADD CONSTRAINT "nutrition_labels_product_id_packaged_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."packaged_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_labels" ADD CONSTRAINT "nutrition_labels_scan_id_food_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."food_scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_labels" ADD CONSTRAINT "nutrition_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packaged_products" ADD CONSTRAINT "packaged_products_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packaged_products" ADD CONSTRAINT "packaged_products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_packaged_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."packaged_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_variant_key_recipe_variants_key_fk" FOREIGN KEY ("variant_key") REFERENCES "public"."recipe_variants"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_foods" ADD CONSTRAINT "restaurant_foods_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_foods" ADD CONSTRAINT "restaurant_foods_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformation_milestones" ADD CONSTRAINT "transformation_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_plan_id_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_date_idx" ON "activity_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_logs_client_idx" ON "activity_logs" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_types_code_idx" ON "activity_types" USING btree ("code","owner_user_id");--> statement-breakpoint
CREATE INDEX "activity_types_trgm_idx" ON "activity_types" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ai_conversations_user_idx" ON "ai_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conv_idx" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "body_measurements_user_date_idx" ON "body_measurements" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "fasting_logs_user_idx" ON "fasting_logs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "fitness_goals_user_idx" ON "fitness_goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fitness_integrations_provider_idx" ON "fitness_integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "food_scans_user_idx" ON "food_scans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "food_servings_food_idx" ON "food_servings" USING btree ("food_id");--> statement-breakpoint
CREATE UNIQUE INDEX "food_synonyms_unique" ON "food_synonyms" USING btree ("food_id","name");--> statement-breakpoint
CREATE INDEX "food_synonyms_trgm_idx" ON "food_synonyms" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_ref_idx" ON "foods" USING btree ("source_id","source_ref");--> statement-breakpoint
CREATE INDEX "foods_search_trgm_idx" ON "foods" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "foods_owner_idx" ON "foods" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "foods_category_idx" ON "foods" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "hydration_logs_user_date_idx" ON "hydration_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "hydration_logs_client_idx" ON "hydration_logs" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "imported_records_dedupe_idx" ON "imported_activity_records" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "meal_entries_meal_idx" ON "meal_entries" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_entries_user_idx" ON "meal_entries" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_entries_client_idx" ON "meal_entries" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meals_unique" ON "meals" USING btree ("user_id","date","meal_type","name");--> statement-breakpoint
CREATE INDEX "pantry_items_user_idx" ON "pantry_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personal_records_user_idx" ON "personal_records" USING btree ("user_id","exercise_id","kind");--> statement-breakpoint
CREATE INDEX "progress_photos_user_idx" ON "progress_photos" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_slug_idx" ON "recipes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "recipes_owner_idx" ON "recipes" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "recipes_name_trgm_idx" ON "recipes" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sleep_logs_user_date_idx" ON "sleep_logs" USING btree ("user_id","date","source");--> statement-breakpoint
CREATE INDEX "supplement_logs_user_idx" ON "supplement_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "transformation_milestones_kind_idx" ON "transformation_milestones" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reports_user_week_idx" ON "weekly_reports" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_logs_user_date_idx" ON "weight_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workouts_user_date_idx" ON "workouts" USING btree ("user_id","date");
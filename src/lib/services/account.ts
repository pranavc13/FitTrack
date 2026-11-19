import { eq, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { deleteAllForUser } from "@/lib/storage";

/** Tables holding user-owned rows, exported as JSON (GDPR/DPDP-style data portability). */
const USER_TABLES = [
  "user_profiles", "user_preferences", "nutrition_targets", "meals", "meal_entries", "activity_logs", "step_logs",
  "workouts", "workout_plans", "personal_records", "fitness_goals", "weight_logs", "body_measurements", "progress_photos",
  "transformation_milestones", "hydration_logs", "sleep_logs", "supplement_logs", "fasting_logs", "daily_summaries",
  "fitness_integrations", "activity_import_jobs", "ai_conversations", "meal_plans", "grocery_lists", "pantry_items",
  "reminders", "weekly_reports", "food_favorites", "recipe_favorites",
] as const;

export async function exportAllData(db: Db, userId: string) {
  const [user] = await db.select({ id: s.users.id, email: s.users.email, name: s.users.name, createdAt: s.users.createdAt }).from(s.users).where(eq(s.users.id, userId));
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), user };
  for (const t of USER_TABLES) out[t] = rowsOf(await db.execute(sql`SELECT * FROM ${sql.identifier(t)} WHERE user_id = ${userId}`));
  out.custom_foods = await db.select().from(s.foods).where(eq(s.foods.ownerUserId, userId));
  out.custom_recipes = await db.select().from(s.recipes).where(eq(s.recipes.ownerUserId, userId));
  out.ai_messages = rowsOf(await db.execute(sql`SELECT m.* FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id WHERE c.user_id = ${userId}`));
  out.workout_sets = rowsOf(
    await db.execute(sql`SELECT we.workout_id, e.name AS exercise, es.* FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id JOIN exercises e ON e.id = we.exercise_id WHERE w.user_id = ${userId}`),
  );
  return out;
}

/** Permanently deletes the account: all rows cascade from `users`; stored images are removed too. */
export async function deleteAccount(db: Db, userId: string) {
  const photos = await db.select({ key: s.progressPhotos.imageKey }).from(s.progressPhotos).where(eq(s.progressPhotos.userId, userId));
  const scans = await db.select({ keys: s.foodScans.imageKeys }).from(s.foodScans).where(eq(s.foodScans.userId, userId));
  await deleteAllForUser(userId, [...photos.map((p) => p.key), ...scans.flatMap((x) => x.keys)]);
  await db.delete(s.users).where(eq(s.users.id, userId));
}

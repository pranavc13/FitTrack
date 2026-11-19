import { z } from "zod/v4";
import { body, route, zId } from "@/lib/server/api";
import { addExerciseToWorkout, removeWorkoutExercise } from "@/lib/services/workouts";

export const POST = route<{ id: string }>(async ({ db, user, params, req }) => addExerciseToWorkout(db, user.id, zId.parse(params.id), (await body(req, z.object({ slug: z.string().max(60) }))).slug));
export const DELETE = route<{ id: string }>(async ({ db, user, params, req }) => {
  await removeWorkoutExercise(db, user.id, zId.parse(params.id), (await body(req, z.object({ workoutExerciseId: z.number().int().positive() }))).workoutExerciseId);
  return { ok: true };
});

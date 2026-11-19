import { z } from "zod/v4";
import { body, route, zId } from "@/lib/server/api";
import { deleteSet, logSet } from "@/lib/services/workouts";

export const POST = route<{ id: string }>(async ({ db, user, params, req }) =>
  logSet(
    db,
    user.id,
    zId.parse(params.id),
    await body(
      req,
      z.object({
        workoutExerciseId: z.number().int().positive(),
        reps: z.number().int().min(0).max(1000).nullable().optional(),
        weightKg: z.number().min(0).max(500).nullable().optional(),
        durationSec: z.number().int().min(0).max(36000).nullable().optional(),
        rpe: z.number().min(1).max(10).nullable().optional(),
        isWarmup: z.boolean().optional(),
      }),
    ),
  ),
);
export const DELETE = route<{ id: string }>(async ({ db, user, params, req }) => {
  await deleteSet(db, user.id, zId.parse(params.id), (await body(req, z.object({ setId: z.number().int().positive() }))).setId);
  return { ok: true };
});

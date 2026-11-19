import { z } from "zod/v4";
import { body, route, zId } from "@/lib/server/api";
import { finishWorkout } from "@/lib/services/workouts";

export const POST = route<{ id: string }>(async ({ db, user, params, req }) => finishWorkout(db, user.id, zId.parse(params.id), (await body(req, z.object({ notes: z.string().max(500).nullable().optional() }))).notes));

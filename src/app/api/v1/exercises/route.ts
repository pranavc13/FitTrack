import { z } from "zod/v4";
import { query, route } from "@/lib/server/api";
import { listExercises } from "@/lib/services/workouts";

export const GET = route(async ({ db, req }) => {
  const q = query(req, z.object({ muscle: z.string().max(30).optional(), location: z.string().max(10).optional(), equipment: z.string().max(20).optional(), q: z.string().max(60).optional() }));
  return { exercises: await listExercises(db, q) };
});

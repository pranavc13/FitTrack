import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { setSteps } from "@/lib/services/activity";

export const PUT = route(async ({ db, user, req }) => {
  const b = await body(req, z.object({ date: zDate, steps: z.number().int().min(0).max(200000), distanceKm: z.number().min(0).max(300).nullable().optional() }));
  await setSteps(db, user.id, b.date, b.steps, b.distanceKm);
  return { ok: true };
});

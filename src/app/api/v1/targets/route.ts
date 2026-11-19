import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { recalculateTargets, setCustomTargets } from "@/lib/services/profile";

/** Recalculate from profile (discarding custom targets). */
export const POST = route(async ({ db, user }) => ({ targets: await recalculateTargets(db, user.id, { force: true }), warnings: [] }));

const Custom = z.object({
  calories: z.number().int().min(800).max(6000),
  proteinG: z.number().int().min(20).max(400),
  carbsG: z.number().int().min(0).max(900),
  fatG: z.number().int().min(10).max(300),
  fibreG: z.number().int().min(5).max(100),
  waterMl: z.number().int().min(500).max(8000),
  sleepMinutes: z.number().int().min(240).max(720).optional(),
});
export const PUT = route(async ({ db, user, req }) => setCustomTargets(db, user.id, await body(req, Custom)));

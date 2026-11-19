import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { addEntry, MEAL_TYPES } from "@/lib/services/diary";

/** Logs the user-confirmed items from a meal scan (grams as corrected by the user). */
export const POST = route(async ({ db, user, req }) => {
  const b = await body(
    req,
    z.object({
      date: zDate,
      mealType: z.enum(MEAL_TYPES),
      scanId: z.number().int().positive().nullable(),
      items: z.array(z.object({ foodId: z.number().int().positive(), grams: z.number().positive().max(5000), name: z.string().max(120).optional(), confidence: z.number().min(0).max(1).optional() })).min(1).max(20),
    }),
  );
  const entries = [];
  for (const it of b.items) {
    const r = await addEntry(db, user.id, { date: b.date, mealType: b.mealType, foodId: it.foodId, quantity: it.grams, unit: "g", grams: it.grams, source: "scan", scanId: b.scanId, confidence: it.confidence ?? null, displayName: it.name ?? null });
    entries.push(r.entry);
  }
  return { entries };
});

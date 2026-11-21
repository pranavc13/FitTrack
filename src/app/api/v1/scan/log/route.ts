import { z } from "zod/v4";
import type { Db } from "@/db";
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
  // All-or-nothing, so a dropped mobile connection never leaves half a meal logged; per-item client ids make
  // a retry of the same scan idempotent instead of logging it twice.
  const entries = await db.transaction(async (tx) => {
    const out = [];
    for (const [i, it] of b.items.entries()) {
      const clientId = b.scanId ? `scan:${b.scanId}:${b.date}:${b.mealType}:${i}:${it.foodId}` : null;
      const r = await addEntry(tx as unknown as Db, user.id, { date: b.date, mealType: b.mealType, foodId: it.foodId, quantity: it.grams, unit: "g", grams: it.grams, source: "scan", scanId: b.scanId, confidence: it.confidence ?? null, displayName: it.name ?? null, clientId });
      out.push(r.entry);
    }
    return out;
  });
  return { entries };
});

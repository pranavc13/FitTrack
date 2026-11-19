import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { addEntry, MEAL_TYPES } from "@/lib/services/diary";

const Entry = z.object({
  date: zDate,
  mealType: z.enum(MEAL_TYPES),
  mealName: z.string().max(60).optional(),
  foodId: z.number().int().positive(),
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(30),
  grams: z.number().positive().max(10000).nullable().optional(),
  clientId: z.string().max(80).nullable().optional(),
  source: z.enum(["manual", "scan", "recipe", "label", "restaurant", "plan", "offline"]).optional(),
  scanId: z.number().int().positive().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  displayName: z.string().max(120).nullable().optional(),
});

export const POST = route(async ({ db, user, req }) => addEntry(db, user.id, await body(req, Entry)), { limit: 240 });

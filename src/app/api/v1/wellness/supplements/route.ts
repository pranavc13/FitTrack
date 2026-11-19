import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { logSupplement, supplementsForDay } from "@/lib/services/wellness";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ date: zDate.optional() }));
  return { supplements: await supplementsForDay(db, user.id, q.date ?? (await userToday(db, user.id)).today) };
});
export const POST = route(async ({ db, user, req }) => ({
  supplement: await logSupplement(db, user.id, await body(req, z.object({ date: zDate, name: z.string().trim().min(1).max(80), dose: z.number().positive().max(100000), unit: z.string().max(20), kcal: z.number().min(0).max(2000).nullable().optional(), proteinG: z.number().min(0).max(200).nullable().optional(), notes: z.string().max(200).nullable().optional() }))),
}));

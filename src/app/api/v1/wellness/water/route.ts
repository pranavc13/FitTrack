import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { addWater, waterForDay } from "@/lib/services/wellness";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ date: zDate.optional() }));
  return { entries: await waterForDay(db, user.id, q.date ?? (await userToday(db, user.id)).today) };
});
export const POST = route(async ({ db, user, req }) => {
  const b = await body(req, z.object({ date: zDate, ml: z.number().int().min(1).max(5000), clientId: z.string().max(80).nullable().optional() }));
  return { entry: await addWater(db, user.id, b.date, b.ml, b.clientId) };
}, { limit: 240 });

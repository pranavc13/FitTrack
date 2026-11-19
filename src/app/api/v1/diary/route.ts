import { z } from "zod/v4";
import { query, route, zDate } from "@/lib/server/api";
import { getDay } from "@/lib/services/diary";
import { getSummary } from "@/lib/services/summary";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ date: zDate.optional() }));
  const date = q.date ?? (await userToday(db, user.id)).today;
  const [day, summary] = await Promise.all([getDay(db, user.id, date), getSummary(db, user.id, date)]);
  return { ...day, summary };
});

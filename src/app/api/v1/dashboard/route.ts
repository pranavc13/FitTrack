import { z } from "zod/v4";
import { query, route, zDate } from "@/lib/server/api";
import { dashboard } from "@/lib/services/dashboard";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const ctx = await userToday(db, user.id);
  const q = query(req, z.object({ date: zDate.optional() }));
  const date = q.date ?? ctx.today;
  return dashboard(db, user.id, date, date === ctx.today ? ctx.hour : 23);
});

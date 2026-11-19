import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { logSleep, sleepHistory } from "@/lib/services/wellness";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ from: zDate.optional() }));
  return { sleep: await sleepHistory(db, user.id, q.from ?? addDays((await userToday(db, user.id)).today, -30)) };
});
export const POST = route(async ({ db, user, req }) => ({
  sleep: await logSleep(
    db,
    user.id,
    await body(req, z.object({ date: zDate, bedtime: z.iso.datetime({ offset: true }).nullable().optional(), wakeTime: z.iso.datetime({ offset: true }).nullable().optional(), durationMin: z.number().int().min(30).max(1200).nullable().optional(), quality: z.number().int().min(1).max(5).nullable().optional() })),
  ),
}));

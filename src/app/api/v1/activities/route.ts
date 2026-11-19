import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { listActivities, logActivity } from "@/lib/services/activity";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ from: zDate.optional(), to: zDate.optional() }));
  return { activities: await listActivities(db, user.id, q.from ?? addDays(today, -30), q.to ?? today) };
});

export const POST = route(async ({ db, user, req }) => ({
  activity: await logActivity(
    db,
    user.id,
    await body(
      req,
      z.object({
        activityTypeId: z.number().int().positive(),
        date: zDate,
        durationMin: z.number().positive().max(1440),
        distanceKm: z.number().positive().max(500).nullable().optional(),
        avgHeartRate: z.number().int().min(30).max(230).nullable().optional(),
        startedAt: z.iso.datetime({ offset: true }).nullable().optional(),
        notes: z.string().max(300).nullable().optional(),
        clientId: z.string().max(80).nullable().optional(),
        useSpeed: z.boolean().optional(),
      }),
    ),
  ),
}));

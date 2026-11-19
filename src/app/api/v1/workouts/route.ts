import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { startWorkout, workoutHistory } from "@/lib/services/workouts";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ from: zDate.optional() }));
  return { workouts: await workoutHistory(db, user.id, q.from ?? addDays(today, -90)) };
});

export const POST = route(async ({ db, user, req }) => startWorkout(db, user.id, await body(req, z.object({ date: zDate, name: z.string().max(80).optional(), planDay: z.string().max(40).nullable().optional() }))));

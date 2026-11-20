import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { userToday } from "@/lib/server/context";
import { deleteFitDay, fitHistory, getFitDay, saveFitDay } from "@/lib/services/fit-journal";

const GOALS = ["weight_loss", "fat_loss", "belly_fat_reduction", "muscle_gain", "recomposition", "visible_abs", "strength", "endurance", "general_fitness", "maintenance"] as const;
const n = (max: number) => z.number().min(0).max(max).nullable().optional();

/** One day of the Google Fit journal with its analysis, plus recent days. */
export const GET = route(async ({ db, user, req }) => {
  const { date } = query(req, z.object({ date: zDate.optional() }));
  const { today } = await userToday(db, user.id);
  const [day, history] = await Promise.all([getFitDay(db, user.id, date ?? today), fitHistory(db, user.id, today)]);
  return { today, ...day, history };
});

export const PUT = route(async ({ db, user, req }) => {
  const b = await body(
    req,
    z.object({
      date: zDate,
      steps: n(200_000).transform((v) => (v == null ? v : Math.round(v))),
      heartPoints: n(1000).transform((v) => (v == null ? v : Math.round(v))),
      moveMinutes: n(1440).transform((v) => (v == null ? v : Math.round(v))),
      distanceKm: n(300),
      caloriesBurned: n(15_000).transform((v) => (v == null ? v : Math.round(v))),
      avgHeartRate: z.number().min(30).max(230).nullable().optional().transform((v) => (v == null ? v : Math.round(v))),
      goal: z.enum(GOALS).nullable().optional(),
      isFullDay: z.boolean().optional(),
      notes: z.string().max(1000).nullable().optional(),
    }),
  );
  const { today } = await userToday(db, user.id);
  const day = await saveFitDay(db, user.id, b);
  return { today, ...day, history: await fitHistory(db, user.id, today) };
});

export const DELETE = route(async ({ db, user, req }) => {
  const { date } = query(req, z.object({ date: zDate }));
  await deleteFitDay(db, user.id, date);
  return { ok: true };
});

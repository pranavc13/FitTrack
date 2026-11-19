import { z } from "zod/v4";
import { ApiError, query, route, zDate } from "@/lib/server/api";
import { getRange } from "@/lib/services/summary";
import { weightHistory, measurementHistory } from "@/lib/services/body";
import { trainingCalendar } from "@/lib/services/workouts";
import { addDays, daysBetween } from "@/lib/dates";
import { userToday } from "@/lib/server/context";
import { adaptiveTdee } from "@/lib/analytics/trends";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ from: zDate.optional(), to: zDate.optional() }));
  const to = q.to ?? today;
  const from = q.from ?? addDays(to, -29);
  if (from > to || daysBetween(from, to) > 400) throw new ApiError(400, "Choose a range of up to ~13 months");
  const [days, weights, measurements, calendar] = await Promise.all([getRange(db, user.id, from, to), weightHistory(db, user.id, daysBetween(from, today) + 1), measurementHistory(db, user.id), trainingCalendar(db, user.id, from, to)]);
  const adaptive = adaptiveTdee(days.filter((d) => d.logged).map((d) => ({ date: d.date, value: d.kcalIn })), weights.map((w) => ({ date: w.date, value: w.weightKg })));
  return { from, to, days, weights: weights.filter((w) => w.date >= from && w.date <= to), measurements: measurements.filter((m) => m.date >= from && m.date <= to), calendar, adaptive };
});

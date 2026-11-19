import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { logMeasurements, measurementHistory } from "@/lib/services/body";

const cm = z.number().positive().max(300).nullable().optional();
export const GET = route(async ({ db, user }) => ({ measurements: await measurementHistory(db, user.id) }));
export const POST = route(async ({ db, user, req }) => {
  const { date, ...rest } = await body(
    req,
    z.object({ date: zDate, waistCm: cm, chestCm: cm, hipsCm: cm, armCm: cm, thighCm: cm, neckCm: cm, bodyFatPct: z.number().min(2).max(70).nullable().optional(), bodyFatMethod: z.string().max(40).nullable().optional(), notes: z.string().max(300).nullable().optional() }),
  );
  return { measurement: await logMeasurements(db, user.id, date, rest) };
});

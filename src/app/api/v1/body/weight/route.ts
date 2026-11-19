import { z } from "zod/v4";
import { body, query, route, zDate } from "@/lib/server/api";
import { logWeight, weightAnalysis, weightHistory } from "@/lib/services/body";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ days: z.coerce.number().int().min(7).max(3650).optional() }));
  const [history, analysis] = await Promise.all([weightHistory(db, user.id, q.days ?? 180), weightAnalysis(db, user.id)]);
  return { history, analysis };
});
export const POST = route(async ({ db, user, req }) => {
  const b = await body(req, z.object({ date: zDate, weightKg: z.number().min(20).max(400), notes: z.string().max(200).nullable().optional(), clientId: z.string().max(80).optional() }));
  return { weight: await logWeight(db, user.id, b.date, b.weightKg, b.notes) };
});

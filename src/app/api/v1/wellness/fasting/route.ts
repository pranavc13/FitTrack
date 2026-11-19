import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { endFast, fastingHistory, startFast } from "@/lib/services/wellness";

export const GET = route(async ({ db, user }) => ({ history: await fastingHistory(db, user.id) }));
export const POST = route(async ({ db, user, req }) => ({ fast: await startFast(db, user.id, (await body(req, z.object({ targetHours: z.number().min(10).max(24) }))).targetHours) }));
export const PATCH = route(async ({ db, user }) => ({ fast: await endFast(db, user.id) }));

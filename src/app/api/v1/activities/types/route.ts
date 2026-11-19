import { z } from "zod/v4";
import { body, query, route } from "@/lib/server/api";
import { createCustomActivity, searchActivities } from "@/lib/services/activity";
import { ACTIVITY_CATEGORIES } from "@/data/activities";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ q: z.string().max(80).optional(), category: z.string().max(40).optional() }));
  return { types: await searchActivities(db, user.id, q.q ?? "", q.category), categories: ACTIVITY_CATEGORIES };
}, { limit: 240 });

export const POST = route(async ({ db, user, req }) => ({
  type: await createCustomActivity(db, user.id, await body(req, z.object({ name: z.string().trim().min(2).max(80), met: z.number().min(1).max(25), category: z.enum(ACTIVITY_CATEGORIES) }))),
}));

import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { body, route } from "@/lib/server/api";
import { PLAN_TEMPLATES } from "@/data/workout-plans";
import { activatePlan } from "@/lib/services/goals";

export const GET = route(async ({ db, user }) => {
  const [active] = await db.select().from(s.workoutPlans).where(and(eq(s.workoutPlans.userId, user.id), eq(s.workoutPlans.isActive, true)));
  return { templates: PLAN_TEMPLATES, active: active ?? null };
});

export const POST = route(async ({ db, user, req }) => ({ plan: await activatePlan(db, user.id, (await body(req, z.object({ templateKey: z.string().max(40) }))).templateKey) }));
